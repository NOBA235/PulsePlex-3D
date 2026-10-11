"""
FastAPI Server for Multimodal AI Hackathon 2026 - Track A:
Cardiovascular Risk Visualization & Multi-Vessel Stenosis Prediction.
"""

import os
import sys
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib

# Ensure pipeline is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIPELINE_DIR = os.path.join(BASE_DIR, "pipeline")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if PIPELINE_DIR not in sys.path:
    sys.path.insert(0, PIPELINE_DIR)

from pipeline.preprocess import ClinicalDataPreprocessor
sys.modules['preprocess'] = sys.modules['pipeline.preprocess']

from pipeline.explain import get_shap_engine, CLINICAL_FEATURE_LABELS

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "preprocessor.pkl")

app = FastAPI(
    title="Cardiovascular Risk & Multi-Vessel Stenosis AI API",
    description="Multi-vessel coronary artery stenosis prediction and SHAP explainability engine.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model cache
models = {}
preprocessor = None
shap_engine = None


@app.on_event("startup")
def load_artifacts():
    global models, preprocessor, shap_engine
    print("[FastAPI] Initializing ML models and explainability engine...")
    if os.path.exists(PREPROCESSOR_PATH):
        preprocessor = joblib.load(PREPROCESSOR_PATH)
        print("[FastAPI] Preprocessor loaded successfully.")

    for target in ['cad', 'lad', 'lcx', 'rca']:
        m_path = os.path.join(MODELS_DIR, f"{target}_model.pkl")
        if os.path.exists(m_path):
            models[target.upper()] = joblib.load(m_path)
            print(f"[FastAPI] Loaded model for {target.upper()}")

    shap_engine = get_shap_engine()
    print("[FastAPI] All models and SHAP engine ready.")


class PatientInput(BaseModel):
    # Demographics
    Age: float = Field(default=55.0, ge=18, le=100, description="Age in years")
    Sex: str = Field(default="Male", description="'Male' or 'Female'")
    Weight: float = Field(default=75.0, ge=30, le=200, description="Weight in kg")
    Length: float = Field(default=170.0, ge=120, le=220, description="Height in cm")
    BMI: Optional[float] = Field(default=None, description="Body Mass Index (auto-calculated if None)")

    # Medical History & Risk Factors
    DM: int = Field(default=0, ge=0, le=1, description="Diabetes Mellitus (0 or 1)")
    HTN: int = Field(default=1, ge=0, le=1, description="Hypertension (0 or 1)")
    Current_Smoker: int = Field(default=1, alias="Current Smoker", ge=0, le=1, description="Current Smoker (0 or 1)")
    EX_Smoker: int = Field(default=0, alias="EX-Smoker", ge=0, le=1, description="Ex-Smoker (0 or 1)")
    FH: int = Field(default=0, ge=0, le=1, description="Family History of CAD (0 or 1)")
    Obesity: str = Field(default="N", description="'Y' or 'N'")
    CRF: str = Field(default="N", description="Chronic Renal Failure ('Y' or 'N')")
    CVA: str = Field(default="N", description="Stroke / CVA ('Y' or 'N')")
    Airway_disease: str = Field(default="N", alias="Airway disease", description="'Y' or 'N'")
    Thyroid_Disease: str = Field(default="N", alias="Thyroid Disease", description="'Y' or 'N'")
    CHF: str = Field(default="N", description="Congestive Heart Failure ('Y' or 'N')")
    DLP: str = Field(default="Y", description="Dyslipidemia ('Y' or 'N')")

    # Vital Signs & Physical Examination
    BP: float = Field(default=130.0, ge=80, le=250, description="Systolic Blood Pressure (mmHg)")
    PR: float = Field(default=76.0, ge=40, le=180, description="Pulse Rate (bpm)")
    Edema: int = Field(default=0, ge=0, le=1, description="Peripheral Edema (0 or 1)")
    Weak_Peripheral_Pulse: str = Field(default="N", alias="Weak Peripheral Pulse", description="'Y' or 'N'")
    Lung_rales: str = Field(default="N", alias="Lung rales", description="'Y' or 'N'")
    Systolic_Murmur: str = Field(default="N", alias="Systolic Murmur", description="'Y' or 'N'")
    Diastolic_Murmur: str = Field(default="N", alias="Diastolic Murmur", description="'Y' or 'N'")

    # Symptoms
    Typical_Chest_Pain: int = Field(default=1, alias="Typical Chest Pain", ge=0, le=1, description="Typical Anginal Pain (0 or 1)")
    Dyspnea: str = Field(default="N", description="'Y' or 'N'")
    Function_Class: int = Field(default=0, alias="Function Class", ge=0, le=4, description="NYHA Class (0-4)")
    Atypical: str = Field(default="N", description="'Y' or 'N'")
    Nonanginal: str = Field(default="N", description="'Y' or 'N'")
    Exertional_CP: str = Field(default="N", alias="Exertional CP", description="'Y' or 'N'")
    LowTH_Ang: str = Field(default="N", alias="LowTH Ang", description="'Y' or 'N'")

    # ECG Findings
    Q_Wave: int = Field(default=0, alias="Q Wave", ge=0, le=1, description="Pathological Q wave (0 or 1)")
    St_Elevation: int = Field(default=0, alias="St Elevation", ge=0, le=1, description="ST Elevation (0 or 1)")
    St_Depression: int = Field(default=1, alias="St Depression", ge=0, le=1, description="ST Depression (0 or 1)")
    Tinversion: int = Field(default=1, ge=0, le=1, description="T-wave inversion (0 or 1)")
    LVH: str = Field(default="N", description="Left Ventricular Hypertrophy ('Y' or 'N')")
    Poor_R_Progression: str = Field(default="N", alias="Poor R Progression", description="'Y' or 'N'")
    BBB: str = Field(default="N", description="'N', 'LBBB', or 'RBBB'")

    # Laboratory Biomarkers
    FBS: float = Field(default=110.0, ge=50, le=500, description="Fasting Blood Sugar (mg/dL)")
    CR: float = Field(default=1.0, ge=0.3, le=10.0, description="Creatinine (mg/dL)")
    TG: float = Field(default=180.0, ge=40, le=1000, description="Triglycerides (mg/dL)")
    LDL: float = Field(default=140.0, ge=30, le=400, description="LDL Cholesterol (mg/dL)")
    HDL: float = Field(default=38.0, ge=10, le=120, description="HDL Cholesterol (mg/dL)")
    BUN: float = Field(default=18.0, ge=2, le=100, description="Blood Urea Nitrogen (mg/dL)")
    ESR: float = Field(default=14.0, ge=1, le=120, description="ESR (mm/h)")
    HB: float = Field(default=14.2, ge=6, le=22, description="Hemoglobin (g/dL)")
    K: float = Field(default=4.3, ge=2.5, le=7.0, description="Potassium (mEq/L)")
    Na: float = Field(default=140.0, ge=115, le=165, description="Sodium (mEq/L)")
    WBC: float = Field(default=6800.0, ge=2000, le=30000, description="WBC count (/mcL)")
    Lymph: float = Field(default=32.0, ge=5, le=80, description="Lymphocyte %")
    Neut: float = Field(default=60.0, ge=10, le=95, description="Neutrophil %")
    PLT: float = Field(default=220.0, ge=50, le=800, description="Platelets (10^3/mcL)")

    # Echocardiography
    EF_TTE: float = Field(default=45.0, alias="EF-TTE", ge=15, le=75, description="Ejection Fraction (%)")
    Region_RWMA: int = Field(default=1, alias="Region RWMA", ge=0, le=4, description="Regional Wall Motion Abnormality score (0-4)")
    VHD: str = Field(default="N", description="'N', 'mild', 'Moderate', or 'Severe'")

    class Config:
        populate_by_name = True


def get_risk_category(prob: float) -> Dict[str, str]:
    """
    Classifies risk based on prompt requirements:
    - Low Risk (<30%): Green (#22c55e)
    - Moderate Risk (30% - 60%): Yellow (#eab308)
    - High Risk (>60%): Red (#ef4444)
    """
    if prob < 0.30:
        return {"category": "Low", "color": "#22c55e", "code": "LOW"}
    elif prob <= 0.60:
        return {"category": "Moderate", "color": "#eab308", "code": "MODERATE"}
    else:
        return {"category": "High", "color": "#ef4444", "code": "HIGH"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Cardiovascular Risk Prediction & 3D Visualization Backend",
        "version": "1.0.0",
        "models_loaded": list(models.keys()),
        "preprocessor_ready": preprocessor is not None,
        "shap_ready": shap_engine is not None,
        "vessels_tracked": ["LAD", "LCX", "RCA"]
    }


@app.get("/metrics")
def get_metrics():
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=404, detail="Metrics file not found. Run training pipeline first.")
    with open(METRICS_PATH, "r") as f:
        metrics = json.load(f)
    return metrics


