"""
pipeline/modelling.py
======================
Refactored dari 03_modelling.ipynb — logika IDENTIK, tidak ada perubahan algoritma.

Alur:
  1.  Validasi kolom target is_defect (0/1)
  2.  Tambah row_no jika belum ada
  3.  Rule-Based Defect Reasoning  → kolom defect_reasons
  4.  Pemilihan fitur (exclude leakage columns + exclude_keywords)
  5.  LabelEncoder untuk fitur kategorik
  6.  Fill median untuk fitur numerik
  7.  Train-Test Split (stratified, test_size=0.25, random_state=42)
  8.  StandardScaler (fit on train, transform all)
  9.  Isolation Forest  (n_estimators=300, contamination=y.mean())
  10. Random Forest     (n_estimators=500, class_weight='balanced')
  11. Gradient Boosting (n_estimators=200, lr=0.05, max_depth=3)
  12. Perbandingan performa → sorted by recall, f1_score
  13. Cross-Validation StratifiedKFold (min 2, max 5 fold)
  14. Feature Importance dari Random Forest
  15. Prediksi final seluruh dataset + consensus voting (≥2/3 model)
  16. Simpan dataset_with_predictions.csv + semua model .joblib

Input  : pd.DataFrame  (output run_preprocessing)
Output : pd.DataFrame  (=== dataset_with_predictions.csv)
         dict model_results  (metrics, feature importance, confusion matrix, model objects)

Catatan: Label final is_defect TIDAK diubah oleh model.
         Model hanya menambahkan kolom prediksi sebagai pendukung analisis.
"""

import os
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    IsolationForest,
)
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)

warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════
# KONSTANTA — diambil persis dari notebook
# ══════════════════════════════════════════════════════

RANDOM_STATE = 42
TARGET = "is_defect"

# Kolom yang diexclude dari fitur (leakage + output kolom)
EXCLUDE_COLS = [
    TARGET,
    "is_defect_lama",
    "row_no",
    "excel_row",
    "defect_reasons",
    "consensus_label",
    "consensus_defect",
    "model_consensus_label",
    "model_consensus_pred",
    "rf_status",
    "gb_status",
    "if_status",
    "IF_Pred",
    "IF_Anomaly_Score",
]

# Keyword kolom output prediksi yang tidak boleh jadi fitur
EXCLUDE_KEYWORDS = [
    "pred",
    "prediction",
    "proba",
    "probability",
    "status",
    "label",
    "consensus",
]

# Kolom KA asli yang dipakai rule-based (persis dari notebook)
KA_RULE_COLS = [
    "cb1_ka1", "cb1_ka2", "cb1_ka3", "cb1_ka4", "cb1_ka5", "cb1_ka6",
    "cb2_ka1", "cb2_ka2", "cb2_ka3", "cb2_ka4", "cb2_ka5", "cb2_ka6",
    "ka1", "ka2", "ka3", "ka4", "ka5", "ka6",
    "cb1_rata_ka", "cb2_rata_ka", "rata_ka",
]

# Kolom yield asli yang dipakai rule-based (bukan indikator deviate)
YIELD_RULE_COLS = ["cb1_pct_yield", "ck1_pct_yield", "cb2_pct_yield"]


# ══════════════════════════════════════════════════════
# RULE-BASED DEFECT REASONING
# (persis dari notebook section 4)
# ══════════════════════════════════════════════════════

def _get_value(row, col):
    """Ambil nilai kolom jika ada dan tidak NaN."""
    if col in row.index and pd.notna(row[col]):
        return row[col]
    return None


