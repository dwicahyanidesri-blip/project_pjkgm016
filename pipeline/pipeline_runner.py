import os
import sys
import traceback

_PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from preprocessing import run_preprocessing
from modelling     import run_modelling
from clustering    import run_clustering


def run_pipeline(
    uploaded_file,
    output_dir: str = "outputs",
    models_dir: str = "models",
    save_outputs: bool = True,
    progress_callback=None,
    is_csv: bool = False,
) -> dict:
    """
    Jalankan full pipeline: preprocessing → modelling → clustering.

    Parameters
    ----------
    uploaded_file     : str | bytes | UploadedFile
                        File mentah (.xlsx / .xls / .csv).
    output_dir        : str
                        Direktori untuk menyimpan CSV output.
    models_dir        : str
                        Direktori untuk menyimpan model .joblib / .pkl.
    save_outputs      : bool
                        True = simpan CSV ke output_dir; False = hanya return DataFrame.
    progress_callback : callable(step: int, total: int, message: str) | None
                        Opsional. Dipanggil di setiap tahap untuk update progress bar
                        (berguna di Streamlit: st.progress / st.status).
    is_csv            : bool
                        True jika uploaded_file berformat .csv (bukan Excel).
                        Diteruskan ke run_preprocessing agar deteksi baris
                        kuning dilewati dan data dibaca langsung via pd.read_csv.

    Returns
    -------
    dict dengan key:
        "clean_df"        → pd.DataFrame  hasil preprocessing
        "prediction_df"   → pd.DataFrame  hasil modelling
        "clustered_df"    → pd.DataFrame  hasil clustering (dataset final)
        "model_results"   → dict          metrics, feature importance, model objects
        "cluster_results" → dict          profil cluster, PCA coords, risk level
        "success"         → bool
        "error"           → str | None    pesan error jika gagal

    Raises
    ------
    Tidak melempar exception langsung — error ditangkap dan dikembalikan
    dalam key "error" agar dapat menampilkan pesan yang ramah.
    """
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    TOTAL_STEPS = 3

    def _notify(step: int, message: str):
        if progress_callback:
            progress_callback(step, TOTAL_STEPS, message)

    result = {
        "clean_df":        None,
        "prediction_df":   None,
        "clustered_df":    None,
        "model_results":   None,
        "cluster_results": None,
        "success":         False,
        "error":           None,
    }

    try:
        # STEP 1: Preprocessing
        _notify(1, "Step 1/3 — Preprocessing data mentah...")

        clean_path = os.path.join(output_dir, "dataset_clean.csv") if save_outputs else None
        clean_df   = run_preprocessing(uploaded_file, save_path=clean_path, is_csv=is_csv)
        result["clean_df"] = clean_df

        # STEP 2: Modelling
        _notify(2, "Step 2/3 — Training model (RF, GB, Isolation Forest)...")

        pred_path   = os.path.join(output_dir, "dataset_with_predictions.csv") if save_outputs else None
        pred_df, model_results = run_modelling(
            clean_df,
            save_path=pred_path,
            models_dir=models_dir,
        )
        result["prediction_df"]  = pred_df
        result["model_results"]  = model_results

        # STEP 3: Clustering
        _notify(3, "Step 3/3 — K-Means clustering & PCA...")

        cluster_path = os.path.join(output_dir, "dataset_clustered.csv") if save_outputs else None
        clustered_df, cluster_results = run_clustering(
            pred_df,
            save_path=cluster_path,
            models_dir=models_dir,
        )
        result["clustered_df"]    = clustered_df
        result["cluster_results"] = cluster_results

        result["success"] = True

    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}\n\n{traceback.format_exc()}"

    return result


def get_pipeline_summary(result: dict) -> str:
    """
    Buat ringkasan teks dari hasil run_pipeline() untuk logging / debug.
    Hanya dipanggil jika result["success"] == True.
    """
    if not result["success"]:
        return f"Pipeline GAGAL: {result['error']}"

    cdf  = result["clean_df"]
    pdf  = result["prediction_df"]
    kdf  = result["clustered_df"]
    mr   = result["model_results"]
    cr   = result["cluster_results"]

    lines = [
        "=" * 55,
        "  PIPELINE SUMMARY — PJK-GM016",
        "=" * 55,
        f"  Preprocessing    : {cdf.shape[0]} baris × {cdf.shape[1]} kolom",
        f"  Normal           : {(cdf['is_defect']==0).sum()}  |  "
        f"Defect: {(cdf['is_defect']==1).sum()}",
        "",
        f"  Modelling        : {pdf.shape[1]} kolom (incl. prediksi)",
        "  Performa Model:",
    ]

    for _, row in mr["comparison"].iterrows():
        lines.append(
            f"    {row['model']:<22} "
            f"Acc={row['accuracy']:.3f}  "
            f"Recall={row['recall']:.3f}  "
            f"F1={row['f1_score']:.3f}"
        )

    lines += [
        "",
        f"  Clustering       : k={cr['optimal_k']}  "
        f"Silhouette={cr['silhouette_final']:.4f}  "
        f"DB={cr['davies_bouldin_final']:.4f}",
        "  Distribusi Cluster:",
    ]

    for ci in range(cr["optimal_k"]):
        info = cr["cluster_risk"][ci]
        lines.append(
            f"    Cluster {ci} : n={info['n_batch']:2d}  "
            f"defect={info['defect_rate']:.1f}%  {info['risk_level']}"
        )

    lines += [
        "",
        f"  Output shape FINAL : {kdf.shape[0]} baris × {kdf.shape[1]} kolom",
        "=" * 55,
    ]

    return "\n".join(lines)


# QUICK TEST
if __name__ == "__main__":
    excel_file = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Rekap_Posisi_Solid_Granulasi_lt_2_26_MARET_2026.xlsx"
    )

    if not os.path.exists(excel_file):
        print(f"File tidak ditemukan: {excel_file}")
        sys.exit(1)

    def progress(step, total, msg):
        print(f"  [{step}/{total}] {msg}")

    print(f"\nMenjalankan full pipeline pada: {excel_file}\n")
    result = run_pipeline(
        excel_file,
        output_dir="outputs",
        models_dir="models",
        save_outputs=True,
        progress_callback=progress,
    )

    print()
    print(get_pipeline_summary(result))

    if not result["success"]:
        print("\nERROR DETAIL:")
        print(result["error"])
        sys.exit(1)