@app.get("/sample-patients")
def get_sample_patients():
    """
    Returns pre-configured clinical test profiles:
    - Low Risk Profile
    - Single-Vessel LAD CAD
    - Multi-Vessel CAD (Triple Vessel Disease)
    - Moderate Risk RCA Profile
    """
    samples = [
        {
            "id": "sample-low-risk",
            "name": "Profile A: Low Cardiovascular Risk (Female, 42y)",
            "description": "Younger female with normal lipid profile, preserved ejection fraction, no anginal symptoms, and no ECG ischemia.",
            "data": {
                "Age": 42,
                "Sex": "Female",
                "Weight": 62,
                "Length": 165,
                "BMI": 22.77,
                "DM": 0,
                "HTN": 0,
                "Current Smoker": 0,
                "EX-Smoker": 0,
                "FH": 0,
                "Obesity": "N",
                "CRF": "N",
                "CVA": "N",
                "Airway disease": "N",
                "Thyroid Disease": "N",
                "CHF": "N",
                "DLP": "N",
                "BP": 115,
                "PR": 68,
                "Edema": 0,
                "Weak Peripheral Pulse": "N",
                "Lung rales": "N",
                "Systolic Murmur": "N",
                "Diastolic Murmur": "N",
                "Typical Chest Pain": 0,
                "Dyspnea": "N",
                "Function Class": 0,
                "Atypical": "N",
                "Nonanginal": "N",
                "Exertional CP": "N",
                "LowTH Ang": "N",
                "Q Wave": 0,
                "St Elevation": 0,
                "St Depression": 0,
                "Tinversion": 0,
                "LVH": "N",
                "Poor R Progression": "N",
                "BBB": "N",
                "FBS": 88,
                "CR": 0.8,
                "TG": 110,
                "LDL": 85,
                "HDL": 55,
                "BUN": 12,
                "ESR": 6,
                "HB": 13.5,
                "K": 4.2,
                "Na": 140,
                "WBC": 5500,
                "Lymph": 36,
                "Neut": 54,
                "PLT": 230,
                "EF-TTE": 60,
                "Region RWMA": 0,
                "VHD": "N"
            }
        },
        {
            "id": "sample-single-lad",
            "name": "Profile B: Single-Vessel CAD (LAD Stenosis, 54y)",
            "description": "Male patient presenting with typical chest pain, anterior ST-depression, elevated LDL, and moderate ejection fraction reduction.",
            "data": {
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
        },
        {
            "id": "sample-triple-vessel",
            "name": "Profile C: Multi-Vessel CAD (Triple Vessel Disease, 68y)",
            "description": "Older patient with long-standing diabetes, severe hypertension, multi-lead ECG ischemia, low EF (35%), and extensive wall motion abnormalities.",
            "data": {
                "Age": 68,
                "Sex": "Male",
                "Weight": 88,
                "Length": 168,
                "BMI": 31.18,
                "DM": 1,
                "HTN": 1,
                "Current Smoker": 1,
                "EX-Smoker": 0,
                "FH": 1,
                "Obesity": "Y",
                "CRF": "N",
                "CVA": "N",
                "Airway disease": "N",
                "Thyroid Disease": "N",
                "CHF": "N",
                "DLP": "Y",
                "BP": 160,
                "PR": 88,
                "Edema": 1,
                "Weak Peripheral Pulse": "Y",
                "Lung rales": "N",
                "Systolic Murmur": "N",
                "Diastolic Murmur": "N",
                "Typical Chest Pain": 1,
                "Dyspnea": "Y",
                "Function Class": 2,
                "Atypical": "N",
                "Nonanginal": "N",
                "Exertional CP": "N",
                "LowTH Ang": "N",
                "Q Wave": 1,
                "St Elevation": 0,
                "St Depression": 1,
                "Tinversion": 1,
                "LVH": "Y",
                "Poor R Progression": "Y",
                "BBB": "N",
                "FBS": 185,
                "CR": 1.5,
                "TG": 290,
                "LDL": 178,
                "HDL": 28,
                "BUN": 28,
                "ESR": 25,
                "HB": 12.8,
                "K": 4.8,
                "Na": 138,
                "WBC": 9100,
                "Lymph": 22,
                "Neut": 72,
                "PLT": 290,
                "EF-TTE": 35,
                "Region RWMA": 4,
                "VHD": "mild"
            }
        },
        {
            "id": "sample-moderate-rca",
            "name": "Profile D: Moderate Risk (Inferior Ischemia / RCA Stenosis, 60y)",
            "description": "Patient with exertional chest tightness, borderline hypertension, dyslipidemia, and localized inferior wall changes.",
            "data": {
                "Age": 60,
                "Sex": "Male",
                "Weight": 76,
                "Length": 170,
                "BMI": 26.3,
                "DM": 0,
                "HTN": 1,
                "Current Smoker": 0,
                "EX-Smoker": 1,
                "FH": 1,
                "Obesity": "N",
                "CRF": "N",
                "CVA": "N",
                "Airway disease": "N",
                "Thyroid Disease": "N",
                "CHF": "N",
                "DLP": "Y",
                "BP": 140,
                "PR": 72,
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
                "Tinversion": 0,
                "LVH": "N",
                "Poor R Progression": "N",
                "BBB": "N",
                "FBS": 105,
                "CR": 0.9,
                "TG": 160,
                "LDL": 130,
                "HDL": 42,
                "BUN": 15,
                "ESR": 12,
                "HB": 14.8,
                "K": 4.4,
                "Na": 142,
                "WBC": 6400,
                "Lymph": 34,
                "Neut": 58,
                "PLT": 215,
                "EF-TTE": 50,
                "Region RWMA": 1,
                "VHD": "N"
            }
        }
    ]
    return samples


@app.post("/predict")
def predict_cardio_risk(patient: PatientInput):
    """
    Accepts patient features, returns:
    1. Overall CAD Status & Probability
    2. LAD, LCX, RCA Vessel Stenosis Probabilities & Dynamic Colors
    3. Top Local SHAP Attributions for the patient
    4. Multi-Vessel Involvement Classification
    """
    if preprocessor is None or 'CAD' not in models:
        raise HTTPException(status_code=503, detail="Models are not initialized yet.")

    # Convert patient Pydantic to raw dict
    raw_dict = patient.model_dump(by_alias=True)

    # Auto-calculate BMI if not supplied or 0
    if not raw_dict.get('BMI') or raw_dict.get('BMI') == 0:
        height_m = raw_dict['Length'] / 100.0
        raw_dict['BMI'] = round(raw_dict['Weight'] / (height_m * height_m), 2)

    # Convert to DataFrame
    df_raw = pd.DataFrame([raw_dict])

    # Transform using fitted preprocessor
    try:
        X_proc = preprocessor.transform(df_raw, scale=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing error: {str(e)}")

    # 1. Predictions for CAD and each Vessel
    predictions = {}
    vessel_data = {}
    vessels = ['LAD', 'LCX', 'RCA']

    # CAD Overall Status
    cad_prob = float(models['CAD'].predict_proba(X_proc)[0, 1])
    cad_risk = get_risk_category(cad_prob)
    cad_pred = "CAD" if cad_prob >= 0.50 else "Normal"

    # Individual Vessels
    stenotic_vessel_count = 0
    for v in vessels:
        prob = float(models[v].predict_proba(X_proc)[0, 1])
        risk_info = get_risk_category(prob)
        is_stenotic = prob >= 0.50
        if is_stenotic:
            stenotic_vessel_count += 1

        vessel_data[v] = {
            "vessel": v,
            "probability": round(prob, 4),
            "stenosis_percentage": round(prob * 100, 1),
            "risk_category": risk_info["category"],
            "risk_code": risk_info["code"],
            "color": risk_info["color"],
            "stenotic": is_stenotic,
            "anatomical_territory": {
                "LAD": "Anterior Wall & Interventricular Septum (Apex)",
                "LCX": "Lateral and Posterior Ventricular Wall",
                "RCA": "Inferior Wall, Right Ventricle & Sinoatrial Node"
            }.get(v, "Coronary Territory")
        }

    # 2. SHAP Explainability for CAD and Vessels
    shap_explanations = {}
    try:
        for target_key in ['CAD', 'LAD', 'LCX', 'RCA']:
            exp = shap_engine.explain_patient(X_proc, target=target_key, top_n=8)
            shap_explanations[target_key] = exp
    except Exception as e:
        print(f"[SHAP Warning] Explainability generation failed: {e}")
        shap_explanations = {}

    # Multi-vessel classification summary
    if stenotic_vessel_count == 0:
        vascular_pattern = "No Significant Epicardial Stenosis Predicted"
    elif stenotic_vessel_count == 1:
        stenotic_names = [v for v in vessels if vessel_data[v]["stenotic"]]
        vascular_pattern = f"Single-Vessel Disease ({', '.join(stenotic_names)})"
    elif stenotic_vessel_count == 2:
        stenotic_names = [v for v in vessels if vessel_data[v]["stenotic"]]
        vascular_pattern = f"Double-Vessel Disease ({' + '.join(stenotic_names)})"
    else:
        vascular_pattern = "Triple-Vessel Disease (High-Risk Multi-Vessel CAD)"

    return {
        "cad_status": cad_pred,
        "cad_probability": round(cad_prob, 4),
        "cad_percentage": round(cad_prob * 100, 1),
        "cad_risk_category": cad_risk["category"],
        "cad_risk_color": cad_risk["color"],
        "vessels": vessel_data,
        "stenotic_vessels_count": stenotic_vessel_count,
        "vascular_pattern": vascular_pattern,
        "shap_explanations": shap_explanations,
        "patient_summary": {
            "age": patient.Age,
            "sex": patient.Sex,
            "typical_chest_pain": bool(patient.Typical_Chest_Pain),
            "ef_tte": patient.EF_TTE,
            "st_depression": bool(patient.St_Depression),
            "bp": patient.BP
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
