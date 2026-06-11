import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.cluster      import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics       import silhouette_score, silhouette_samples, davies_bouldin_score
from sklearn.ensemble      import RandomForestClassifier

warnings.filterwarnings("ignore")

TARGET = "is_defect"

CLUSTER_COLORS = [
    "#3498db", "#e67e22", "#9b59b6", "#1abc9c",
    "#e74c3c", "#f39c12", "#2c3e50", "#27ae60",
]

CLUSTER_FEATURES_CANDIDATE = [
    # Waktu Granulasi CB1
    "cb1_waktu_lot1_ph1", "cb1_waktu_lot1_ph2",
    "cb1_waktu_lot2_ph1", "cb1_waktu_lot2_ph2",
    # Suhu Decoct CB1
    "cb1_suhu_lot1_1", "cb1_suhu_lot1_2",
    "cb1_suhu_lot2_1", "cb1_suhu_lot2_2",
    "cb1_suhu_rata",
    "cb1_suhu_std",
    # Suhu DIOSNA CB1
    "cb1_suhu_diosna_lot1_1", "cb1_suhu_diosna_lot1_2",
    "cb1_suhu_diosna_lot2_1", "cb1_suhu_diosna_lot2_2",
    # Suhu Decoct CB2 — semua lot
    "cb2_suhu_lot1_1", "cb2_suhu_lot1_2",
    "cb2_suhu_lot2_1", "cb2_suhu_lot2_2",
    "cb2_suhu_lot3_1", "cb2_suhu_lot3_2",
    "cb2_suhu_lot4_1", "cb2_suhu_lot4_2",
    "cb2_suhu_rata",
    "cb2_suhu_std",
    # Suhu DIOSNA CB2 — semua lot
    "cb2_suhu_diosna_lot1_1", "cb2_suhu_diosna_lot1_2",
    "cb2_suhu_diosna_lot2_1", "cb2_suhu_diosna_lot2_2",
    "cb2_suhu_diosna_lot3_1", "cb2_suhu_diosna_lot3_2",
    "cb2_suhu_diosna_lot4_1", "cb2_suhu_diosna_lot4_2",
    # Waktu Granulasi CB2
    "cb2_waktu_lot1_ph1", "cb2_waktu_lot2_ph1",
    "cb2_waktu_lot3_ph1", "cb2_waktu_lot4_ph1",
    # Kadar Air CB1 & CB2
    "cb1_ka1", "cb1_ka2", "cb1_rata_ka",
    "cb2_ka1", "cb2_ka2", "cb2_ka3", "cb2_ka4", "cb2_rata_ka",
    "ck1_ka_setelah_ck",
    # Yield CB1 & CK1
    "cb1_pct_yield", "cb1_yield_deviate",
    "ck1_pct_yield", "ck1_yield_deviate",
    "cb2_pct_yield",
    # Jumlah granul
    "cb1_jml_granul_kg", "cb2_jml_granul_kg",
    "cb1_jml_decoct_kg", "cb2_jml_decoct_kg",
    # Mixer & Chopper CB1
    "cb1_mixer1", "cb1_mixer2", "cb1_chopper1", "cb1_chopper2",
    # Mixer & Chopper CB2
    "cb2_mixer1", "cb2_mixer2", "cb2_mixer3", "cb2_mixer4",
    "cb2_chopper1", "cb2_chopper2", "cb2_chopper3", "cb2_chopper4",
]

PROFILE_FEATURES = {
    "Suhu CB1 Rata":   "cb1_suhu_rata",
    "Suhu CB1 Std":    "cb1_suhu_std",
    "Suhu CB2 Rata":   "cb2_suhu_rata",
    "Suhu CB2 Std":    "cb2_suhu_std",
    "Waktu CB1 L1P1":  "cb1_waktu_lot1_ph1",
    "Waktu CB1 L2P1":  "cb1_waktu_lot2_ph1",
    "Waktu CB2 L1":    "cb2_waktu_lot1_ph1",
    "Waktu CB2 L2":    "cb2_waktu_lot2_ph1",
    "KA CB1":          "cb1_rata_ka",
    "KA CB2":          "cb2_rata_ka",
    "KA CK1":          "ck1_ka_setelah_ck",
    "Yield CB1 (%)":   "cb1_pct_yield",
    "Yield CB1 Dev":   "cb1_yield_deviate",
    "Yield CK1 (%)":   "ck1_pct_yield",
    "Yield CB2 (%)":   "cb2_pct_yield",
    "Granul CB1 (kg)": "cb1_jml_granul_kg",
    "Granul CB2 (kg)": "cb2_jml_granul_kg",
}

