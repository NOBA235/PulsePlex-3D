import React, { useState } from 'react';
import { PatientFeatures, SamplePatient } from '../services/api';
import {
  User,
  Heart,
  Activity,
  FlaskConical,
  Flame,
  CheckCircle2,
  Sliders,
  RefreshCw,
} from 'lucide-react';

interface InputFormProps {
  patient: PatientFeatures;
  onChange: (updated: PatientFeatures) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  samplePatients: SamplePatient[];
  onSelectSample: (sample: SamplePatient) => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  patient,
  onChange,
  onAnalyze,
  isLoading,
  samplePatients,
  onSelectSample,
}) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'symptoms' | 'ecg' | 'labs'>('vitals');

  const updateField = (field: keyof PatientFeatures, value: any) => {
    const updated = { ...patient, [field]: value };
    // Auto-update BMI if weight or length changes
    if (field === 'Weight' || field === 'Length') {
      const h_m = (field === 'Length' ? Number(value) : patient.Length) / 100.0;
      const w_kg = field === 'Weight' ? Number(value) : patient.Weight;
      if (h_m > 0) {
        updated.BMI = Number((w_kg / (h_m * h_m)).toFixed(2));
      }
    }
    onChange(updated);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-xl p-5 flex flex-col h-full">
      {/* Header & Presets */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Patient Clinical Profile</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">UCI Z-Alizadeh Sani Feature Matrix</span>
        </div>

        {/* Quick Presets Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Reference patient profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {samplePatients.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectSample(sample)}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent transition text-slate-200 truncate"
                title={sample.description}
              >
                <div className="font-semibold text-[11px] truncate">{sample.name.split(':')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">{sample.name.split(':')[1] || sample.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-800 mb-4 text-xs font-medium space-x-1">
        <button
          type="button"
          onClick={() => setActiveTab('vitals')}
          className={`pb-2 px-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'vitals'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Demographics & Vitals</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('symptoms')}
          className={`pb-2 px-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'symptoms'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Symptoms & History</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ecg')}
          className={`pb-2 px-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'ecg'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>ECG & Echo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('labs')}
          className={`pb-2 px-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'labs'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Lab Biomarkers</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[460px]">
        {/* Tab 1: Demographics & Vitals */}
        {activeTab === 'vitals' && (
          <div className="space-y-4 text-xs">
            {/* Age Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Age (Years)</span>
                <span className="text-blue-400 font-bold font-mono">{patient.Age} yrs</span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                value={patient.Age}
                onChange={(e) => updateField('Age', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Sex Toggle */}
            <div>
              <span className="block font-medium text-slate-300 mb-1.5">Sex</span>
              <div className="grid grid-cols-2 gap-2">
                {['Male', 'Female'].map((sex) => (
                  <button
                    key={sex}
                    type="button"
                    onClick={() => updateField('Sex', sex)}
                    className={`py-1.5 px-3 rounded-lg font-medium border text-center transition ${
                      patient.Sex.toLowerCase().startsWith(sex[0].toLowerCase())
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {sex}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight & Length / Height */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between font-medium text-slate-300 mb-1">
                  <span>Weight</span>
                  <span className="text-slate-200 font-mono">{patient.Weight} kg</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="120"
                  value={patient.Weight}
                  onChange={(e) => updateField('Weight', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between font-medium text-slate-300 mb-1">
                  <span>Height</span>
                  <span className="text-slate-200 font-mono">{patient.Length} cm</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="195"
                  value={patient.Length}
                  onChange={(e) => updateField('Length', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Calculated BMI:</span>
              <span className="font-bold text-slate-200 font-mono">{patient.BMI || ((patient.Weight / Math.pow(patient.Length / 100, 2)).toFixed(1))} kg/m²</span>
            </div>

            {/* Blood Pressure (BP) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Systolic Blood Pressure (BP)</span>
                <span className={`font-mono font-bold ${patient.BP >= 140 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {patient.BP} mmHg
                </span>
              </div>
              <input
                type="range"
                min="90"
                max="190"
                step="5"
                value={patient.BP}
                onChange={(e) => updateField('BP', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Pulse Rate (PR) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Resting Heart Rate (PR)</span>
                <span className="text-slate-200 font-mono">{patient.PR} bpm</span>
              </div>
              <input
                type="range"
                min="50"
                max="120"
                value={patient.PR}
                onChange={(e) => updateField('PR', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Symptoms & History */}
        {activeTab === 'symptoms' && (
          <div className="space-y-3.5 text-xs">
            {/* Typical Chest Pain */}
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Typical Chest Pain (Angina)</div>
                <div className="text-[10px] text-slate-400">Substernal chest pressure triggered by exertion</div>
              </div>
              <button
                type="button"
                onClick={() => updateField('Typical Chest Pain', patient['Typical Chest Pain'] ? 0 : 1)}
                className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                  patient['Typical Chest Pain']
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {patient['Typical Chest Pain'] ? 'Present (1)' : 'Absent (0)'}
              </button>
            </div>

            {/* Dyspnea */}
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Exertional Dyspnea</div>
                <div className="text-[10px] text-slate-400">Shortness of breath on mild to moderate effort</div>
              </div>
              <button
                type="button"
                onClick={() => updateField('Dyspnea', patient.Dyspnea === 'Y' ? 'N' : 'Y')}
                className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                  patient.Dyspnea === 'Y'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {patient.Dyspnea === 'Y' ? 'Yes (Y)' : 'No (N)'}
              </button>
            </div>

            {/* NYHA Function Class */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>NYHA Functional Class (0 - 3)</span>
                <span className="font-mono font-bold text-blue-400">Class {patient['Function Class']}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                value={patient['Function Class']}
                onChange={(e) => updateField('Function Class', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Grid of Medical History Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { key: 'DM', label: 'Diabetes Mellitus', val: patient.DM === 1, onToggle: () => updateField('DM', patient.DM ? 0 : 1) },
                { key: 'HTN', label: 'Hypertension', val: patient.HTN === 1, onToggle: () => updateField('HTN', patient.HTN ? 0 : 1) },
                { key: 'Current Smoker', label: 'Current Smoker', val: patient['Current Smoker'] === 1, onToggle: () => updateField('Current Smoker', patient['Current Smoker'] ? 0 : 1) },
                { key: 'DLP', label: 'Dyslipidemia', val: patient.DLP === 'Y', onToggle: () => updateField('DLP', patient.DLP === 'Y' ? 'N' : 'Y') },
                { key: 'FH', label: 'Family History CAD', val: patient.FH === 1, onToggle: () => updateField('FH', patient.FH ? 0 : 1) },
                { key: 'Obesity', label: 'Clinical Obesity', val: patient.Obesity === 'Y', onToggle: () => updateField('Obesity', patient.Obesity === 'Y' ? 'N' : 'Y') },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onToggle}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                    item.val
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono font-bold">{item.val ? 'YES' : 'NO'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: ECG & Echo */}
        {activeTab === 'ecg' && (
          <div className="space-y-4 text-xs">
            {/* Ejection Fraction (EF-TTE) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Ejection Fraction (EF-TTE %)</span>
                <span className={`font-mono font-bold ${patient['EF-TTE'] < 45 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {patient['EF-TTE']}% {patient['EF-TTE'] < 45 ? '(Reduced)' : '(Preserved)'}
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="65"
                step="5"
                value={patient['EF-TTE']}
                onChange={(e) => updateField('EF-TTE', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Regional Wall Motion Abnormality (RWMA) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Regional Wall Motion Abnormality (RWMA)</span>
                <span className="font-mono font-bold text-amber-400">Score {patient['Region RWMA']} / 4</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                value={patient['Region RWMA']}
                onChange={(e) => updateField('Region RWMA', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* ECG Findings Switches */}
            <div className="space-y-2">
              <span className="block font-medium text-slate-400 text-[11px]">Ischemic ECG Markers:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    key: 'St Depression',
                    label: 'ST Depression',
                    val: patient['St Depression'] === 1,
                    onToggle: () => updateField('St Depression', patient['St Depression'] ? 0 : 1),
                  },
                  {
                    key: 'Tinversion',
                    label: 'T-Wave Inversion',
                    val: patient.Tinversion === 1,
                    onToggle: () => updateField('Tinversion', patient.Tinversion ? 0 : 1),
                  },
                  {
                    key: 'Q Wave',
                    label: 'Pathological Q Wave',
                    val: patient['Q Wave'] === 1,
                    onToggle: () => updateField('Q Wave', patient['Q Wave'] ? 0 : 1),
                  },
                  {
                    key: 'St Elevation',
                    label: 'ST Elevation',
                    val: patient['St Elevation'] === 1,
                    onToggle: () => updateField('St Elevation', patient['St Elevation'] ? 0 : 1),
                  },
                ].map((ecg) => (
                  <button
                    key={ecg.key}
                    type="button"
                    onClick={ecg.onToggle}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                      ecg.val
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{ecg.label}</span>
                    <span className="text-[10px] font-mono font-bold">{ecg.val ? 'POS' : 'NEG'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Valvular Disease (VHD) */}
            <div>
              <span className="block font-medium text-slate-300 mb-1">Valvular Heart Disease (VHD)</span>
              <div className="grid grid-cols-4 gap-1.5">
                {['N', 'mild', 'Moderate', 'Severe'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => updateField('VHD', val)}
                    className={`py-1 text-center rounded text-[11px] font-medium border transition ${
                      patient.VHD === val
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {val === 'N' ? 'None' : val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Lab Biomarkers */}
        {activeTab === 'labs' && (
          <div className="space-y-3.5 text-xs">
            {/* Fasting Blood Sugar (FBS) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Fasting Blood Sugar (FBS)</span>
                <span className={`font-mono font-bold ${patient.FBS > 126 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {patient.FBS} mg/dL
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="300"
                step="5"
                value={patient.FBS}
                onChange={(e) => updateField('FBS', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* LDL Cholesterol */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>LDL Cholesterol</span>
                <span className={`font-mono font-bold ${patient.LDL > 130 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {patient.LDL} mg/dL
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="260"
                step="5"
                value={patient.LDL}
                onChange={(e) => updateField('LDL', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* HDL Cholesterol */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>HDL Cholesterol (Protective)</span>
                <span className={`font-mono font-bold ${patient.HDL < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {patient.HDL} mg/dL
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={patient.HDL}
                onChange={(e) => updateField('HDL', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Triglycerides (TG) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Serum Triglycerides (TG)</span>
                <span className="font-mono text-slate-200">{patient.TG} mg/dL</span>
              </div>
              <input
                type="range"
                min="50"
                max="450"
                step="10"
                value={patient.TG}
                onChange={(e) => updateField('TG', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Serum Creatinine (CR) */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Serum Creatinine (CR)</span>
                <span className="font-mono text-slate-200">{patient.CR} mg/dL</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={patient.CR}
                onChange={(e) => updateField('CR', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-4 border-t border-slate-800 mt-auto">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white active:scale-[0.99] transition flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Computing SHAP & Vessel Inferences...</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              <span>Analyze Cardiovascular Stenosis Risk</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

