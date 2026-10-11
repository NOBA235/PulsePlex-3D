# CardioRisk AI: Multi-Vessel Coronary Stenosis Prediction & Interactive 3D Risk Mapping
### Multimodal AI Hackathon 2026 — Track A: Cardiovascular Risk Visualization & Prediction

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)](https://threejs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-eb6434?logo=xgboost)](https://xgboost.ai)
[![SHAP](https://img.shields.io/badge/Explainability-SHAP%20TreeExplainer-ff69b4)](https://shap.readthedocs.io)
[![UCI Dataset](https://img.shields.io/badge/Dataset-UCI%20Z--Alizadeh%20Sani-blue)](https://archive.ics.uci.edu/dataset/411/extension+of+z+alizadeh+sani+dataset)

---

## 1. System Overview & Architecture

**CardioRisk AI** is an end-to-end clinical decision-support and 3D visual mapping system designed for multi-vessel coronary artery disease (CAD) risk assessment and artery-specific stenosis prediction.

The platform bridges gradient-boosted machine learning, game-engine-grade WebGL rendering, and local game-theoretic feature attributions (SHAP) to transform complex clinical vectors (demographics, vital signs, ECG waveforms, echocardiography, and laboratory biomarkers) into an interpretable, spatial 3D coronary vascular map.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CardioRisk AI Architecture                           │
└──────────────────────────────────────────────────────────────────────────────────┘
                 
      [ Clinical Inputs & Patient Sliders ]
       (Demographics, Vitals, ECG, Echo, Lab Markers)
                       │
                       ▼
       ┌───────────────────────────────┐
       │   FastAPI ML Backend (:8000)   │
       └───────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
  [ 4x XGBoost Models ]         [ SHAP TreeExplainer ]
  - Overall CAD Status          - Local feature attribution
  - LAD Stenosis (>50%)         - Positive risk drivers
  - LCX Stenosis (>50%)         - Negative protective factors
  - RCA Stenosis (>50%)
       │                               │
       └───────────────┬───────────────┘
                       │ JSON Payload (Probabilities, Attributions, Colors)
                       ▼
       ┌───────────────────────────────┐
       │     React + Vite Frontend     │
       │           (:5173)             │
       └───────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
  [ React Three Fiber 3D Scene ]   [ Clinical Dashboard UI ]
  - Anatomical ventricular base    - Overall CAD probability gauge
  - Dynamic coronary artery tubes  - Multi-vessel involvement badge
    • LAD: Anterior wall           - Diverging SHAP waterfall chart
    • LCX: Lateral/posterior       - Empirical validation metrics table
    • RCA: Inferior/acute margin   - Regulatory safety disclaimer
  - Color interpolation:
    • Green (<30% Low Risk)
    • Yellow (30-60% Moderate)
    • Red (>60% High Risk)
  - Raycasting hover/click tooltips
  - Anatomical camera view controls
```

---

## 2. Machine Learning Pipeline & Leakage Prevention

### Target Leakage Prevention (Strict Exclusion)
In accordance with clinical protocol and ML validation standards on the **UCI Z-Alizadeh Sani Extended Dataset** (303 records, 59 attributes):
- **EXCLUDED FROM INPUT FEATURES:** `Cath`, `LAD`, `LCX`, and `RCA`.
- In angiography, `Cath` represents the post-catheterization diagnosis and `LAD`, `LCX`, `RCA` represent post-catheterization vessel-level diameter narrowing. Including any of these variables in the input matrix causes target leakage.
- Input feature vectors consist purely of non-invasive pre-catheterization diagnostic inputs (55 clinical variables + one-hot encodings = 60 feature matrix).

### Empirical Model Performance Table
Models were trained using stratified splits (80/20 train/test) and evaluated with 5-fold stratified cross-validation on the Z-Alizadeh Sani dataset:

| Target Endpoint | Task Type | Accuracy | Precision | Recall | F1-Score | ROC-AUC | 5-Fold CV ROC | Positive Class Ratio |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Overall CAD Status** | Binary (`Cath` CAD vs Normal) | **83.61%** | **85.11%** | **93.02%** | **0.8889** | **0.8488** | **0.9137** | 71.29% |
| **LAD Stenosis (>50%)** | Left Anterior Descending Artery | **75.41%** | **78.38%** | **80.56%** | **0.7945** | **0.8289** | **0.8430** | 58.42% |
| **LCX Stenosis (>50%)** | Left Circumflex Artery | **67.21%** | **61.11%** | **45.83%** | **0.5238** | **0.7568** | **0.7271** | 39.27% |
| **RCA Stenosis (>50%)** | Right Coronary Artery | **75.41%** | **78.57%** | **47.83%** | **0.5946** | **0.7666** | **0.7223** | 37.62% |

*All metrics are automatically logged and serialized to `backend/models/metrics.json`.*

---

## 3. Explainability Engine (SHAP)

For each patient assessment, `shap.TreeExplainer` computes exact local Shapley values $\phi_i$ across all 60 input features:

$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i$$

Where:
- $\phi_0$ is the base expected value.
- Positive $\phi_i > 0$ denotes features escalating the risk of coronary stenosis (e.g. *Typical Anginal Chest Pain*, *ST Depression*, *Low Ejection Fraction*, *Elevated LDL*).
- Negative $\phi_i < 0$ denotes protective clinical factors dampening risk (e.g. *High HDL*, *Preserved Ejection Fraction*, *Absence of Angina*).
- Features are mapped to descriptive clinical nomenclature and visualized via a responsive horizontal diverging bar chart.

---

## 4. Interactive 3D Hemodynamic Risk Mapping

The 3D cardiac viewer leverages **React Three Fiber** and **Three.js** to project predicted stenosis risks directly onto anatomical coronary trajectories:

1. **Vessel Trajectories & Geometry:**
   - **LAD (Left Anterior Descending):** Descends anteriorly from the aortic root along the interventricular groove to the apex.
   - **LCX (Left Circumflex):** Traverses the left atrioventricular groove posterolaterally around the obtuse margin.
   - **RCA (Right Coronary Artery):** Encircles the right atrioventricular sulcus towards the inferior crux and posterior descending artery.
2. **Dynamic Risk Color Coding:**
   - **Low Risk (<30%):** `#22c55e` (Emerald Green)
   - **Moderate Risk (30% - 60%):** `#eab308` (Amber Yellow)
   - **High Risk (>60%):** `#ef4444` (Vibrant Red)
3. **Pulsatile Feedback & Stenosis Warnings:**
   - Realistic dual-pulse cardiac cycle animation (systolic contraction and diastolic relaxation).
   - High-risk / stenotic vessels display an emissive glow and pulsating warning wireframe halos.
4. **Camera Controls & Raycasting:**
   - Anatomical view buttons: **Anterior (LAD)**, **Lateral (LCX)**, **Right/Inferior (RCA)**, and **Reset Camera**.
   - Raycasting hover & click events on vessel landmark nodes trigger floating HTML risk inspection cards with anatomical territory descriptions.

---

## 5. Directory Structure

```
cardio-risk-ai/
├── backend/
│   ├── data/
│   │   ├── z_alizadeh_sani_extended.xlsx # Original UCI/Mendeley dataset
│   │   └── z_alizadeh_sani_extended.csv  # 303 records, 59 attributes
│   ├── models/
│   │   ├── cad_model.pkl                 # Trained XGBoost model for CAD
│   │   ├── lad_model.pkl                 # Trained model for LAD Stenosis
│   │   ├── lcx_model.pkl                 # Trained model for LCX Stenosis
│   │   ├── rca_model.pkl                 # Trained model for RCA Stenosis
│   │   ├── preprocessor.pkl              # Fitted clinical data preprocessor
│   │   └── metrics.json                  # Out-of-sample & 5-fold CV metrics
│   ├── pipeline/
│   │   ├── preprocess.py                 # Feature engineering & leakage prevention
│   │   ├── train.py                      # Multi-target training & evaluation
│   │   ├── explain.py                    # SHAP TreeExplainer attribution engine
│   │   └── generate_glb.py               # Standalone GLTF/GLB heart generator
│   ├── main.py                           # FastAPI server & endpoints
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── models/
│   │       └── heart.glb                 # Binary GLTF heart mesh
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas3D.tsx              # Three.js / R3F WebGL viewport
│   │   │   ├── HeartMesh.tsx             # Procedural cardiac mesh & vessel tubes
│   │   │   ├── Dashboard.tsx             # Risk gauges, metrics & SHAP charts
│   │   │   └── InputForm.tsx             # Interactive sliders, tabs & presets
│   │   ├── services/
│   │   │   └── api.ts                    # Type-safe API client for backend
│   │   ├── App.tsx                       # Main layout & disclaimer footer
│   │   ├── main.tsx                      # React root
│   │   └── index.css                     # Tailwind CSS styles
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## 6. Step-by-Step Local Setup & Execution

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** v18 or higher (Node v20+ recommended)
- **Git** (optional)

---

### Step 1: Backend Setup & Launch

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. (Optional) Re-run model training and metrics logging:
   ```bash
   python pipeline/train.py
   ```

5. Launch the FastAPI backend server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. Verify that the backend is running:
   - Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
   - Interactive Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Model Metrics: [http://127.0.0.1:8000/metrics](http://127.0.0.1:8000/metrics)

---

### Step 2: Frontend Setup & Launch

1. Open a second terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

---

## 7. API Endpoints Specification

| Method | Endpoint | Description | Sample Output |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server status, loaded models, tracked arteries | `{"status": "healthy", "models_loaded": ["CAD", "LAD", "LCX", "RCA"]}` |
| `GET` | `/metrics` | Validation metrics (Accuracy, F1, ROC-AUC) for all 4 models | `{"CAD": {"accuracy": 0.8361, "roc_auc": 0.8488, ...}}` |
| `GET` | `/sample-patients` | Pre-configured authentic clinical profiles (Low Risk, Single LAD, Triple Vessel) | `[{"id": "sample-single-lad", "name": "...", "data": {...}}]` |
| `POST` | `/predict` | Ingests patient features; outputs probabilities, colors, SHAP attributions | `{"cad_status": "CAD", "vessels": {"LAD": {"probability": 0.98, ...}}, ...}` |

---

## 8. Safety & Regulatory Disclaimer

> [!CAUTION]
> **Notice:** Predictions and visualizations generated by this system are strictly for educational and decision-support purposes only. They do not replace formal diagnostic imaging (coronary computed tomography angiography, invasive coronary angiography) or clinical evaluations conducted by licensed medical practitioners.

