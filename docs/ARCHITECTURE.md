# PulsePlex: System Architecture & Data Flow

This document details the end-to-end technical architecture, system components, communication protocols, and runtime data flow of the **PulsePlex** cardiovascular decision-support platform.

---

## 1. High-Level System Architecture

PulsePlex is architected as a decoupled, asynchronous client-server application optimized for real-time inference and responsive client-side WebGL rendering without dedicated GPU requirements.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PULSEPLEX SYSTEM TOPOLOGY                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ Client Web Browser ]                                            [ FastAPI Backend Server ]
   (React 18 + Three.js + Vite)                                       (Python 3.13 + Uvicorn)
   Port: 5173                                                        Port: 8000
        │                                                                 │
        │─── 1. HTTP GET /health ────────────────────────────────────────►│ Health Check & Status
        │◄── (Status: Healthy, Models: CAD, LAD, LCX, RCA) ───────────────│
        │                                                                 │
        │─── 2. HTTP GET /metrics ───────────────────────────────────────►│ Read metrics.json
        │◄── (Accuracy, F1, ROC-AUC, 5-Fold CV Scores) ───────────────────│
        │                                                                 │
        │─── 3. HTTP GET /sample-patients ───────────────────────────────►│ Fetch Reference Profiles
        │◄── (Authentic UCI Z-Alizadeh Sani Cohort Vectors) ─────────────│
        │                                                                 │
        │─── 4. HTTP POST /predict (JSON: 55 Patient Features) ──────────►│
        │                                                                 │ ┌─────────────────────────┐
        │                                                                 ├─┤ Feature Preprocessor    │
        │                                                                 │ │ (Scalers & Encoders)    │
        │                                                                 │ └───────────┬─────────────┘
        │                                                                 │             ▼
        │                                                                 │ ┌─────────────────────────┐
        │                                                                 ├─┤ 4x XGBoost Models       │
        │                                                                 │ │ (CAD, LAD, LCX, RCA)    │
        │                                                                 │ └───────────┬─────────────┘
        │                                                                 │             ▼
        │                                                                 │ ┌─────────────────────────┐
        │                                                                 ├─┤ SHAP TreeExplainer      │
        │                                                                 │ │ (Exact Shapley Values)  │
        │                                                                 │ └───────────┬─────────────┘
        │                                                                 │             ▼
        │                                                                 │ ┌─────────────────────────┐
        │                                                                 ├─┤ SCCT CAD-RADS™ 2.0 Engine│
        │                                                                 │ └─────────────────────────┘
        │◄── 5. Response Payload (Probabilities, Attributions, Colors) ───┤
        │
   [ Reactive UI State Updates ]
   ├──► 3D Cardiac WebGL Canvas (Coronary Tube Colors & Emissive Shader Glows)
   ├──► Real-Time Lead II ECG Canvas (Morphs ST/T waves according to inputs)
   ├──► Clinical Risk Gauges & CAD-RADS Badge
   ├──► SHAP Diverging Horizontal Waterfall Chart
   ├──► What-If Counterfactual Intervention Delta Engine
   └──► Multimodal ACC/AHA Clinical Consultation Report Generator