RADAR_FEATURES = {
    "Suhu CB1":  "cb1_suhu_rata",
    "Suhu CB2":  "cb2_suhu_rata",
    "Std CB1":   "cb1_suhu_std",
    "Std CB2":   "cb2_suhu_std",
    "Waktu CB1": "cb1_waktu_lot2_ph1",
    "Waktu CB2": "cb2_waktu_lot1_ph1",
    "KA CB1":    "cb1_rata_ka",
    "KA CB2":    "cb2_rata_ka",
}

K_RANGE = range(2, 9)

# PUBLIC API
def run_clustering(
    prediction_df: pd.DataFrame,
    save_path: str = None,
    models_dir: str = "models",
) -> tuple:
    """
    Jalankan seluruh pipeline clustering dari 04_clustering.ipynb.

    Parameters
    ----------
    prediction_df : pd.DataFrame  — output dari run_modelling()
    save_path     : str, optional — path untuk menyimpan dataset_clustered.csv
    models_dir    : str           — direktori untuk menyimpan model pkl/json

    Returns
    -------
    df_output      : pd.DataFrame  — dataset + kolom Cluster & Cluster_Label
    cluster_results: dict          — metrics, profile, PCA coords, importances, objects
    """
    os.makedirs(models_dir, exist_ok=True)

    df = prediction_df.copy()

    # 1. Filter fitur yang tersedia
    cluster_features = [c for c in CLUSTER_FEATURES_CANDIDATE if c in df.columns]

    # 2. Persiapan matrix clustering
    df_clust = df[cluster_features + [TARGET]].copy()
    for col in cluster_features:
        if df_clust[col].isna().any():
            df_clust[col] = df_clust[col].fillna(df_clust[col].median())

    X_raw = df_clust[cluster_features].copy()
    y     = df_clust[TARGET].astype(int)

    # CEK MODEL TERSIMPAN
    _model_files = {
        "kmeans":   os.path.join(models_dir, "kmeans_model.pkl"),
        "scaler":   os.path.join(models_dir, "scaler_clustering.pkl"),
        "pca2":     os.path.join(models_dir, "pca_2d_model.pkl"),
        "pca3":     os.path.join(models_dir, "pca_3d_model.pkl"),
        "rf_clust": os.path.join(models_dir, "rf_cluster_importance.pkl"),
        "meta":     os.path.join(models_dir, "cluster_metadata.json"),
    }
    _all_cluster_models_exist = all(os.path.exists(p) for p in _model_files.values())

    if _all_cluster_models_exist:
        # MODE INFERENCE: load model clustering yang sudah ada
        print("[clustering] Model ditemukan → load dari disk, skip training.")
        kmeans       = joblib.load(_model_files["kmeans"])
        scaler_clust = joblib.load(_model_files["scaler"])
        pca2         = joblib.load(_model_files["pca2"])
        pca3         = joblib.load(_model_files["pca3"])
        rf_clust     = joblib.load(_model_files["rf_clust"])

        with open(_model_files["meta"]) as f:
            cluster_meta_loaded = json.load(f)

        OPTIMAL_K = cluster_meta_loaded["optimal_k"]

        # Scaling dan predict pakai model lama
        X_scaled       = scaler_clust.transform(X_raw)
        cluster_labels = kmeans.predict(X_scaled)

        sil_final = silhouette_score(X_scaled, cluster_labels)
        db_final  = davies_bouldin_score(X_scaled, cluster_labels)

        # Buat eval_df dari metadata (tidak perlu loop k lagi)
        eval_df = pd.DataFrame({
            "k":              list(range(2, 2 + len([OPTIMAL_K]))),
            "Inertia":        [kmeans.inertia_],
            "Silhouette":     [sil_final],
            "Davies-Bouldin": [db_final],
        })
        best_k_sil = OPTIMAL_K
        best_k_db  = OPTIMAL_K

    else:
        # MODE TRAINING: model belum ada, latih dari awal
        print("[clustering] Model belum ada → training dari awal dan simpan ke disk.")

        # 3. Scaling
        scaler_clust = StandardScaler()
        X_scaled     = scaler_clust.fit_transform(X_raw)

        # 4. Elbow + Silhouette + Davies-Bouldin
        inertias, silhouettes, db_scores = [], [], []

        for k in K_RANGE:
            km = KMeans(n_clusters=k, random_state=42, n_init=20, max_iter=500)
            labels = km.fit_predict(X_scaled)
            inertias.append(km.inertia_)
            silhouettes.append(silhouette_score(X_scaled, labels))
            db_scores.append(davies_bouldin_score(X_scaled, labels))

        eval_df = pd.DataFrame({
            "k":              list(K_RANGE),
            "Inertia":        inertias,
            "Silhouette":     silhouettes,
            "Davies-Bouldin": db_scores,
        })

        best_k_sil = int(eval_df.loc[eval_df["Silhouette"].idxmax(), "k"])
        best_k_db  = int(eval_df.loc[eval_df["Davies-Bouldin"].idxmin(), "k"])

        # 5. Pilih OPTIMAL_K
        OPTIMAL_K = best_k_sil

        # 6. K-Means Final
        kmeans = KMeans(
            n_clusters=OPTIMAL_K,
            random_state=42,
            n_init=50,
            max_iter=1000,
            algorithm="lloyd",
        )
        cluster_labels = kmeans.fit_predict(X_scaled)

        sil_final = silhouette_score(X_scaled, cluster_labels)
        db_final  = davies_bouldin_score(X_scaled, cluster_labels)

    # Distribusi per cluster
    df["Cluster"]       = cluster_labels
    df["Cluster_Label"] = df["Cluster"].apply(lambda x: f"Cluster {x}")

    cluster_dist = df.groupby("Cluster").agg(
        Total      = (TARGET, "count"),
        Normal     = (TARGET, lambda x: (x == 0).sum()),
        Defect     = (TARGET, lambda x: (x == 1).sum()),
        DefectRate = (TARGET, "mean"),
    ).round(3)
    cluster_dist["DefectRate_pct"] = (cluster_dist["DefectRate"] * 100).round(1)

    # 7. PCA 2D & 3D
    if not _all_cluster_models_exist:
        pca2   = PCA(n_components=2, random_state=42)
        X_pca2 = pca2.fit_transform(X_scaled)
        var2   = pca2.explained_variance_ratio_

        pca3   = PCA(n_components=3, random_state=42)
        X_pca3 = pca3.fit_transform(X_scaled)
        var3   = pca3.explained_variance_ratio_
    else:
        X_pca2 = pca2.transform(X_scaled)
        var2   = pca2.explained_variance_ratio_
        X_pca3 = pca3.transform(X_scaled)
        var3   = pca3.explained_variance_ratio_

    # Tambahkan PCA coords ke df untuk dashboard
    df["pca_x"] = X_pca2[:, 0]
    df["pca_y"] = X_pca2[:, 1]
    df["pca_z"] = X_pca3[:, 2]

    # 8. Profil Cluster
    available_profile = {k: v for k, v in PROFILE_FEATURES.items() if v in df.columns}

    profile_rows = {}
    for ci in range(OPTIMAL_K):
        mask = df["Cluster"] == ci
        row  = {
            "n":          int(mask.sum()),
            "Defect (%)": round(float(df.loc[mask, TARGET].mean() * 100), 1),
        }
        for label, col in available_profile.items():
            row[label] = round(float(df.loc[mask, col].mean()), 3)
        profile_rows[f"Cluster {ci}"] = row

    profile_df = pd.DataFrame(profile_rows).T

    # 9. Silhouette per sample (untuk dashboard silhouette plot) 
    sil_samples = silhouette_samples(X_scaled, cluster_labels)

    # 10. Feature Importance Cluster (RF → Gini)
    if not _all_cluster_models_exist:
        rf_clust = RandomForestClassifier(
            n_estimators=300,
            max_depth=10,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        rf_clust.fit(X_scaled, cluster_labels)

    imp_series = pd.Series(rf_clust.feature_importances_, index=cluster_features)
    imp_series = imp_series.sort_values(ascending=False)

    cluster_importance_df = imp_series.reset_index()
    cluster_importance_df.columns = ["feature", "importance"]

    # 11. Radar chart data (normalisasi 0-1)
    available_radar = {k: v for k, v in RADAR_FEATURES.items() if v in df.columns}
    radar_df = pd.DataFrame({
        k: df.groupby("Cluster")[v].mean()
        for k, v in available_radar.items()
    })
    radar_norm = (radar_df - radar_df.min()) / (radar_df.max() - radar_df.min() + 1e-9)

    # 12. Interpretasi risiko per cluster
    defect_rates = [
        float(profile_df.loc[f"Cluster {i}", "Defect (%)"])
        for i in range(OPTIMAL_K)
    ]

    cluster_risk = {}
    for ci in range(OPTIMAL_K):
        dr = defect_rates[ci]
        risk = "HIGH RISK" if dr > 50 else ("MEDIUM RISK" if dr > 15 else "LOW RISK")
        cluster_risk[ci] = {
            "defect_rate": dr,
            "risk_level":  risk,
            "n_batch":     int(profile_df.loc[f"Cluster {ci}", "n"]),
        }

    max_risk_cluster = int(pd.Series(defect_rates).idxmax())
    min_risk_cluster = int(pd.Series(defect_rates).idxmin())

    # 13. Simpan dataset_clustered.csv
    if save_path:
        df.to_csv(save_path, index=False)

    # 14. Simpan model & artefak — hanya jika baru di-train
    if not _all_cluster_models_exist:
        joblib.dump(kmeans,       os.path.join(models_dir, "kmeans_model.pkl"))
        joblib.dump(scaler_clust, os.path.join(models_dir, "scaler_clustering.pkl"))
        joblib.dump(pca2,         os.path.join(models_dir, "pca_2d_model.pkl"))
        joblib.dump(pca3,         os.path.join(models_dir, "pca_3d_model.pkl"))
        joblib.dump(rf_clust,     os.path.join(models_dir, "rf_cluster_importance.pkl"))

    cluster_meta = {
        "optimal_k":        OPTIMAL_K,
        "silhouette_score": float(sil_final),
        "davies_bouldin":   float(db_final),
        "inertia":          float(kmeans.inertia_),
        "best_k_sil":       best_k_sil,
        "best_k_db":        best_k_db,
        "cluster_features": cluster_features,
        "pca2_var_ratio":   var2.tolist(),
        "pca3_var_ratio":   var3.tolist(),
        "cluster_profile":  profile_df.to_dict(),
        "defect_rates":     defect_rates,
        "max_risk_cluster": max_risk_cluster,
        "min_risk_cluster": min_risk_cluster,
    }
    with open(os.path.join(models_dir, "cluster_metadata.json"), "w") as f:
        json.dump(cluster_meta, f, indent=2)

    with open(os.path.join(models_dir, "cluster_features.txt"), "w") as f:
        f.write("\n".join(cluster_features))

    # 15. Kumpulkan semua hasil
    cluster_results = {
        # Evaluasi K selection
        "eval_df":         eval_df,
        "optimal_k":       OPTIMAL_K,
        "best_k_sil":      best_k_sil,
        "best_k_db":       best_k_db,
        "silhouette_final": sil_final,
        "davies_bouldin_final": db_final,
        "inertia_final":   kmeans.inertia_,

        # Distribusi & profil cluster
        "cluster_dist":    cluster_dist,
        "profile_df":      profile_df,
        "defect_rates":    defect_rates,
        "cluster_risk":    cluster_risk,
        "max_risk_cluster": max_risk_cluster,
        "min_risk_cluster": min_risk_cluster,

        # Data untuk visualisasi dashboard
        "X_pca2":          X_pca2,          # shape (n, 2)
        "X_pca3":          X_pca3,          # shape (n, 3)
        "var2":            var2,             # explained variance ratio 2D
        "var3":            var3,             # explained variance ratio 3D
        "cluster_labels":  cluster_labels,  # array label per baris
        "sil_samples":     sil_samples,     # silhouette per sample
        "radar_norm":      radar_norm,      # normalisasi 0-1 untuk radar
        "radar_labels":    list(available_radar.keys()),

        # Feature importance
        "cluster_importance": cluster_importance_df,

        # Model objects
        "kmeans":          kmeans,
        "scaler_clust":    scaler_clust,
        "pca2":            pca2,
        "pca3":            pca3,
        "rf_clust":        rf_clust,
        "cluster_features": cluster_features,

        # Metadata
        "cluster_meta":    cluster_meta,
    }

    return df, cluster_results

# QUICK TEST
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import run_preprocessing
    from modelling     import run_modelling

    excel_file = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Rekap_Posisi_Solid_Granulasi_lt_2_26_MARET_2026.xlsx"
    )

    if not os.path.exists(excel_file):
        print(f"File tidak ditemukan: {excel_file}")
        sys.exit(1)

    print("Step 1 — Preprocessing...")
    clean_df = run_preprocessing(excel_file)
    print(f"  Shape: {clean_df.shape}")

    print("Step 2 — Modelling...")
    os.makedirs("outputs", exist_ok=True)
    pred_df, _ = run_modelling(
        clean_df,
        save_path="outputs/dataset_with_predictions.csv",
        models_dir="models",
    )
    print(f"  Shape: {pred_df.shape}")

    print("Step 3 — Clustering...")
    clustered_df, results = run_clustering(
        pred_df,
        save_path="outputs/dataset_clustered.csv",
        models_dir="models",
    )

    print("\n" + "=" * 60)
    print("RINGKASAN CLUSTERING")
    print("=" * 60)
    print(f"Output shape      : {clustered_df.shape}")
    print(f"Optimal K         : {results['optimal_k']}")
    print(f"Silhouette Score  : {results['silhouette_final']:.4f}")
    print(f"Davies-Bouldin    : {results['davies_bouldin_final']:.4f}")
    print(f"PCA 2D variance   : {sum(results['var2'])*100:.1f}%")
    print(f"PCA 3D variance   : {sum(results['var3'])*100:.1f}%")
    print()
    print("Distribusi Cluster:")
    print(results["cluster_dist"].to_string())
    print()
    print("Risk per Cluster:")
    for ci, info in results["cluster_risk"].items():
        print(
            f"  Cluster {ci} : {info['risk_level']:<12} "
            f"n={info['n_batch']:2d}  defect={info['defect_rate']:.1f}%"
        )
    print()
    print(f"Cluster paling berisiko : Cluster {results['max_risk_cluster']} "
          f"({results['defect_rates'][results['max_risk_cluster']]:.0f}% defect)")
    print(f"Cluster paling aman     : Cluster {results['min_risk_cluster']} "
          f"({results['defect_rates'][results['min_risk_cluster']]:.0f}% defect)")
    print()
    print("Top 10 Fitur Pembeda Cluster:")
    for _, r in results["cluster_importance"].head(10).iterrows():
        print(f"  {r['feature']:<40} {r['importance']:.4f}")
    print()

    # Verifikasi kolom output
    required_cols = ["Cluster", "Cluster_Label", "pca_x", "pca_y", "pca_z"]
    print("Verifikasi kolom output:")
    for c in required_cols:
        s = "✅" if c in clustered_df.columns else "❌ MISSING"
        print(f"  {s}  {c}")

    # Verifikasi model files
    model_files = [
        "kmeans_model.pkl", "scaler_clustering.pkl",
        "pca_2d_model.pkl", "pca_3d_model.pkl",
        "rf_cluster_importance.pkl", "cluster_metadata.json",
    ]
    print("\nVerifikasi model files:")
    for m in model_files:
        path = f"models/{m}"
        s = "✅" if os.path.exists(path) else "❌ MISSING"
        print(f"  {s}  {path}")

    print()
    print("Output: outputs/dataset_clustered.csv")