def _generate_defect_reasons(row) -> str:
    """
    Generate alasan defect berbasis rule — PERSIS dari notebook section 4.
    Hanya dipanggil jika is_defect == 1, batch normal mengembalikan '-'.
    """
    reasons = []

    # 1. Suhu Decoct Rata-rata
    suhu_rata_cols = [
        c for c in row.index
        if "suhu" in c.lower() and "rata" in c.lower()
    ]
    for col in suhu_rata_cols:
        v = _get_value(row, col)
        if v is not None and isinstance(v, (int, float, np.number)):
            if v > 75:
                reasons.append(f"{col} tinggi ({v:.2f}°C > 75°C)")

    # 2. Suhu Individual
    suhu_cols = [
        c for c in row.index
        if "suhu" in c.lower()
        and "rata" not in c.lower()
        and "std" not in c.lower()
    ]
    for col in suhu_cols:
        v = _get_value(row, col)
        if v is not None and isinstance(v, (int, float, np.number)):
            if v > 75:
                reasons.append(f"{col} tinggi ({v:.2f}°C > 75°C)")

    # 3. Kadar Air / KA (hanya kolom asli, bukan indikator)
    ka_cols = [c for c in row.index if c.lower() in KA_RULE_COLS]
    for col in ka_cols:
        v = _get_value(row, col)
        if v is not None and isinstance(v, (int, float, np.number)):
            if v > 10:
                reasons.append(f"{col} ekstrem ({v:.2f}% > 10%)")
            elif v > 5.5:
                reasons.append(f"{col} tinggi ({v:.2f}% > 5.5%)")
            elif v < 3.0:
                reasons.append(f"{col} rendah ({v:.2f}% < 3.0%)")

    # 4. Jumlah KA Ekstrem
    v = _get_value(row, "ka_ekstrem_count")
    if v is not None and isinstance(v, (int, float, np.number)):
        if v > 0:
            reasons.append(f"Terdapat {int(v)} indikator KA ekstrem")

    # 5. Yield — threshold per kolom disesuaikan dengan preprocessing.py
    # cb1: 99.0–103.1 | ck1: 99.1–102.9 | cb2: 98.0–103.1
    YIELD_THRESHOLDS = {
        "cb1_pct_yield": (99.0, 103.1),
        "ck1_pct_yield": (99.1, 102.9),
        "cb2_pct_yield": (99.1, 102.3),
    }
    for col in YIELD_RULE_COLS:
        v = _get_value(row, col)
        if v is None or not isinstance(v, (int, float, np.number)) or v == 0:
            continue
        lo, hi = YIELD_THRESHOLDS.get(col, (99.0, 103.1))
        if v < lo:
            reasons.append(f"{col} rendah ({v:.2f}% < {lo}%)")
        elif v > hi:
            reasons.append(f"{col} tinggi ({v:.2f}% > {hi}%)")

    # 6. Keterangan Proses
    ket_cols = [c for c in row.index if "keterangan" in c.lower()]
    for col in ket_cols:
        v = row[col]
        if pd.isna(v):
            reasons.append(f"{col} kosong")
        elif isinstance(v, str) and v.strip().upper() not in ("SELESAI", "DONE"):
            reasons.append(f"{col} bukan status selesai: {v}")

    # 7. Default reason
    if not reasons:
        reasons.append(
            "Tidak ada pelanggaran threshold utama, tetapi termasuk defect "
            "berdasarkan label is_defect dari dataset."
        )

    return " | ".join(reasons)


# ══════════════════════════════════════════════════════
# HELPER EVALUASI MODEL
# (persis dari notebook section 7)
# ══════════════════════════════════════════════════════

def _evaluate_model(model_name: str, y_true, y_pred, y_proba=None) -> dict:
    """Hitung semua metrik evaluasi, return dict."""
    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec  = recall_score(y_true, y_pred, zero_division=0)
    f1   = f1_score(y_true, y_pred, zero_division=0)
    cm   = confusion_matrix(y_true, y_pred).tolist()

    result = {
        "model": model_name,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "confusion_matrix": cm,
    }

    if y_proba is not None and len(np.unique(y_true)) > 1:
        result["roc_auc"]           = roc_auc_score(y_true, y_proba)
        result["average_precision"] = average_precision_score(y_true, y_proba)
    else:
        result["roc_auc"]           = np.nan
        result["average_precision"] = np.nan

    return result


