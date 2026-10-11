"""
SHAP Explainability Engine for Cardiovascular Risk Prediction.
Calculates local feature attributions using TreeExplainer for individual patient payloads.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap
from typing import Dict, Any, List

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# Human readable clinical descriptions and display names
CLINICAL_FEATURE_LABELS = {
    'Typical Chest Pain': 'Typical Anginal Chest Pain',
    'Age': 'Patient Age (years)',
    'Sex': 'Sex (Male)',
    'Weight': 'Weight (kg)',
    'Length': 'Height (cm)',
    'BMI': 'Body Mass Index (BMI)',
    'DM': 'Diabetes Mellitus',
    'HTN': 'Hypertension',
    'Current Smoker': 'Current Tobacco Smoker',
    'EX-Smoker': 'Former Smoker',
    'FH': 'Family History of CAD',
    'Obesity': 'Clinical Obesity',
    'CRF': 'Chronic Renal Failure',
    'CVA': 'Cerebrovascular Accident / Stroke',
    'Airway disease': 'Chronic Airway Disease',
    'Thyroid Disease': 'Thyroid Dysfunction',
    'CHF': 'Congestive Heart Failure',
    'DLP': 'Dyslipidemia (DLP)',
    'BP': 'Systolic Blood Pressure (mmHg)',
    'PR': 'Resting Pulse Rate (bpm)',
    'Edema': 'Peripheral Edema',
    'Weak Peripheral Pulse': 'Diminished Peripheral Pulse',
    'Lung rales': 'Pulmonary Rales (Crackles)',
    'Systolic Murmur': 'Systolic Heart Murmur',
    'Diastolic Murmur': 'Diastolic Heart Murmur',
    'Dyspnea': 'Exertional Dyspnea (Shortness of Breath)',
    'Function Class': 'NYHA Functional Class',
    'Atypical': 'Atypical Chest Pain',
    'Nonanginal': 'Non-anginal Chest Discomfort',
    'Exertional CP': 'Exertional Angina',
    'LowTH Ang': 'Low-threshold Angina',
    'Q Wave': 'Pathological Q Wave (ECG)',
    'St Elevation': 'ST-Segment Elevation (ECG)',
    'St Depression': 'ST-Segment Depression (ECG)',
    'Tinversion': 'T-Wave Inversion (ECG)',
    'LVH': 'Left Ventricular Hypertrophy',
    'Poor R Progression': 'Poor R-Wave Progression (ECG)',
    'FBS': 'Fasting Blood Sugar (mg/dL)',
    'CR': 'Serum Creatinine (mg/dL)',
    'TG': 'Serum Triglycerides (mg/dL)',
    'LDL': 'LDL Cholesterol (mg/dL)',
    'HDL': 'HDL Protective Cholesterol (mg/dL)',
    'BUN': 'Blood Urea Nitrogen (mg/dL)',
    'ESR': 'Erythrocyte Sedimentation Rate (mm/h)',
    'HB': 'Hemoglobin Level (g/dL)',
    'K': 'Serum Potassium (mEq/L)',
    'Na': 'Serum Sodium (mEq/L)',
    'WBC': 'White Blood Cell Count (/mcL)',
    'Lymph': 'Lymphocyte Percentage (%)',
    'Neut': 'Neutrophil Percentage (%)',
    'PLT': 'Platelet Count (10^3/mcL)',
    'EF-TTE': 'Left Ventricular Ejection Fraction (EF %)',
    'Region RWMA': 'Regional Wall Motion Abnormality (RWMA)',
    'BBB_N': 'Bundle Branch Block: Normal',
    'BBB_LBBB': 'Left Bundle Branch Block (LBBB)',
    'BBB_RBBB': 'Right Bundle Branch Block (RBBB)',
    'VHD_N': 'Valvular Disease: Normal',
    'VHD_mild': 'Mild Valvular Heart Disease',
    'VHD_Moderate': 'Moderate Valvular Heart Disease',
    'VHD_Severe': 'Severe Valvular Heart Disease'
}


class ShapExplainerEngine:
    def __init__(self):
        self.explainers = {}
        self.models = {}
        self.preprocessor = None
        self._load_resources()

    def _load_resources(self):
        prep_path = os.path.join(MODELS_DIR, "preprocessor.pkl")
        if os.path.exists(prep_path):
            self.preprocessor = joblib.load(prep_path)

        for target in ['cad', 'lad', 'lcx', 'rca']:
            model_path = os.path.join(MODELS_DIR, f"{target}_model.pkl")
            if os.path.exists(model_path):
                model = joblib.load(model_path)
                self.models[target.upper()] = model
                self.explainers[target.upper()] = shap.TreeExplainer(model)
                print(f"[ShapEngine] Loaded TreeExplainer for {target.upper()}")

    def explain_patient(self, transformed_row: pd.DataFrame, target: str = 'CAD', top_n: int = 10) -> Dict[str, Any]:
        """
        Calculates local SHAP feature attributions for a single patient record.
        Returns top risk-increasing and risk-decreasing features.
        """
        target = target.upper()
        if target not in self.explainers:
            raise ValueError(f"Target '{target}' not supported. Choose from {list(self.explainers.keys())}")

        explainer = self.explainers[target]
        model = self.models[target]

        # Calculate SHAP values
        raw_shap = explainer.shap_values(transformed_row)
        if isinstance(raw_shap, list):
            # Binary classification list format [class_0, class_1]
            values = np.array(raw_shap[1][0])
        elif len(raw_shap.shape) == 3:
            # (1, num_features, 2)
            values = raw_shap[0, :, 1]
        else:
            values = raw_shap[0]

        expected_val = explainer.expected_value
        if isinstance(expected_val, (list, np.ndarray)):
            base_value = float(expected_val[-1])
        else:
            base_value = float(expected_val)

        feature_names = transformed_row.columns.tolist()
        patient_feature_vals = transformed_row.iloc[0].to_dict()

        feature_impacts = []
        for name, shap_val in zip(feature_names, values):
            val_float = float(shap_val)
            original_val = patient_feature_vals.get(name, 0.0)
            feature_impacts.append({
                "feature": name,
                "display_name": CLINICAL_FEATURE_LABELS.get(name, name),
                "shap_value": round(val_float, 4),
                "patient_value": round(float(original_val), 2),
                "direction": "risk_factor" if val_float > 0 else "protective_factor",
                "abs_importance": abs(val_float)
            })

        # Sort by absolute impact
        feature_impacts.sort(key=lambda x: x["abs_importance"], reverse=True)

        top_features = feature_impacts[:top_n]
        risk_drivers = [f for f in feature_impacts if f["direction"] == "risk_factor"][:5]
        protective_factors = [f for f in feature_impacts if f["direction"] == "protective_factor"][:5]

        # Get predicted probability
        prob = float(model.predict_proba(transformed_row)[0, 1])

        return {
            "target": target,
            "predicted_probability": round(prob, 4),
            "base_value": round(base_value, 4),
            "top_features": top_features,
            "risk_drivers": risk_drivers,
            "protective_factors": protective_factors,
            "all_features_count": len(feature_impacts)
        }


# Global singleton instance
_engine_instance = None

def get_shap_engine() -> ShapExplainerEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ShapExplainerEngine()
    return _engine_instance


if __name__ == "__main__":
    from preprocess import load_and_preprocess_data
    X, _, _, _ = load_and_preprocess_data()
    engine = get_shap_engine()
    exp = engine.explain_patient(X.iloc[[0]], target='CAD')
    print("Explained Patient 0:")
    print("Probability:", exp["predicted_probability"])
    print("Top 3 factors:")
    for f in exp["top_features"][:3]:
        print(f"  {f['display_name']} -> SHAP: {f['shap_value']}, Value: {f['patient_value']}")

