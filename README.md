# AI Pharma — PJK-GM016

Sistem monitoring dan deteksi defect produksi farmasi berbasis kecerdasan buatan (AI), dikembangkan sebagai Capstone Project PJK-GM016 dalam program **Pijak x IBM SkillsBuild 2026**.

---

## Deskripsi Singkat Proyek

AI Pharma adalah aplikasi berbasis web yang dirancang untuk membantu tim Quality of Control dalam memantau kualitas batch granulasi farmasi secara otomatis. Sistem ini mampu mendeteksi batch yang berpotensi defect, menganalisis penyebab kegagalan berdasarkan parameter produksi, serta memberikan rekomendasi perbaikan melalui fitur AI Analyst.

**Fitur utama:**
- **Monitoring** — visualisasi tren kualitas batch (total batch, defect rate, rata-rata suhu, kadar air, yield) per bulan
- **Analisis Defect** — identifikasi batch gagal beserta parameter penyebab yang menyimpang dari batas normal
- **Prediksi Batch** — prediksi status kualitas batch baru secara manual (input parameter) maupun massal (upload dataset)
- **AI Analyst** — laporan cerdas otomatis berbasis AI dengan rekomendasi prioritas perbaikan

**Teknologi:**
- Backend: Python, FastAPI, Scikit-learn, Pandas, Joblib
- Frontend: React 18, Vite, Tailwind CSS, Recharts, Axios
- ML Models: Random Forest, Gradient Boosting, Isolation Forest, K-Means Clustering, PCA

---

## Struktur Folder

```
project_pjkgm016/
├── backend/                  # FastAPI backend & pipeline runner
│   ├── main.py               # Entry point API
│   ├── pipeline_runner.py    # Orkestrasi pipeline ML
│   ├── preprocessing.py      # Preprocessing data
│   ├── modelling.py          # Model deteksi defect
│   ├── clustering.py         # Model clustering
│   ├── requirements.txt      # Dependensi Python
│   ├── .env.example          # Template konfigurasi environment
│   └── Dockerfile
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/            # Beranda, Monitoring, AnalisisDefect, Prediksi, AIAnalyst
│   │   ├── components/       # Komponen UI reusable
│   │   └── hooks/useApi.js   # HTTP client ke backend
│   ├── package.json
│   └── vite.config.js
├── pipeline/                 # Modul pipeline ML (digunakan backend)
│   ├── preprocessing.py
│   ├── modelling.py
│   ├── clustering.py
│   └── pipeline_runner.py
├── models/                   # File model ML terlatih (.joblib, .pkl)
├── outputs/                  # Output CSV dan grafik hasil pipeline
├── 01_preprocessing.ipynb    # Notebook preprocessing & feature engineering
├── 02_eda.ipynb              # Notebook exploratory data analysis
├── 03_modelling.ipynb        # Notebook pelatihan model deteksi defect
├── 04_clustering.ipynb       # Notebook pelatihan model clustering
├── selected_features.txt     # Daftar fitur terpilih untuk model
└── netlify.toml              # Konfigurasi deploy frontend
```

---

## Petunjuk Setup Environment

### Prasyarat

- Python 3.11
- Node.js 18+
- Anaconda (opsional, direkomendasikan)

### 1. Clone Repository

```bash
git clone https://github.com/dwicahyanidesri-blip/project_pjkgm016.git
cd project_pjkgm016
```

### 2. Setup Backend

```bash
cd backend
pip install -r requirements.txt
```

Salin file template environment dan isi dengan API key Hugging Face kamu:

```bash
cp .env.example .env
```

Isi file `.env` dengan API key kamu:

```
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Catatan:** File `.env` tidak boleh di-push ke GitHub. Pastikan sudah tercantum di `.gitignore`.

Jalankan backend:

```bash
uvicorn main:app --reload --port 8000
```

Backend akan berjalan di `http://localhost:8000`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

---

## Tautan Model AI / ML

Model-model ML yang digunakan tersimpan di folder `models/`. Untuk mengunduh model versi lengkap, akses melalui tautan Google Drive berikut:

**Link Model:** [https://drive.google.com/drive/folders/1yQEF95sAHMXZ-lnpcIPmn4R1nUfyR1Ih?usp=sharing](https://drive.google.com/drive/folders/1yQEF95sAHMXZ-lnpcIPmn4R1nUfyR1Ih?usp=sharing)

Setelah diunduh, letakkan seluruh file model ke dalam folder `models/` di root project.

Model yang digunakan:
| File | Deskripsi |
|------|-----------|
| `random_forest_defect_model.joblib` | Model utama deteksi defect (Random Forest) |
| `gradient_boosting_defect_model.joblib` | Model alternatif deteksi defect (Gradient Boosting) |
| `isolation_forest_defect_model.joblib` | Model deteksi anomali (Isolation Forest) |
| `kmeans_model.pkl` | Model clustering batch (K-Means) |
| `pca_2d_model.pkl` | Model reduksi dimensi 2D (PCA) |
| `pca_3d_model.pkl` | Model reduksi dimensi 3D (PCA) |
| `scaler.joblib` | Scaler untuk normalisasi data prediksi |
| `scaler_clustering.pkl` | Scaler untuk normalisasi data clustering |
| `label_encoders.joblib` | Encoder untuk fitur kategorikal |
| `feature_columns.joblib` | Daftar kolom fitur yang digunakan model |

---

## Cara Menjalankan Aplikasi

### Langkah 1 — Jalankan Notebook Pipeline (Opsional)

Jika ingin melatih ulang model dari data mentah, jalankan notebook secara berurutan:

```
01_preprocessing.ipynb  →  02_eda.ipynb  →  03_modelling.ipynb  →  04_clustering.ipynb
```

Output berupa file CSV dan model akan tersimpan otomatis ke folder `outputs/` dan `models/`.

### Langkah 2 — Jalankan Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Langkah 3 — Jalankan Frontend

```bash
cd frontend
npm run dev
```

### Langkah 4 — Akses Aplikasi

Buka browser dan akses `http://localhost:5173`, lalu upload file dataset Excel (`.xlsx`) untuk mulai menggunakan aplikasi.

---

## Dependensi

### Backend (Python)

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.4.2
joblib==1.4.2
openpyxl==3.1.2
httpx==0.27.0
python-dotenv==1.0.1
```

### Frontend (Node.js)

```
react@^18.3.1
react-dom@^18.3.1
react-router-dom@^6.23.1
recharts@^2.12.7
lucide-react@^0.383.0
axios@^1.7.2
tailwindcss@^3.4.4
vite@^5.2.13
```

---

## Tim Pengembang

**Capstone Project PJK-GM016**
Pijak x IBM SkillsBuild 2026
