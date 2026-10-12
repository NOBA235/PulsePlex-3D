import React, { useState } from 'react';
import { PatientFeatures, PredictResponse } from '../services/api';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  ShieldAlert,
  Heart,
  Activity,
  Layers,
  Award,
  Calendar,
  User,
} from 'lucide-react';

interface ClinicalReportModalProps {
  patient: PatientFeatures;
  prediction: PredictResponse;
  onClose: () => void;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  patient,
  prediction,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const generateReportMarkdown = () => {
    return `========================================================================
PULSEPLEX™ CARDIOVASCULAR RISK & MULTI-VESSEL STENOSIS REPORT
Comprehensive Clinical Decision-Support & 3D Anatomical Risk Mapping
========================================================================
Date of Evaluation: ${reportDate}
Dataset Benchmark: UCI Z-Alizadeh Sani Cohort (Pre-Catheterization Features)

1. PATIENT DEMOGRAPHICS & CLINICAL EXAMINATION
------------------------------------------------------------------------
Age: ${patient.Age} years  |  Sex: ${patient.Sex}  |  BMI: ${patient.BMI || 'N/A'} kg/m²
Blood Pressure (SBP): ${patient.BP} mmHg  |  Pulse Rate: ${patient.PR} bpm
Cardiovascular Risk Factors:
  - Diabetes Mellitus: ${patient.DM ? 'Yes' : 'No'}
  - Hypertension: ${patient.HTN ? 'Yes' : 'No'}
  - Smoking Status: ${patient['Current Smoker'] ? 'Current Smoker' : patient['EX-Smoker'] ? 'Ex-Smoker' : 'Non-Smoker'}
  - Dyslipidemia (DLP): ${patient.DLP}
  - Family History (FH): ${patient.FH ? 'Positive' : 'Negative'}

Symptom Presentation:
  - Typical Anginal Chest Pain: ${patient['Typical Chest Pain'] ? 'Yes' : 'No'}
  - NYHA Function Class: Class ${patient['Function Class']}
  - Dyspnea: ${patient.Dyspnea}

2. ELECTROCARDIOGRAPHIC & ECHOCARDIOGRAPHIC FINDINGS
------------------------------------------------------------------------
ECG Findings:
  - ST-Segment Depression: ${patient['St Depression'] ? 'Present (Ischemia marker)' : 'None'}
  - ST-Segment Elevation: ${patient['St Elevation'] ? 'Present (Acute injury marker)' : 'None'}
  - T-Wave Inversion: ${patient.Tinversion ? 'Present' : 'None'}
  - Pathological Q Waves: ${patient['Q Wave'] ? 'Present' : 'None'}
Echocardiography:
  - Left Ventricular Ejection Fraction (EF-TTE): ${patient['EF-TTE']}%
  - Regional Wall Motion Abnormality (RWMA): ${patient['Region RWMA']} segments affected

3. LABORATORY BIOMARKERS
------------------------------------------------------------------------
LDL Cholesterol: ${patient.LDL} mg/dL  |  HDL: ${patient.HDL} mg/dL  |  Triglycerides: ${patient.TG} mg/dL
Fasting Blood Sugar: ${patient.FBS} mg/dL  |  Serum Creatinine: ${patient.CR} mg/dL
BUN: ${patient.BUN} mg/dL  |  ESR: ${patient.ESR} mm/hr  |  Hemoglobin: ${patient.HB} g/dL

4. MULTIMODAL AI PREDICTIVE ASSESSMENT (XGBOOST MULTI-TARGET PIPELINE)
------------------------------------------------------------------------
Overall CAD Classification: ${prediction.cad_status} (${prediction.cad_percentage}% Risk Probability)
Overall Risk Category: ${prediction.cad_risk_category.toUpperCase()} RISK
Vascular Pattern: ${prediction.vascular_pattern}
SCCT CAD-RADS™ 2.0 Grade: ${prediction.cad_rads?.grade || 'CAD-RADS 3'}
Clinical Recommendation: ${prediction.cad_rads?.clinical_recommendation || 'Cardiology consultation.'}

Vessel-Specific Stenosis Estimates (Diameter Narrowing >=50%):
  - Left Anterior Descending (LAD): ${prediction.vessels.LAD.stenosis_percentage}%  [${prediction.vessels.LAD.risk_category} Risk]
    Territory: ${prediction.vessels.LAD.anatomical_territory}
  - Left Circumflex (LCX): ${prediction.vessels.LCX.stenosis_percentage}%  [${prediction.vessels.LCX.risk_category} Risk]
    Territory: ${prediction.vessels.LCX.anatomical_territory}
  - Right Coronary Artery (RCA): ${prediction.vessels.RCA.stenosis_percentage}%  [${prediction.vessels.RCA.risk_category} Risk]
    Territory: ${prediction.vessels.RCA.anatomical_territory}

5. MECHANISTIC LOCAL FEATURE ATTRIBUTION (SHAP TREEEXPLAINER)
------------------------------------------------------------------------
Dominant Risk Escalating Drivers:
${(prediction.shap_explanations.CAD?.risk_drivers || [])
  .slice(0, 4)
  .map((d, i) => `  ${i + 1}. ${d.display_name} (Value: ${d.patient_value}) -> +${d.shap_value} SHAP log-odds`)
  .join('\n')}

Protective Factors:
${(prediction.shap_explanations.CAD?.protective_factors || [])
  .slice(0, 3)
  .map((p, i) => `  ${i + 1}. ${p.display_name} (Value: ${p.patient_value}) -> ${p.shap_value} SHAP log-odds`)
  .join('\n')}

6. GUIDELINE-DIRECTED MEDICAL THERAPY & ACTION PLAN
------------------------------------------------------------------------
- High-Intensity Statin Therapy (Atorvastatin 80mg or Rosuvastatin 40mg daily) to achieve LDL < 55-70 mg/dL.
- Antiplatelet Therapy: Aspirin 81mg daily (consider P2Y12 inhibitor if high ischemic burden).
- Blood Pressure Target: Tight systolic control < 120-130 mmHg via ACEi/ARB.
- If Multi-Vessel Stenosis >70% with High-Risk Features: Prompt Heart Team evaluation for Invasive Coronary Angiography (ICA) and revascularization.

========================================================================
REGULATORY SAFETY NOTICE:
PulsePlex predictions and visualizations are educational decision-support
outputs generated for the Multimodal AI Hackathon 2026. They do NOT replace
formal invasive catheterization or diagnostic imaging.
========================================================================`;
  };