# ══════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════

def run_modelling(
    clean_df: pd.DataFrame,
    save_path: str = None,
    models_dir: str = "models",
) -> tuple:
    """
    Jalankan seluruh pipeline modelling dari 03_modelling.ipynb.

    Parameters
    ----------
    clean_df   : pd.DataFrame  — output dari run_preprocessing()
    save_path  : str, optional — path untuk menyimpan dataset_with_predictions.csv
    models_dir : str           — direktori untuk menyimpan file .joblib

    Returns
    -------
    df_output     : pd.DataFrame  — dataset + semua kolom prediksi
    model_results : dict          — metrics, feature importance, model objects, comparison
    """
    os.makedirs(models_dir, exist_ok=True)

    df = clean_df.copy()

    # ── 1. Validasi target ──────────────────────────────────────────
    assert TARGET in df.columns, f"Kolom target '{TARGET}' tidak ditemukan."

    if "row_no" not in df.columns:
        df["row_no"] = np.arange(1, len(df) + 1)

    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce").astype(int)
    assert df[TARGET].isna().sum() == 0, "Ada nilai kosong pada is_defect."
    assert set(df[TARGET].unique()).issubset({0, 1}), "is_defect harus 0 atau 1."

    # ── 2. Rule-based defect reasons ───────────────────────────────
    df["defect_reasons"] = df.apply(
        lambda row: _generate_defect_reasons(row) if row[TARGET] == 1 else "-",
        axis=1,
    )

    # ── 3. Pemilihan fitur ──────────────────────────────────────────
    candidate_cols = [
        c for c in df.columns
        if c not in EXCLUDE_COLS
        and not any(kw in c.lower() for kw in EXCLUDE_KEYWORDS)
    ]

    numeric_cols = df[candidate_cols].select_dtypes(
        include=["int64", "float64", "int32", "float32"]
    ).columns.tolist()

    categorical_cols = df[candidate_cols].select_dtypes(
        include=["object", "category", "bool"]
    ).columns.tolist()

    # ── 4. Encoding + impute ────────────────────────────────────────
    df_model = df.copy()

    # ── CEK MODEL TERSIMPAN — load jika ada, train jika belum ada ──
    _model_files = {
        "rf":      os.path.join(models_dir, "random_forest_defect_model.joblib"),
        "gb":      os.path.join(models_dir, "gradient_boosting_defect_model.joblib"),
        "iso":     os.path.join(models_dir, "isolation_forest_defect_model.joblib"),
        "scaler":  os.path.join(models_dir, "scaler.joblib"),
        "le":      os.path.join(models_dir, "label_encoders.joblib"),
        "feats":   os.path.join(models_dir, "feature_columns.joblib"),
    }
    _all_models_exist = all(os.path.exists(p) for p in _model_files.values())

    if _all_models_exist:
        # ── MODE INFERENCE: load model yang sudah ada ───────────────
        print("[modelling] Model ditemukan → load dari disk, skip training.")
        rf_model       = joblib.load(_model_files["rf"])
        gb_model       = joblib.load(_model_files["gb"])
        iso_model      = joblib.load(_model_files["iso"])
        scaler         = joblib.load(_model_files["scaler"])
        label_encoders = joblib.load(_model_files["le"])
        FEATURE_COLS   = joblib.load(_model_files["feats"])

        # Encode kolom kategorikal menggunakan encoder yang sudah ada
        for col in categorical_cols:
            if col in label_encoders:
                le = label_encoders[col]
                df_model[col] = df_model[col].fillna("UNKNOWN").astype(str)
                # Tangani label baru yang belum pernah dilihat model
                known = set(le.classes_)
                df_model[col] = df_model[col].apply(
                    lambda v: v if v in known else "UNKNOWN"
                )
                # Tambahkan "UNKNOWN" ke classes jika belum ada
                if "UNKNOWN" not in known:
                    le.classes_ = np.append(le.classes_, "UNKNOWN")
                df_model[col] = le.transform(df_model[col])
            else:
                le = LabelEncoder()
                df_model[col] = df_model[col].fillna("UNKNOWN").astype(str)
                df_model[col] = le.fit_transform(df_model[col])
                label_encoders[col] = le

        for col in numeric_cols:
            df_model[col] = pd.to_numeric(df_model[col], errors="coerce")
            df_model[col] = df_model[col].fillna(df_model[col].median())

        # Pastikan kolom fitur konsisten dengan model (tambah 0 jika kurang)
        for fc in FEATURE_COLS:
            if fc not in df_model.columns:
                df_model[fc] = 0
        X = df_model[FEATURE_COLS].copy()
        y = df_model[TARGET].astype(int).copy()

        single_class = (len(y.unique()) < 2)

        X_all_scaled = scaler.transform(X)

        # Buat dummy split untuk evaluasi (tidak dipakai training)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=RANDOM_STATE,
            stratify=(y if not single_class else None),
        )
        X_train_scaled = scaler.transform(X_train)
        X_test_scaled  = scaler.transform(X_test)

    else:
        # ── MODE TRAINING: model belum ada, latih dari awal ─────────
        print("[modelling] Model belum ada → training dari awal dan simpan ke disk.")
        label_encoders = {}

        for col in categorical_cols:
            le = LabelEncoder()
            df_model[col] = df_model[col].fillna("UNKNOWN").astype(str)
            df_model[col] = le.fit_transform(df_model[col])
            label_encoders[col] = le

        for col in numeric_cols:
            df_model[col] = pd.to_numeric(df_model[col], errors="coerce")
            df_model[col] = df_model[col].fillna(df_model[col].median())

        FEATURE_COLS = numeric_cols + categorical_cols
        X = df_model[FEATURE_COLS].copy()
        y = df_model[TARGET].astype(int).copy()

        n_classes = len(y.unique())
        single_class = (n_classes < 2)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=0.25,
            random_state=RANDOM_STATE,
            stratify=(y if not single_class else None),
        )

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled  = scaler.transform(X_test)
        X_all_scaled   = scaler.transform(X)

    # ── Helper: ambil kolom proba defect dengan aman ────────────────
    def _proba_defect(model, X_data):
        """
        Ambil probabilitas kelas 1 (Defect).
        Jika model hanya tahu 1 kelas (semua Normal), kembalikan array 0.0.
        """
        proba = model.predict_proba(X_data)
        if proba.shape[1] == 1:
            return np.zeros(len(X_data))
        return proba[:, 1]

    # ── 7. Isolation Forest ─────────────────────────────────────────
    if not _all_models_exist:
        contamination_rate = float(np.clip(y.mean(), 0.01, 0.5))
        iso_model = IsolationForest(
            n_estimators=300,
            contamination=contamination_rate,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        iso_model.fit(X_train_scaled)

    iso_pred_test = (iso_model.predict(X_test_scaled) == -1).astype(int)
    iso_pred_all  = (iso_model.predict(X_all_scaled)  == -1).astype(int)
    iso_score_all = iso_model.score_samples(X_all_scaled)

    iso_result = _evaluate_model("Isolation Forest", y_test, iso_pred_test)

    # ── 8. Random Forest & Gradient Boosting ───────────────────────
    # Hanya train jika model belum ada; jika sudah di-load dari disk, skip.
    if not _all_models_exist:
        if single_class:
            from sklearn.dummy import DummyClassifier
            rf_model = DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE)
            gb_model = DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE)
            rf_model.fit(X_train, y_train)
            gb_model.fit(X_train, y_train)
        else:
            rf_model = RandomForestClassifier(
                n_estimators=500,
                max_depth=None,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=RANDOM_STATE,
                n_jobs=-1,
            )
            rf_model.fit(X_train, y_train)

            gb_model = GradientBoostingClassifier(
                n_estimators=200,
                learning_rate=0.05,
                max_depth=3,
                random_state=RANDOM_STATE,
            )
            gb_model.fit(X_train, y_train)

    rf_pred_test  = rf_model.predict(X_test)
    rf_proba_test = _proba_defect(rf_model, X_test)
    rf_pred_all   = rf_model.predict(X)
    rf_proba_all  = _proba_defect(rf_model, X)

    rf_result = _evaluate_model("Random Forest", y_test, rf_pred_test, rf_proba_test)

    gb_pred_test  = gb_model.predict(X_test)
    gb_proba_test = _proba_defect(gb_model, X_test)
    gb_pred_all   = gb_model.predict(X)
    gb_proba_all  = _proba_defect(gb_model, X)

    gb_result = _evaluate_model("Gradient Boosting", y_test, gb_pred_test, gb_proba_test)

    # ── 10. Perbandingan model ──────────────────────────────────────
    comparison_df = pd.DataFrame([iso_result, rf_result, gb_result])
    # Hapus kolom confusion_matrix dari tabel perbandingan (tidak cocok di tabel)
    comparison_df_table = comparison_df.drop(columns=["confusion_matrix"], errors="ignore")
    comparison_df_table = comparison_df_table.sort_values(
        by=["recall", "f1_score"], ascending=False
    ).reset_index(drop=True)

    # ── 11. Cross Validation ────────────────────────────────────────
    # Skip jika hanya 1 kelas — CV dengan scoring="f1" tidak bisa berjalan
    min_class_count = int(y.value_counts().min())
    n_splits = min(5, max(2, min_class_count))

    cv_summary = {}
    if n_splits >= 2 and not single_class:
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)

        rf_cv_f1 = cross_val_score(rf_model, X, y, cv=skf, scoring="f1", n_jobs=-1)
        gb_cv_f1 = cross_val_score(gb_model, X, y, cv=skf, scoring="f1", n_jobs=-1)

        cv_summary = {
            "Random Forest":     {"mean": float(rf_cv_f1.mean()), "std": float(rf_cv_f1.std()), "scores": rf_cv_f1.tolist()},
            "Gradient Boosting": {"mean": float(gb_cv_f1.mean()), "std": float(gb_cv_f1.std()), "scores": gb_cv_f1.tolist()},
        }

    # ── 12. Feature Importance ──────────────────────────────────────
    # DummyClassifier tidak punya feature_importances_ → isi semua 0
    if single_class or not hasattr(rf_model, "feature_importances_"):
        importances = np.zeros(len(FEATURE_COLS))
    else:
        importances = rf_model.feature_importances_

    importance_df = pd.DataFrame({
        "feature":    FEATURE_COLS,
        "importance": importances,
    }).sort_values("importance", ascending=False).reset_index(drop=True)

    # ── 13. Prediksi final seluruh dataset ──────────────────────────
    df_output = df.copy()

    df_output["isolation_forest_pred"]  = iso_pred_all
    df_output["isolation_forest_score"] = iso_score_all

    df_output["rf_pred"]         = rf_pred_all
    df_output["rf_proba_defect"] = rf_proba_all

    df_output["gb_pred"]         = gb_pred_all
    df_output["gb_proba_defect"] = gb_proba_all

    # Consensus voting: ≥2 dari 3 model = defect
    df_output["model_vote_defect"] = (
        df_output["isolation_forest_pred"]
        + df_output["rf_pred"]
        + df_output["gb_pred"]
    )
    df_output["model_consensus_pred"] = (df_output["model_vote_defect"] >= 2).astype(int)

    # Label final TETAP mengikuti is_defect dari dataset
    df_output["consensus_label"] = df_output[TARGET].map({0: "Normal", 1: "Defect"})

    # Status string masing-masing model
    df_output["rf_status"]               = df_output["rf_pred"].map({0: "Normal", 1: "Defect"})
    df_output["gb_status"]               = df_output["gb_pred"].map({0: "Normal", 1: "Defect"})
    df_output["if_status"]               = df_output["isolation_forest_pred"].map({0: "Normal", 1: "Defect"})
    df_output["model_consensus_status"]  = df_output["model_consensus_pred"].map({0: "Normal", 1: "Defect"})

    # ── 14. Simpan output ───────────────────────────────────────────
    if save_path:
        df_output.to_csv(save_path, index=False)

    # Simpan model .joblib — hanya jika baru di-train (bukan hasil load)
    if not _all_models_exist:
        joblib.dump(rf_model,       os.path.join(models_dir, "random_forest_defect_model.joblib"))
        joblib.dump(gb_model,       os.path.join(models_dir, "gradient_boosting_defect_model.joblib"))
        joblib.dump(iso_model,      os.path.join(models_dir, "isolation_forest_defect_model.joblib"))
        joblib.dump(scaler,         os.path.join(models_dir, "scaler.joblib"))
        joblib.dump(label_encoders, os.path.join(models_dir, "label_encoders.joblib"))
        joblib.dump(FEATURE_COLS,   os.path.join(models_dir, "feature_columns.joblib"))
        print("[modelling] Model baru disimpan ke disk.")

    # ── 15. Kumpulkan semua hasil ───────────────────────────────────
    model_results = {
        # Metrics per model
        "iso_result":        iso_result,
        "rf_result":         rf_result,
        "gb_result":         gb_result,
        "comparison":        comparison_df_table,

        # Cross validation
        "cv_summary":        cv_summary,

        # Feature importance
        "feature_importance": importance_df,

        # Model objects (untuk ROC curve di dashboard)
        "rf_model":          rf_model,
        "gb_model":          gb_model,
        "iso_model":         iso_model,
        "scaler":            scaler,
        "label_encoders":    label_encoders,
        "feature_cols":      FEATURE_COLS,

        # Data split (untuk dashboard evaluasi)
        "X_test":            X_test,
        "y_test":            y_test,
        "rf_proba_test":     rf_proba_test,
        "gb_proba_test":     gb_proba_test,
        "rf_pred_test":      rf_pred_test,
        "gb_pred_test":      gb_pred_test,
    }

    return df_output, model_results


