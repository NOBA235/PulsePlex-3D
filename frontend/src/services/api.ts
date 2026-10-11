/**
 * API Service for interacting with FastAPI CardioRisk Backend
 */

export interface PatientFeatures {
  Age: number;
  Sex: string;
  Weight: number;
  Length: number;
  BMI?: number;
  DM: number;
  HTN: number;
  'Current Smoker': number;
  'EX-Smoker': number;
  FH: number;
  Obesity: string;
  CRF: string;
  CVA: string;
  'Airway disease': string;
  'Thyroid Disease': string;
  CHF: string;
  DLP: string;
  BP: number;
  PR: number;
  Edema: number;
  'Weak Peripheral Pulse': string;
  'Lung rales': string;
  'Systolic Murmur': string;
  'Diastolic Murmur': string;
  'Typical Chest Pain': number;
  Dyspnea: string;
  'Function Class': number;
  Atypical: string;
  Nonanginal: string;
  'Exertional CP': string;
  'LowTH Ang': string;
  'Q Wave': number;
  'St Elevation': number;
  'St Depression': number;
  Tinversion: number;
  LVH: string;
  'Poor R Progression': string;
  BBB: string;
  FBS: number;
  CR: number;
  TG: number;
  LDL: number;
  HDL: number;
  BUN: number;
  ESR: number;
  HB: number;
  K: number;
  Na: number;
  WBC: number;
  Lymph: number;
  Neut: number;
  PLT: number;
  'EF-TTE': number;
  'Region RWMA': number;
  VHD: string;
}

export interface VesselRiskInfo {
  vessel: 'LAD' | 'LCX' | 'RCA';
  probability: number;
  stenosis_percentage: number;
  risk_category: 'Low' | 'Moderate' | 'High';
  risk_code: 'LOW' | 'MODERATE' | 'HIGH';
  color: string;
  stenotic: boolean;
  anatomical_territory: string;
}

export interface ShapFeature {
  feature: string;
  display_name: string;
  shap_value: number;
  patient_value: number;
  direction: 'risk_factor' | 'protective_factor';
  abs_importance: number;
}

export interface ShapExplanation {
  target: string;
  predicted_probability: number;
  base_value: number;
  top_features: ShapFeature[];
  risk_drivers: ShapFeature[];
  protective_factors: ShapFeature[];
  all_features_count: number;
}

export interface PredictResponse {
  cad_status: 'CAD' | 'Normal';
  cad_probability: number;
  cad_percentage: number;
  cad_risk_category: 'Low' | 'Moderate' | 'High';
  cad_risk_color: string;
  vessels: {
    LAD: VesselRiskInfo;
    LCX: VesselRiskInfo;
    RCA: VesselRiskInfo;
  };
  stenotic_vessels_count: number;
  vascular_pattern: string;
  shap_explanations: {
    CAD?: ShapExplanation;
    LAD?: ShapExplanation;
    LCX?: ShapExplanation;
    RCA?: ShapExplanation;
  };
  patient_summary: {
    age: number;
    sex: string;
    typical_chest_pain: boolean;
    ef_tte: number;
    st_depression: boolean;
    bp: number;
  };
}

export interface SamplePatient {
  id: string;
  name: string;
  description: string;
  data: PatientFeatures;
}

export interface TargetMetric {
  target: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  cv_mean_accuracy: number;
  cv_mean_roc_auc: number;
  test_sample_size: number;
  train_sample_size: number;
  positive_class_ratio: number;
}

export type MetricsMap = Record<string, TargetMetric>;

const API_BASE = 'http://localhost:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSamplePatients(): Promise<SamplePatient[]> {
  const res = await fetch(`${API_BASE}/sample-patients`);
  if (!res.ok) throw new Error(`Failed to load sample patients: ${res.statusText}`);
  return res.json();
}

export async function fetchMetrics(): Promise<MetricsMap> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`Failed to load metrics: ${res.statusText}`);
  return res.json();
}

export async function predictCardioRisk(patient: PatientFeatures): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patient),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Prediction failed (${res.status})`);
  }

  return res.json();
}