```

---

## 2. Component Breakdown

### 2.1 Backend Services (`backend/`)
- **`main.py`**:
  - FastAPI application entry point with CORS middleware configuration.
  - Lifecycle startup event caches serialized model binaries, scalers, and SHAP explainers in memory.
  - Endpoints:
    - `GET /health`: Operational telemetry, loaded model registry, and preprocessor status.
    - `GET /metrics`: Out-of-sample benchmark statistics and 5-fold cross-validation metrics.
    - `GET /sample-patients`: Benchmark patient vectors representing diverse clinical archetypes.
    - `POST /predict`: Real-time multi-target inference and local SHAP feature attribution generation.
- **`pipeline/preprocess.py`**:
  - Robust clinical data cleaner and feature encoder.
  - Zero-leakage protocol enforcing strict omission of `Cath`, `LAD`, `LCX`, and `RCA` from feature matrix $X$.
  - Generates numerical scaling (`StandardScaler`) and multi-categorical one-hot encodings.
- **`pipeline/train.py`**:
  - Model training script utilizing Stratified Train/Test splits (80/20) and 5-Fold Stratified Cross-Validation.
  - Hyperparameter tuning for moderate sample medical tabular data ($n=303$).
  - Serializes model weights to `backend/models/*.pkl` and metrics to `metrics.json`.
- **`pipeline/explain.py`**:
  - Wraps `shap.TreeExplainer` around the fitted XGBoost estimators.
  - Computes exact Shapley values and translates raw clinical column names into physician-friendly nomenclature.
- **`pipeline/generate_glb.py`**:
  - Procedural binary GLTF/GLB asset generator creating mathematical anatomical cardiac body meshes.

### 2.2 Frontend Client Architecture (`frontend/src/`)
- **`App.tsx`**:
  - Top-level application orchestrator managing global patient state, prediction payloads, counterfactual overrides, and modal visibility.
  - Manages asynchronous polling and connection status to the FastAPI backend.
- **`components/Canvas3D.tsx` & `HeartMesh.tsx`**:
  - WebGL viewport built with **React Three Fiber** and **Three.js**.
  - Renders the ventricular myocardium, Left Main Trunk, LAD, LCX, and RCA trajectories using procedural Catmull-Rom cubic splines.
  - Implements the Wiggers cardiac contraction/relaxation cycle in `useFrame`.
  - Dynamically renders deployable platinum-chromium wireframe stent meshes upon PCI simulation.
- **`components/ECGMonitor.tsx`**:
  - HTML5 2D Canvas sweeping Lead II electrocardiogram tracing.
  - Procedurally modifies P, Q, R, S, T wave morphology in real time based on patient vitals (`St Depression`, `St Elevation`, `Tinversion`, `Q Wave`, and Heart Rate BPM).
- **`components/PlaqueCutawayModal.tsx`**:
  - CCTA cross-sectional vessel cutaway SVG visualizing adventitia, media, lipid core atheroma, and calcification.
  - Interactive balloon angioplasty and Drug-Eluting Stent (DES) deployment simulator restoring minimal lumen diameter and hemodynamic FFR.
- **`components/InterventionSimulator.tsx`**:
  - "What-If" Counterfactual treatment planning module modeling Guideline-Directed Medical Therapy (GDMT).
  - Toggles high-intensity statin protocols, antihypertensive management, and smoking cessation to compute real-time risk reduction deltas and NNT.
- **`components/ClinicalReportModal.tsx`**:
  - Multimodal hospital consultation summary generator adhering to ACC/AHA cardiology formatting.
  - Features clipboard export and dedicated `@media print` CSS for PDF output.
- **`components/Dashboard.tsx` & `InputForm.tsx`**:
  - Reactive input controls with slider throttling.
  - Recharts diverging waterfall visualization of SHAP attributions.

---

## 3. Communication Contracts (API Specification)

### 3.1 Patient Input Payload Schema (`POST /predict`)
```json
{
  "Age": 54,
  "Sex": "Male",
  "Weight": 82,
  "Length": 172,
  "BMI": 27.72,
  "DM": 0,
  "HTN": 1,
  "Current Smoker": 1,
  "EX-Smoker": 0,
  "FH": 0,
  "Obesity": "N",
  "CRF": "N",
  "CVA": "N",
  "Airway disease": "N",
  "Thyroid Disease": "N",
  "CHF": "N",
  "DLP": "Y",
  "BP": 135,
  "PR": 78,
  "Edema": 0,
  "Weak Peripheral Pulse": "N",
  "Lung rales": "N",
  "Systolic Murmur": "N",
  "Diastolic Murmur": "N",
  "Typical Chest Pain": 1,
  "Dyspnea": "N",
  "Function Class": 1,
  "Atypical": "N",
  "Nonanginal": "N",
  "Exertional CP": "N",
  "LowTH Ang": "N",
  "Q Wave": 0,
  "St Elevation": 0,
  "St Depression": 1,
  "Tinversion": 1,
  "LVH": "N",
  "Poor R Progression": "N",
  "BBB": "N",
  "FBS": 95,
  "CR": 1.0,
  "TG": 195,
  "LDL": 150,
  "HDL": 34,
  "BUN": 17,
  "ESR": 10,
  "HB": 14.5,
  "K": 4.6,
  "Na": 141,
  "WBC": 7200,
  "Lymph": 30,
  "Neut": 62,
  "PLT": 240,
  "EF-TTE": 45,
  "Region RWMA": 2,
  "VHD": "N"
}
```

### 3.2 Prediction Response Payload Schema
```json
{
  "cad_status": "CAD",
  "cad_probability": 0.9482,
  "cad_percentage": 94.8,
  "cad_risk_category": "High",
  "cad_risk_color": "#ef4444",
  "vessels": {
    "LAD": {
      "vessel": "LAD",
      "probability": 0.8801,
      "stenosis_percentage": 88.0,
      "risk_category": "High",
      "risk_code": "HIGH",
      "color": "#ef4444",
      "stenotic": true,
      "anatomical_territory": "Anterior Wall & Interventricular Septum (Apex)",
      "plaque_metrics": {
        "reference_diameter_mm": 3.6,
        "minimal_lumen_diameter_mm": 0.91,
        "minimal_lumen_area_mm2": 0.65,
        "hemodynamic_ffr_estimate": 0.61,
        "is_vulnerable_plaque": true
      }
    },
    "LCX": { ... },
    "RCA": { ... }
  },
  "stenotic_vessels_count": 2,
  "vascular_pattern": "Double-Vessel Disease (LAD + RCA)",
  "cad_rads": {
    "grade": "CAD-RADS 4A/V",
    "max_stenosis_percentage": 88.0,
    "description": "Severe 1-2 Vessel CAD (70-99% Stenosis) with High-Risk Features",
    "clinical_recommendation": "Cardiology consultation; recommend invasive angiography."
  },
  "total_plaque_volume_mm3": 335.0,
  "shap_explanations": {
    "CAD": {
      "target": "CAD",
      "predicted_probability": 0.9482,
      "base_value": 0.582,
      "top_features": [ ... ],
      "risk_drivers": [ ... ],
      "protective_factors": [ ... ]
    }
  }
}
```

---

## 4. Latency & Performance Profile
- **Client Render Loop:** Locked at 60 FPS across desktop and laptop integrated GPUs (Intel Iris Xe, Apple Silicon, AMD Radeon).
- **Inference Roundtrip:** Average **$55\text{ms} - 80\text{ms}$** on local development servers.
- **Memory Footprint:** Frontend client consumes $<110\text{ MB}$ RAM; Backend Python process consumes $<180\text{ MB}$ RAM.