# ══════════════════════════════════════════════════════
# QUICK TEST
# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    from preprocessing import run_preprocessing

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
    print(f"  Clean shape: {clean_df.shape}")

    print("\nStep 2 — Modelling...")
    os.makedirs("outputs", exist_ok=True)
    df_pred, results = run_modelling(
        clean_df,
        save_path="outputs/dataset_with_predictions.csv",
        models_dir="models",
    )

    print("\n" + "=" * 55)
    print("RINGKASAN MODELLING")
    print("=" * 55)
    print(f"Output shape     : {df_pred.shape}")
    print(f"Total Normal     : {(df_pred['is_defect'] == 0).sum()}")
    print(f"Total Defect     : {(df_pred['is_defect'] == 1).sum()}")
    print()
    print("Perbandingan Model (sorted by recall, f1):")
    cmp = results["comparison"]
    for _, row in cmp.iterrows():
        print(
            f"  {row['model']:<22} | "
            f"Acc={row['accuracy']:.3f} "
            f"Prec={row['precision']:.3f} "
            f"Rec={row['recall']:.3f} "
            f"F1={row['f1_score']:.3f}"
        )
    print()
    print("Top 10 Feature Importance (Random Forest):")
    for _, r in results["feature_importance"].head(10).iterrows():
        print(f"  {r['feature']:<35} {r['importance']:.4f}")
    print()
    if results["cv_summary"]:
        print("Cross Validation F1:")
        for model_name, cv in results["cv_summary"].items():
            print(f"  {model_name:<22} mean={cv['mean']:.3f} ± {cv['std']:.3f}")
    print()
    print("Output: outputs/dataset_with_predictions.csv")
    print("Models: models/*.joblib")