  const handleCopy = () => {
    const text = generateReportMarkdown();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#070b14] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/70 print:border-b print:border-black print:bg-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 print:hidden">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white print:text-black flex items-center space-x-2">
                <span>PulsePlex™ Clinical Consultation Summary</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono print:hidden">
                  AHA/ACC GDMT
                </span>
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Generated {reportDate} · Z-Alizadeh Sani Feature Matrix & TreeExplainer Attributions
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
              title="Copy EHR Text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Note'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
              title="Print or Save PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 print:text-black print:p-2 text-xs">
          {/* Patient Overview Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 print:bg-gray-100 p-3.5 rounded-xl border border-slate-800 print:border-gray-300">
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase block font-semibold">
                Patient Demographics
              </span>
              <span className="font-bold text-white print:text-black">
                {patient.Age}y · {patient.Sex}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase block font-semibold">
                Vitals (BP / PR)
              </span>
              <span className="font-mono font-bold text-white print:text-black">
                {patient.BP} mmHg · {patient.PR} bpm
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase block font-semibold">
                Lipids (LDL / HDL)
              </span>
              <span className="font-mono font-bold text-white print:text-black">
                {patient.LDL} / {patient.HDL} mg/dL
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-gray-600 uppercase block font-semibold">
                Left Ventricle EF
              </span>
              <span className="font-mono font-bold text-white print:text-black">{patient['EF-TTE']}% (Echo)</span>
            </div>
          </div>

          {/* AI CAD & Vessel Assessment */}
          <div className="p-4 rounded-xl bg-slate-900/60 print:bg-white border border-slate-800 print:border-gray-400 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="font-bold text-white print:text-black text-sm">
                  Coronary Stenosis Risk Assessment
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${prediction.cad_risk_color}22`,
                  color: prediction.cad_risk_color,
                }}
              >
                {prediction.cad_risk_category} Risk ({prediction.cad_percentage}%)
              </span>
            </div>

            {/* CAD-RADS & Vascular Pattern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">CAD-RADS™ 2.0 Grade</span>
                <span className="font-bold text-white print:text-black text-sm">
                  {prediction.cad_rads?.grade || 'CAD-RADS 3'}
                </span>
                <p className="text-[11px] text-slate-300 print:text-gray-700 mt-1">
                  {prediction.cad_rads?.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">Vascular Pattern</span>
                <span className="font-bold text-white print:text-black text-sm">{prediction.vascular_pattern}</span>
                <p className="text-[11px] text-slate-300 print:text-gray-700 mt-1">
                  {prediction.stenotic_vessels_count} vessels demonstrating &ge;50% narrowing.
                </p>
              </div>
            </div>

            {/* Vessel Specific Table */}
            <div className="pt-1">
              <table className="w-full text-left text-xs text-slate-300 print:text-black">
                <thead className="bg-slate-950/80 print:bg-gray-200 text-[10px] uppercase text-slate-400 print:text-gray-700">
                  <tr>
                    <th className="py-2 px-3">Coronary Vessel</th>
                    <th className="py-2 px-3">Anatomical Territory</th>
                    <th className="py-2 px-3">Predicted Stenosis %</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 font-mono">
                  {(['LAD', 'LCX', 'RCA'] as const).map((vKey) => {
                    const v = prediction.vessels[vKey];
                    return (
                      <tr key={vKey}>
                        <td className="py-2 px-3 font-sans font-bold text-white print:text-black flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }}></span>
                          <span>{vKey}</span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400 print:text-gray-700 text-[11px]">
                          {v.anatomical_territory}
                        </td>
                        <td className="py-2 px-3 font-bold">{v.stenosis_percentage}%</td>
                        <td className="py-2 px-3 font-sans text-xs">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: `${v.color}22`, color: v.color }}
                          >
                            {v.stenotic ? 'Stenotic (≥50%)' : 'Non-Obstructive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mechanistic SHAP Attribution Summary */}
          <div className="p-4 rounded-xl bg-slate-900/60 print:bg-white border border-slate-800 print:border-gray-400 space-y-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white print:text-black text-sm">
                Key Mechanistic Feature Attributions (SHAP)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 print:text-gray-600">
              Machine learning explainability drivers extracted via local TreeExplainer for this patient:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Positive Risk Factors */}
              <div className="p-2.5 rounded-lg bg-rose-500/10 print:bg-red-50 border border-rose-500/20 print:border-red-200">
                <span className="text-[10px] font-bold uppercase text-rose-400 print:text-red-700 block mb-1">
                  Primary Risk Escalating Drivers
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 print:text-gray-800">
                  {(prediction.shap_explanations.CAD?.risk_drivers || []).slice(0, 3).map((d, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate pr-1">{d.display_name} ({d.patient_value})</span>
                      <span className="font-mono text-rose-400 font-bold shrink-0">+{d.shap_value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Protective Factors */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 print:bg-green-50 border border-emerald-500/20 print:border-green-200">
                <span className="text-[10px] font-bold uppercase text-emerald-400 print:text-green-700 block mb-1">
                  Primary Protective Factors
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 print:text-gray-800">
                  {(prediction.shap_explanations.CAD?.protective_factors || []).slice(0, 2).map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate pr-1">{p.display_name} ({p.patient_value})</span>
                      <span className="font-mono text-emerald-400 font-bold shrink-0">{p.shap_value}</span>
                    </li>
                  ))}
                  {(!prediction.shap_explanations.CAD?.protective_factors?.length) && (
                    <li className="text-slate-500 italic">No significant protective variables identified.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Guideline-Directed Recommendation */}
          <div className="p-3.5 rounded-xl bg-indigo-950/40 print:bg-blue-50 border border-indigo-900/50 print:border-blue-200 text-xs">
            <span className="font-bold text-white print:text-blue-900 block mb-1">
              Recommended Guideline-Directed Action (ACC/AHA 2026 Consensus):
            </span>
            <p className="text-[11px] text-slate-300 print:text-gray-800 leading-relaxed">
              {prediction.cad_rads?.clinical_recommendation} High-intensity statin therapy (Atorvastatin 80mg) is
              indicated to lower LDL below 70 mg/dL. Tight blood pressure control targeting SBP &le; 120 mmHg is
              advised along with lifestyle modification and smoking cessation protocol.
            </p>
          </div>

          {/* Mandatory Disclaimer in printed note */}
          <div className="pt-2 border-t border-slate-800 print:border-gray-300 text-[10px] text-slate-500 print:text-gray-500 text-center">
            Notice: PulsePlex predictions and visualizations are educational decision-support outputs and do not replace diagnostic imaging or formal clinical evaluation.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 print:hidden flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Export formatted consultation note for EHR record or physical chart.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

