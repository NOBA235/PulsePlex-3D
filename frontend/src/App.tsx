import React, { useState, useEffect } from 'react';
import { Canvas3D } from './components/Canvas3D';
import { Dashboard } from './components/Dashboard';
import { InputForm } from './components/InputForm';
import {
  PatientFeatures,
  PredictResponse,
  SamplePatient,
  MetricsMap,
  fetchSamplePatients,
  fetchMetrics,
  predictCardioRisk,
  fetchHealth,
} from './services/api';
import {
  Heart,
  Activity,
  ShieldAlert,
  Wifi,
  WifiOff,
  AlertCircle,
  Stethoscope,
  Info,
} from 'lucide-react';

const DEFAULT_PATIENT: PatientFeatures = {
  Age: 54,
  Sex: 'Male',
  Weight: 82,
  Length: 172,
  BMI: 27.72,
  DM: 0,
  HTN: 1,
  'Current Smoker': 1,
  'EX-Smoker': 0,
  FH: 0,
  Obesity: 'N',
  CRF: 'N',
  CVA: 'N',
  'Airway disease': 'N',
  'Thyroid Disease': 'N',
  CHF: 'N',
  DLP: 'Y',
  BP: 135,
  PR: 78,
  Edema: 0,
  'Weak Peripheral Pulse': 'N',
  'Lung rales': 'N',
  'Systolic Murmur': 'N',
  'Diastolic Murmur': 'N',
  'Typical Chest Pain': 1,
  Dyspnea: 'N',
  'Function Class': 1,
  Atypical: 'N',
  Nonanginal: 'N',
  'Exertional CP': 'N',
  'LowTH Ang': 'N',
  'Q Wave': 0,
  'St Elevation': 0,
  'St Depression': 1,
  Tinversion: 1,
  LVH: 'N',
  'Poor R Progression': 'N',
  BBB: 'N',
  FBS: 95,
  CR: 1.0,
  TG: 195,
  LDL: 150,
  HDL: 34,
  BUN: 17,
  ESR: 10,
  HB: 14.5,
  K: 4.6,
  Na: 141,
  WBC: 7200,
  Lymph: 30,
  Neut: 62,
  PLT: 240,
  'EF-TTE': 45,
  'Region RWMA': 2,
  VHD: 'N',
};

// Fallback initial prediction state
const INITIAL_PREDICTION: PredictResponse = {
  cad_status: 'CAD',
  cad_probability: 0.948,
  cad_percentage: 94.8,
  cad_risk_category: 'High',
  cad_risk_color: '#ef4444',
  vessels: {
    LAD: {
      vessel: 'LAD',
      probability: 0.88,
      stenosis_percentage: 88.0,
      risk_category: 'High',
      risk_code: 'HIGH',
      color: '#ef4444',
      stenotic: true,
      anatomical_territory: 'Anterior Wall & Interventricular Septum (Apex)',
    },
    LCX: {
      vessel: 'LCX',
      probability: 0.42,
      stenosis_percentage: 42.0,
      risk_category: 'Moderate',
      risk_code: 'MODERATE',
      color: '#eab308',
      stenotic: false,
      anatomical_territory: 'Lateral and Posterior Ventricular Wall',
    },
    RCA: {
      vessel: 'RCA',
      probability: 0.65,
      stenosis_percentage: 65.0,
      risk_category: 'High',
      risk_code: 'HIGH',
      color: '#ef4444',
      stenotic: true,
      anatomical_territory: 'Inferior Wall, Right Ventricle & Sinoatrial Node',
    },
  },
  stenotic_vessels_count: 2,
  vascular_pattern: 'Double-Vessel Disease (LAD + RCA)',
  shap_explanations: {},
  patient_summary: {
    age: 54,
    sex: 'Male',
    typical_chest_pain: true,
    ef_tte: 45,
    st_depression: true,
    bp: 135,
  },
};

export const App: React.FC = () => {
  const [patient, setPatient] = useState<PatientFeatures>(DEFAULT_PATIENT);
  const [prediction, setPrediction] = useState<PredictResponse>(INITIAL_PREDICTION);
  const [metrics, setMetrics] = useState<MetricsMap | null>(null);
  const [samplePatients, setSamplePatients] = useState<SamplePatient[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<'LAD' | 'LCX' | 'RCA' | null>(null);
  const [isBeating, setIsBeating] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchHealth();
        setBackendOnline(true);
      } catch (err) {
        console.warn('Backend offline or starting up:', err);
        setBackendOnline(false);
      }

      try {
        const samples = await fetchSamplePatients();
        setSamplePatients(samples);
      } catch (err) {
        console.warn('Could not load samples:', err);
      }

      try {
        const m = await fetchMetrics();
        setMetrics(m);
      } catch (err) {
        console.warn('Could not load metrics:', err);
      }

      // Initial analysis
      runPrediction(DEFAULT_PATIENT);
    };

    initialize();
  }, []);

  const runPrediction = async (patientToPredict: PatientFeatures) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await predictCardioRisk(patientToPredict);
      setPrediction(result);
      setBackendOnline(true);
    } catch (err: any) {
      console.error('Prediction request error:', err);
      setErrorMsg(err.message || 'Unable to connect to ML prediction backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSample = (sample: SamplePatient) => {
    setPatient(sample.data);
    runPrediction(sample.data);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans pb-16">
      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 shadow-md shadow-rose-600/20">
              <Heart className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">CardioRisk AI</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Track A: Multimodal AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Coronary Artery Stenosis Prediction & 3D Hemodynamic Risk Mapping (UCI Z-Alizadeh Sani)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              {backendOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-300 font-mono">FastAPI ML Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-400 font-mono">Connecting Backend...</span>
                </>
              )}
            </div>

            <a
              href="https://archive.ics.uci.edu/dataset/411/extension+of+z+alizadeh+sani+dataset"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-blue-400 transition flex items-center space-x-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Dataset Info</span>
            </a>
          </div>
        </div>
      </header>

      {/* Error notification banner if any */}
      {errorMsg && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
          <button
            onClick={() => runPrediction(patient)}
            className="underline font-bold ml-2 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Patient Form (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <InputForm
              patient={patient}
              onChange={setPatient}
              onAnalyze={() => runPrediction(patient)}
              isLoading={isLoading}
              samplePatients={samplePatients}
              onSelectSample={handleSelectSample}
            />
          </div>

          {/* Right Column: 3D Visualization + Clinical Dashboard (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* 3D Heart Scene */}
            <div className="w-full h-[470px]">
              <Canvas3D
                vessels={prediction.vessels}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
                isBeating={isBeating}
                onToggleBeating={() => setIsBeating(!isBeating)}
              />
            </div>

            {/* Clinical Analytics & SHAP Dashboard */}
            <Dashboard
              prediction={prediction}
              metrics={metrics}
              selectedVessel={selectedVessel}
              onSelectVessel={setSelectedVessel}
            />
          </div>
        </div>
      </main>

      {/* ================= MANDATORY REGULATORY & SAFETY DISCLAIMER FOOTER ================= */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2.5 shadow-2xl">
        <div className="max-w-[1680px] mx-auto flex items-center justify-center space-x-2.5 text-center text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="tracking-wide">
            <strong className="text-slate-200">Notice:</strong> Predictions and visualizations generated by this system are strictly for educational and decision-support purposes only. They do not replace formal diagnostic imaging or clinical evaluations.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

