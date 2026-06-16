import os, sys, json, traceback
from dotenv import load_dotenv
load_dotenv()
import httpx
from pathlib import Path
from typing  import Optional

import numpy  as np
import pandas as pd
from fastapi            import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses  import JSONResponse
from pydantic           import BaseModel

# Path pipeline
_BACKEND_DIR = Path(__file__).parent
_ROOT_DIR    = _BACKEND_DIR.parent
for _d in [str(_BACKEND_DIR), str(_ROOT_DIR / "pipeline"), str(_ROOT_DIR)]:
    if _d not in sys.path:
        sys.path.insert(0, _d)

from pipeline_runner import run_pipeline, get_pipeline_summary   # noqa: E402


app = FastAPI(title="AI Pharma API — PJK-GM016", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = str(_ROOT_DIR / "outputs")
MODELS_DIR = str(_ROOT_DIR / "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# In-memory cache
_cache: dict = {
    "df":              None,
    "model_results":   None,
    "cluster_results": None,
    "pipeline_ran":    False,
}

def _auto_load_from_csv():
    """Load data dari CSV outputs/ saat startup agar tidak perlu upload ulang."""
    candidates = [
        str(_ROOT_DIR / "outputs" / "dataset_clustered.csv"),
        str(_ROOT_DIR / "outputs" / "dataset_with_predictions.csv"),
        str(_ROOT_DIR / "outputs" / "dataset_clean.csv"),
    ]
    for csv_path in candidates:
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
                df["is_defect"] = pd.to_numeric(df.get("is_defect", 0), errors="coerce").fillna(0).astype(int)
                df["label_display"] = df["is_defect"].map({0:"Normal",1:"Defect"}).fillna("Normal")
                if "row_no" not in df.columns:
                    df["row_no"] = range(1, len(df)+1)
                _cache["df"] = df
                print(f"[startup] Loaded {len(df)} rows from {csv_path}")
                return
            except Exception as e:
                print(f"[startup] Could not load {csv_path}: {e}")

# Auto-load data saat backend start
_auto_load_from_csv()


# HELPERS
def _df_to_records(df: pd.DataFrame) -> list:
    """Konversi DataFrame ke list of dict, handle NaN/Inf."""
    return json.loads(
        df.replace([np.inf, -np.inf], np.nan)
          .fillna("")
          .to_json(orient="records", force_ascii=False)
    )


def _safe_float(val):
    if val is None: return None
    try:
        v = float(val)
        return None if (np.isnan(v) or np.isinf(v)) else v
    except Exception:
        return None


# ENDPOINTS
@app.get("/")
def root():
    return {"status": "ok", "message": "AI Pharma API running"}


@app.get("/health")
def health():
    return {"pipeline_ran": _cache["pipeline_ran"],
            "rows": len(_cache["df"]) if _cache["df"] is not None else 0}


# 1. Upload & Run Pipeline
@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload file (.xlsx/.xls/.csv) → jalankan full pipeline
    (preprocessing → modelling → clustering) untuk semua format.
    Return ringkasan hasil.
    """
    fname = file.filename.lower()
    if not fname.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Format file harus .xlsx, .xls, atau .csv")

    raw_bytes = await file.read()

    import io
    result = run_pipeline(
        io.BytesIO(raw_bytes),
        output_dir=OUTPUT_DIR,
        models_dir=MODELS_DIR,
        save_outputs=True,
        is_csv=fname.endswith(".csv"),
    )

    if not result["success"]:
        raise HTTPException(500, f"Pipeline gagal: {result['error'][:500]}")

    df_out = result["clustered_df"].copy()
    df_out["label_display"] = df_out["is_defect"].map({0:"Normal",1:"Defect"}).fillna("Normal")
    if "row_no" not in df_out.columns:
        df_out["row_no"] = range(1, len(df_out)+1)

    _cache["df"]              = df_out
    _cache["model_results"]   = result["model_results"]
    _cache["cluster_results"] = result["cluster_results"]
    _cache["pipeline_ran"]    = True

    return {
        "success":     True,
        "rows":        len(df_out),
        "pipeline_ran": True,
        "summary":     get_pipeline_summary(result),
    }


# 2. Monitoring
@app.get("/overview")
def get_overview():
    df = _cache["df"]
    if df is None:
        raise HTTPException(404, "Data belum diupload")

    total  = len(df)
    n_def  = int(df["is_defect"].sum()) if "is_defect" in df.columns else 0
    n_norm = total - n_def
    dr     = round(n_def / total * 100, 2) if total else 0

    # Avg suhu
    suhu_cols = [c for c in ["cb1_suhu_rata","cb2_suhu_rata"] if c in df.columns]
    avg_suhu  = round(float(df[suhu_cols].mean().mean()), 2) if suhu_cols else None

    # Avg kadar air
    ka_cols  = [c for c in ["cb1_rata_ka","cb2_rata_ka","ck1_ka_setelah_ck"] if c in df.columns]
    avg_ka   = round(float(df[ka_cols].mean().mean()), 2) if ka_cols else None

    # Avg yield
    yld_cols  = [c for c in ["cb1_pct_yield","ck1_pct_yield","cb2_pct_yield"] if c in df.columns]
    avg_yield = round(float(df[yld_cols].replace(0, np.nan).mean().mean()), 2) if yld_cols else None

    # Defect per bulan
    defect_trend = []
    if "cb1_bulan" in df.columns:
        gb = df.groupby("cb1_bulan")["is_defect"].agg(total="count", defect="sum").reset_index()
        gb["defect_rate"] = (gb["defect"] / gb["total"] * 100).round(2)
        MONTH_ORDER = {"JANUARI":1,"FEBRUARI":2,"MARET":3,"APRIL":4,"MEI":5,"JUNI":6,
                       "JULI":7,"AGUSTUS":8,"SEPTEMBER":9,"OKTOBER":10,"NOVEMBER":11,"DESEMBER":12}
        MONTH_YEAR  = {"OKTOBER":2025,"NOVEMBER":2025,"DESEMBER":2025}
        def _mk(b): u=str(b).strip().upper(); return MONTH_YEAR.get(u,2026)*100+MONTH_ORDER.get(u,99)
        def _lbl(b): u=str(b).strip().upper(); return f"{u.capitalize()} {MONTH_YEAR.get(u,2026)}"
        gb["sort_key"]    = gb["cb1_bulan"].apply(_mk)
        gb = gb.sort_values("sort_key")
        gb["bulan_label"] = gb["cb1_bulan"].apply(_lbl)
        defect_trend = gb.drop(columns=["sort_key"]).to_dict(orient="records")

    # Label distribution
    label_dist = df["label_display"].value_counts().to_dict() if "label_display" in df.columns else {}

    # Perbandingan rata-rata Normal vs Defect untuk suhu, KA, yield
    compare_metrics = []
    if "is_defect" in df.columns:
        COMPARE_COLS = [
            ("cb1_suhu_rata",  "Suhu CB1 (°C)"),
            ("cb2_suhu_rata",  "Suhu CB2 (°C)"),
            ("cb1_rata_ka",    "Kadar Air CB1 (%)"),
            ("cb2_rata_ka",    "Kadar Air CB2 (%)"),
            ("cb1_pct_yield",  "Yield CB1 (%)"),
            ("cb2_pct_yield",  "Yield CB2 (%)"),
            ("ck1_pct_yield",  "Yield CK1 (%)"),
        ]
        for col, label in COMPARE_COLS:
            if col not in df.columns:
                continue
            norm_val   = df[df["is_defect"] == 0][col].mean()
            defect_val = df[df["is_defect"] == 1][col].mean()
            if pd.notna(norm_val) and pd.notna(defect_val):
                compare_metrics.append({
                    "metric": label,
                    "Normal": round(float(norm_val), 2),
                    "Defect": round(float(defect_val), 2),
                })

    return {
        "kpi": {
            "total_batch": total,
            "normal":      n_norm,
            "defect":      n_def,
            "defect_rate": dr,
            "avg_suhu":    avg_suhu,
            "avg_ka":      avg_ka,
            "avg_yield":   avg_yield,
        },
        "defect_trend":    defect_trend,
        "label_dist":      label_dist,
        "compare_metrics": compare_metrics,
    }

# Tabel batch
@app.get("/monitoring")
def get_monitoring(
    bulan:  Optional[str] = None,
    line:   Optional[str] = None,
    status: Optional[str] = None,
    page:   int = 1,
    limit:  int = 20,
):
    df = _cache["df"]
    if df is None:
        raise HTTPException(404, "Data belum diupload")

    dff = df.copy()
    if bulan  and bulan  != "Semua" and "cb1_bulan" in dff.columns:
        dff = dff[dff["cb1_bulan"] == bulan]
    if line   and line   != "Semua" and "cb1_line"  in dff.columns:
        dff = dff[dff["cb1_line"]  == line]
    if status and status != "Semua" and "label_display" in dff.columns:
        dff = dff[dff["label_display"] == status]

    total_rows = len(dff)
    start = (page - 1) * limit
    end   = start + limit
    page_df = dff.iloc[start:end]

    return {
        "total": total_rows,
        "page":  page,
        "limit": limit,
        "data":  _df_to_records(page_df),
        "filters": {
            "bulan_options":  ["Semua"] + sorted(df["cb1_bulan"].dropna().unique().tolist()) if "cb1_bulan" in df.columns else ["Semua"],
            "line_options":   ["Semua"] + sorted(df["cb1_line"].dropna().unique().tolist())  if "cb1_line"  in df.columns else ["Semua"],
            "status_options": ["Semua", "Normal", "Defect"],
        }
    }


# 3. Analisis Defect
@app.get("/defect-analysis")
def get_defect_analysis():
    df = _cache["df"]
    if df is None:
        raise HTTPException(404, "Data belum diupload")

    defect_df = df[df["is_defect"] == 1] if "is_defect" in df.columns else df.iloc[0:0]

    # Parse reasons
    reason_counts = {}
    if "defect_reasons" in defect_df.columns:
        import re
        reasons = []
        for val in defect_df["defect_reasons"].dropna():
            for r in str(val).split("|"):
                r = re.sub(r"\(.*?\)", "", r).strip()
                if r and r not in ("-","nan",""):
                    reasons.append(r)
        if reasons:
            reason_counts = pd.Series(reasons).value_counts().head(15).to_dict()

    # Defect per line
    defect_per_line = {}
    if "is_defect" in df.columns:
        INVALID = {"", "-", "NAN", "UNKNOWN", "TIDAK DIKETAHUI"}
        combined_rows = []
        for col in ["cb1_line", "cb2_line"]:
            if col not in df.columns:
                continue
            tmp = df[[col, "is_defect"]].copy()
            tmp["line"] = tmp[col].astype(str).str.strip().str.upper()
            tmp = tmp[~tmp["line"].isin(INVALID)]
            combined_rows.append(tmp[["line", "is_defect"]])
        if combined_rows:
            ldf = pd.concat(combined_rows, ignore_index=True)
            defect_per_line = (
                ldf.groupby("line")["is_defect"].mean() * 100
            ).round(2).to_dict()

    return {
        "total_defect":    len(defect_df),
        "reason_counts":   reason_counts,
        "defect_per_line": defect_per_line,
    }

# Model results
@app.get("/model-results")
def get_model_results():
    mr = _cache.get("model_results")
    if mr is None:
        raise HTTPException(404, "Model results belum tersedia. Upload file Excel terlebih dahulu.")

    # Feature importance
    fi = []
    if "feature_importance" in mr and mr["feature_importance"] is not None:
        fi_df = mr["feature_importance"]
        fi = fi_df.head(20).to_dict(orient="records") if hasattr(fi_df, "to_dict") else []

    # Model comparison
    comparison = []
    if "comparison" in mr and mr["comparison"] is not None:
        comparison = mr["comparison"].to_dict(orient="records")

    # Confusion matrix RF
    cm_rf = None
    if "rf_cm" in mr and mr["rf_cm"] is not None:
        cm_rf = mr["rf_cm"].tolist() if hasattr(mr["rf_cm"], "tolist") else mr["rf_cm"]

    return {
        "comparison":         comparison,
        "feature_importance": fi,
        "confusion_matrix_rf": cm_rf,
    }


# 4. Prediksi Manual
class PredictRequest(BaseModel):
    features: dict   

@app.post("/predict")
def predict_single(req: PredictRequest):
    """Prediksi kualitas batch dari input manual."""
    import joblib
    rf_path = os.path.join(MODELS_DIR, "random_forest_defect_model.joblib")
    sc_path = os.path.join(MODELS_DIR, "scaler.joblib")
    fc_path = os.path.join(MODELS_DIR, "feature_columns.joblib")

    if not all(os.path.exists(p) for p in [rf_path, sc_path, fc_path]):
        raise HTTPException(503, "Model belum tersedia. Jalankan pipeline dulu.")

    rf        = joblib.load(rf_path)
    scaler    = joblib.load(sc_path)
    feat_cols = joblib.load(fc_path)

    row = {col: req.features.get(col, 0) for col in feat_cols}
    X   = np.array([list(row.values())])
    Xs  = scaler.transform(X)

    pred  = int(rf.predict(Xs)[0])
    proba = float(rf.predict_proba(Xs)[0][1])

    # Rule-based reasoning dari input manual
    features = req.features
    reasons  = []

    SUHU_COLS  = ["cb1_suhu_rata", "cb2_suhu_rata"]
    KA_COLS    = ["cb1_rata_ka", "cb2_rata_ka", "ck1_ka_setelah_ck"]
    YIELD_THRESHOLDS = {
        "cb1_pct_yield": (99.0, 103.1),
        "ck1_pct_yield": (99.1, 102.9),
        "cb2_pct_yield": (99.1, 102.3),
    }
    YIELD_LABELS = {
        "cb1_pct_yield": "Yield CB1",
        "ck1_pct_yield": "Yield CK1",
        "cb2_pct_yield": "Yield CB2",
    }

    for col in SUHU_COLS:
        v = features.get(col)
        if v is not None and v > 75:
            label = "CB1" if "cb1" in col else "CB2"
            reasons.append(f"Suhu rata-rata {label} tinggi ({v:.1f}°C > 75°C)")

    for col in KA_COLS:
        v = features.get(col)
        if v is not None:
            lbl = col.replace("_rata_ka"," Rata-rata").replace("cb1","CB1").replace("cb2","CB2").replace("ck1_ka_setelah_ck","KA setelah CK1")
            if v > 10:
                reasons.append(f"{lbl} ekstrem ({v:.2f}% > 10%)")
            elif v > 5.5:
                reasons.append(f"{lbl} tinggi ({v:.2f}% > 5.5%)")
            elif v < 3.0:
                reasons.append(f"{lbl} rendah ({v:.2f}% < 3.0%)")

    for col, (lo, hi) in YIELD_THRESHOLDS.items():
        v = features.get(col)
        lbl = YIELD_LABELS.get(col, col)
        if v is not None:
            if v < lo:
                reasons.append(f"{lbl} rendah ({v:.2f}% < {lo}%)")
            elif v > hi:
                reasons.append(f"{lbl} tinggi ({v:.2f}% > {hi}%)")

    # Override prediksi: jika ada pelanggaran rule, tetapkan Defect
    if reasons:
        pred  = 1
        proba = max(proba, 0.75)

    return {
        "prediction":  pred,
        "label":       "Defect" if pred == 1 else "Normal",
        "probability": round(proba, 4),
        "risk_level":  "Tinggi" if proba > 0.7 else "Sedang" if proba > 0.4 else "Rendah",
        "reasons":     reasons,
    }


# 5. Clustering
@app.get("/clustering")
def get_clustering():
    cr = _cache.get("cluster_results")
    df = _cache.get("df")
    if cr is None or df is None:
        raise HTTPException(404, "Cluster results belum tersedia.")

    # PCA coords dari df
    pca_data = []
    if "pca_x" in df.columns and "Cluster" in df.columns:
        pca_cols = ["pca_x","pca_y","Cluster","label_display","is_defect"]
        available = [c for c in pca_cols if c in df.columns]
        pca_data = _df_to_records(df[available])

    # Eval df (elbow)
    eval_data = []
    if "eval_df" in cr and cr["eval_df"] is not None:
        eval_data = cr["eval_df"].to_dict(orient="records")

    # Profile df
    profile_data = []
    if "profile_df" in cr and cr["profile_df"] is not None:
        profile_data = _df_to_records(cr["profile_df"].reset_index())

    # Feature importance cluster
    ci_data = []
    if "cluster_importance" in cr and cr["cluster_importance"] is not None:
        ci_data = cr["cluster_importance"].head(15).to_dict(orient="records")

    return {
        "optimal_k":        cr.get("optimal_k"),
        "silhouette_final": _safe_float(cr.get("silhouette_final")),
        "davies_bouldin":   _safe_float(cr.get("davies_bouldin_final")),
        "var2":             cr.get("var2", [0, 0]),
        "pca_data":         pca_data,
        "eval_data":        eval_data,
        "profile_data":     profile_data,
        "cluster_importance": ci_data,
    }


# 6. Defect Batches Detail
@app.get("/defect-batches")
def get_defect_batches():
    """Kembalikan semua batch defect beserta kolom defect_reasons dan info batch."""
    df = _cache.get("df")
    if df is None:
        raise HTTPException(404, "Data belum diupload")

    if "is_defect" not in df.columns:
        return {"batches": []}

    defect_df = df[df["is_defect"] == 1].copy()

    keep_cols = [
        "row_no", "material_desc", "cb1_bulan", "cb1_line", "cb1_shift",
        "cb1_suhu_rata", "cb2_suhu_rata", "cb1_rata_ka", "cb2_rata_ka",
        "cb1_pct_yield", "ck1_pct_yield", "cb2_pct_yield",
        "defect_reasons", "label_display",
    ]
    available = [c for c in keep_cols if c in defect_df.columns]
    result_df = defect_df[available].reset_index(drop=True)

    return {"batches": _df_to_records(result_df)}


# 7. AI Analyst
HF_MODEL   = "meta-llama/Llama-3.3-70B-Instruct"
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_API_KEY = os.getenv("HF_API_KEY", "")

ANALYSIS_TYPES = {
    "summary": (
        "Kondisi Produksi Saat Ini",
        "Berikan ringkasan kondisi kualitas produksi berdasarkan data. "
        "Sebutkan: total batch, defect rate, parameter yang paling sering menyimpang, "
        "dan status keseluruhan (kritis/perlu perhatian/baik)."
    ),
    "root_cause": (
        "Kenapa Batch Bisa Gagal?",
        "Identifikasi 3 akar penyebab utama defect terbanyak dalam data. "
        "Untuk setiap penyebab jelaskan: parameter yang menyimpang, seberapa jauh dari "
        "batas normal, dan di mana (line/shift) kejadiannya paling sering."
    ),
    "recommendation": (
        "Apa yang Harus Diperbaiki?",
        "Berikan 5 rekomendasi perbaikan proses yang spesifik dan dapat langsung diterapkan "
        "berdasarkan pola defect dalam data. Urutkan dari yang paling mendesak."
    ),
    "line_comparison": (
        "Line Mana yang Bermasalah?",
        "Bandingkan performa setiap line produksi berdasarkan defect rate-nya. "
        "Identifikasi line dengan masalah terbesar dan faktor yang membedakannya dari line lain."
    ),
    "trend": (
        "Tren Kualitas dari Waktu ke Waktu",
        "Analisis tren defect berdasarkan data per bulan yang tersedia. "
        "Apakah ada pola musiman, tren memburuk, atau perbaikan? Apa implikasinya?"
    ),
    "priority": (
        "Mana yang Harus Ditangani Dulu?",
        "Buat daftar prioritas tindakan perbaikan yang harus segera dilakukan. "
        "Pertimbangkan: frekuensi kejadian, dampak terhadap kualitas, dan kemudahan implementasi."
    ),
}


def _build_data_context(df: pd.DataFrame) -> str:
    """Susun ringkasan data sebagai konteks untuk LLM."""
    lines = []
    total = len(df)
    n_def = int(df["is_defect"].sum()) if "is_defect" in df.columns else 0
    dr    = round(n_def / total * 100, 2) if total else 0

    lines += [
        "## KPI Utama",
        f"- Total batch: {total}",
        f"- Batch normal: {total - n_def}",
        f"- Batch defect: {n_def}",
        f"- Defect rate: {dr}%",
    ]

    for col, label in [("cb1_suhu_rata","Rata-rata suhu"), ("cb1_rata_ka","Rata-rata KA"),
                        ("cb1_pct_yield","Rata-rata yield CB1")]:
        if col in df.columns:
            lines.append(f"- {label}: {round(float(df[col].mean()), 2)}")

    if "cb1_bulan" in df.columns and "is_defect" in df.columns:
        lines.append("\n## Tren Defect per Bulan")
        gb = df.groupby("cb1_bulan")["is_defect"].agg(total="count", defect="sum").reset_index()
        gb["rate"] = (gb["defect"] / gb["total"] * 100).round(2)
        for _, row in gb.iterrows():
            lines.append(f"- {row['cb1_bulan']}: {row['defect']} defect dari {row['total']} batch ({row['rate']}%)")

    if "cb1_line" in df.columns and "is_defect" in df.columns:
        lines.append("\n## Defect Rate per Line")
        for line, rate in df.groupby("cb1_line")["is_defect"].mean().mul(100).round(2).items():
            lines.append(f"- Line {line}: {rate}%")

    if "cb1_shift" in df.columns and "is_defect" in df.columns:
        lines.append("\n## Defect Rate per Shift")
        for shift, rate in df.groupby("cb1_shift")["is_defect"].mean().mul(100).round(2).items():
            lines.append(f"- Shift {shift}: {rate}%")

    if "defect_reasons" in df.columns:
        import re as _re
        reasons = []
        mask = df["is_defect"] == 1 if "is_defect" in df.columns else pd.Series([True]*len(df))
        for val in df[mask]["defect_reasons"].dropna():
            for r in str(val).split("|"):
                r = _re.sub(r"\(.*?\)", "", r).strip()
                if r and r not in ("-","nan",""): reasons.append(r)
        if reasons:
            lines.append("\n## Penyebab Defect Terbanyak")
            for reason, count in pd.Series(reasons).value_counts().head(10).items():
                lines.append(f'- "{reason}": {count} kali')

    COMPARE = [("cb1_suhu_rata","Suhu CB1"),("cb2_suhu_rata","Suhu CB2"),
               ("cb1_rata_ka","KA CB1"),("cb2_rata_ka","KA CB2"),
               ("cb1_pct_yield","Yield CB1"),("ck1_pct_yield","Yield CK1")]
    compare_rows = []
    if "is_defect" in df.columns:
        for col, label in COMPARE:
            if col not in df.columns: continue
            nv = df[df["is_defect"]==0][col].mean()
            dv = df[df["is_defect"]==1][col].mean()
            if pd.notna(nv) and pd.notna(dv):
                compare_rows.append(f"- {label}: Normal={round(float(nv),2)}, Defect={round(float(dv),2)}")
    if compare_rows:
        lines.append("\n## Parameter Normal vs Defect")
        lines.extend(compare_rows)

    return "\n".join(lines)


class AnalyzeRequest(BaseModel):
    analysis_type: str


@app.post("/analyze")
async def run_analysis(req: AnalyzeRequest):
    """Generate laporan AI menggunakan Llama via Hugging Face. API key dari .env."""
    df = _cache.get("df")
    if df is None:
        raise HTTPException(404, "Data belum diupload. Upload dataset terlebih dahulu.")

    if req.analysis_type not in ANALYSIS_TYPES:
        raise HTTPException(400, f"Jenis analisis tidak dikenali: {req.analysis_type}")

    if not HF_API_KEY:
        raise HTTPException(503, "Layanan analisis belum dikonfigurasi. Hubungi administrator sistem.")

    label, user_prompt = ANALYSIS_TYPES[req.analysis_type]
    data_context       = _build_data_context(df)

    system_prompt = f"""Kamu adalah sistem analisis kualitas produksi granulasi farmasi (PJK-GM016).

PERAN: Menganalisis data produksi dan memberikan rekomendasi perbaikan yang spesifik dan actionable.

ATURAN WAJIB:
1. Hanya gunakan angka dan fakta dari DATA KONTEKS di bawah. Jangan mengarang data.
2. Jika data tidak tersedia untuk menjawab, tulis "Data tidak tersedia dalam dataset ini."
3. Jangan menjawab topik di luar kualitas granulasi dan dataset ini.
4. Cantumkan angka spesifik dari data di setiap poin analisis.
5. Rekomendasi harus langsung terkait parameter yang menyimpang dalam data.
6. Jawab dalam Bahasa Indonesia yang mudah dipahami operator dan supervisor produksi.
7. Struktur: (1) Temuan utama, (2) Analisis penyebab, (3) Rekomendasi konkret.
8. Maksimal 350 kata. Padat dan langsung ke intinya.

BATAS NORMAL PARAMETER:
- Suhu rata-rata granulasi: ≤ 75°C
- Kadar air (KA): 3.0–5.5%
- Yield CB1: 99.0–103.1% | Yield CK1: 99.1–102.9% | Yield CB2: 99.1–102.3%

DATA KONTEKS:
{data_context}"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                HF_API_URL,
                headers={
                    "Authorization": f"Bearer {HF_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model": "meta-llama/Llama-3.3-70B-Instruct:novita",
                    "messages":    [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "max_tokens":  600,
                    "temperature": 0.2,
                    "top_p":       0.9,
                    "stream":      False,
                },
            )

        if resp.status_code == 401:
            raise HTTPException(503, "Konfigurasi layanan analisis bermasalah. Hubungi administrator.")
        if resp.status_code == 503:
            raise HTTPException(503, "Layanan analisis sedang sibuk. Tunggu 20 detik lalu coba lagi.")
        if not resp.is_success:
            raise HTTPException(500, f"HF Error {resp.status_code}: {resp.text[:300]}")

        content = resp.json()["choices"][0]["message"]["content"].strip()
        if not content:
            raise HTTPException(500, "Laporan kosong diterima. Coba lagi.")

        return {
            "success":       True,
            "analysis_type": req.analysis_type,
            "label":         label,
            "result":        content,
            "data_rows":     len(df),
        }

    except httpx.TimeoutException:
        raise HTTPException(504, "Analisis membutuhkan waktu terlalu lama. Coba lagi.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"ERROR: {type(e).__name__}: {str(e)}")