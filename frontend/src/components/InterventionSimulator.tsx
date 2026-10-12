import React, { useState, useEffect } from 'react';
import { PatientFeatures, PredictResponse, predictCardioRisk } from '../services/api';
import {
  Pill,
  Heart,
  TrendingDown,
  ShieldCheck,
  Zap,
  Activity,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Flame,
  Scale,
} from 'lucide-react';

interface InterventionSimulatorProps {
  currentPatient: PatientFeatures;
  baselinePrediction: PredictResponse;
  onApplyInterventionsToPatient: (updatedPatient: PatientFeatures) => void;
  onPreviewCounterfactual3D: (previewPrediction: PredictResponse | null) => void;
  is3DPreviewActive: boolean;
}

export interface ActiveInterventions {
  highIntensityStatin: boolean;
  antihypertensiveOptimization: boolean;
  smokingCessation: boolean;
  glycemicMetabolicControl: boolean;
  cardiacRehabExercise: boolean;
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  currentPatient,
  baselinePrediction,
  onApplyInterventionsToPatient,
  onPreviewCounterfactual3D,
  is3DPreviewActive,
}) => {
  const [interventions, setInterventions] = useState<ActiveInterventions>({
    highIntensityStatin: true,
    antihypertensiveOptimization: true,
    smokingCessation: currentPatient['Current Smoker'] === 1,
    glycemicMetabolicControl: currentPatient.DM === 1 || currentPatient.FBS > 110,
    cardiacRehabExercise: false,
  });

  const [counterfactualPatient, setCounterfactualPatient] = useState<PatientFeatures>(currentPatient);
  const [projectedPrediction, setProjectedPrediction] = useState<PredictResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Compute modified counterfactual patient vector based on active interventions
  const buildCounterfactualPatient = (base: PatientFeatures, config: ActiveInterventions): PatientFeatures => {
    const p: PatientFeatures = { ...base };

    // 1. High-Intensity Statin (Atorvastatin 80mg / Rosuvastatin 40mg)
    if (config.highIntensityStatin) {
      // 50% LDL reduction or down to 65 mg/dL
      p.LDL = Math.min(Math.round(p.LDL * 0.5), 68);
      // 20% Triglycerides reduction
      p.TG = Math.round(p.TG * 0.8);
      p.DLP = 'N';
    }

    // 2. Antihypertensive Optimization (Dual ACEi/ARB + CCB)
    if (config.antihypertensiveOptimization) {
      p.BP = Math.min(p.BP, 118);
    }

    // 3. Smoking Cessation Protocol
    if (config.smokingCessation) {
      if (p['Current Smoker'] === 1) {
        p['Current Smoker'] = 0;
        p['EX-Smoker'] = 1;
      }
    }

    // 4. Intensive Glycemic & Metabolic Control (GLP-1 RA / SGLT2i)
    if (config.glycemicMetabolicControl) {
      p.FBS = Math.min(p.FBS, 92);
      if (p.BMI && p.BMI > 24) {
        p.BMI = +(p.BMI * 0.90).toFixed(1);
        p.Weight = +(p.Weight * 0.90).toFixed(1);
      }
    }

    // 5. Cardioprotective Rehab & Exercise
    if (config.cardiacRehabExercise) {
      p.PR = Math.min(p.PR, 65);
      p.HDL = Math.round(p.HDL * 1.15); // +15% HDL
      if (p['Typical Chest Pain'] === 1) {
        p['Typical Chest Pain'] = 0;
        p.Atypical = 'Y';
      }
    }

    return p;
  };

  // Re-run projection whenever interventions or base patient changes
  useEffect(() => {
    const updated = buildCounterfactualPatient(currentPatient, interventions);
    setCounterfactualPatient(updated);

    const runSimulation = async () => {
      setIsSimulating(true);
      try {
        const res = await predictCardioRisk(updated);
        setProjectedPrediction(res);
        if (is3DPreviewActive) {
          onPreviewCounterfactual3D(res);
        }
      } catch (err) {
        console.error('Counterfactual prediction failed:', err);
      } finally {
        setIsSimulating(false);
      }
    };

    runSimulation();
  }, [interventions, currentPatient]);

  const toggleIntervention = (key: keyof ActiveInterventions) => {
    setInterventions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggle3DPreview = () => {
    if (is3DPreviewActive) {
      onPreviewCounterfactual3D(null);
    } else if (projectedPrediction) {
      onPreviewCounterfactual3D(projectedPrediction);
    }
  };

  const handleCommitToPatient = () => {
    onApplyInterventionsToPatient(counterfactualPatient);
  };

  // Compute delta metrics
  const cadBaseline = baselinePrediction.cad_percentage;
  const cadProjected = projectedPrediction ? projectedPrediction.cad_percentage : cadBaseline;
  const cadDelta = +(cadProjected - cadBaseline).toFixed(1);

  const ladBaseline = baselinePrediction.vessels.LAD.stenosis_percentage;
  const ladProjected = projectedPrediction ? projectedPrediction.vessels.LAD.stenosis_percentage : ladBaseline;
  const ladDelta = +(ladProjected - ladBaseline).toFixed(1);

  const lcxBaseline = baselinePrediction.vessels.LCX.stenosis_percentage;
  const lcxProjected = projectedPrediction ? projectedPrediction.vessels.LCX.stenosis_percentage : lcxBaseline;
  const lcxDelta = +(lcxProjected - lcxBaseline).toFixed(1);

  const rcaBaseline = baselinePrediction.vessels.RCA.stenosis_percentage;
  const rcaProjected = projectedPrediction ? projectedPrediction.vessels.RCA.stenosis_percentage : rcaBaseline;
  const rcaDelta = +(rcaProjected - rcaBaseline).toFixed(1);

  // Absolute Risk Reduction & Number Needed to Treat (NNT estimate)
  const absoluteRiskReduction = Math.max(0, -cadDelta);
  const estimatedNNT = absoluteRiskReduction > 0 ? (100 / absoluteRiskReduction).toFixed(1) : 'N/A';

  return (
    <div className="bg-[#111827] border border-indigo-900/40 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                What-If Counterfactual Intervention Simulator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                GDMT Planner
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate Guideline-Directed Medical Therapy & observe real-time risk reduction on the 3D coronary anatomy.
            </p>
          </div>
        </div>

        {/* 3D Model Sync Toggle */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleToggle3DPreview}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
              is3DPreviewActive
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${is3DPreviewActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{is3DPreviewActive ? 'Previewing on 3D Heart' : 'Project onto 3D Heart'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Intervention Toggles (Left 6 cols) + Projected Outcomes (Right 6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Intervention Toggles List */}
        <div className="lg:col-span-6 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Clinical Protocols & Medications
          </span>

          {/* Toggle 1: High Intensity Statin */}
          <div
            onClick={() => toggleIntervention('highIntensityStatin')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              interventions.highIntensityStatin
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Pill className={`w-4 h-4 ${interventions.highIntensityStatin ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-semibold">High-Intensity Statin Protocol</div>
                <div className="text-[10px] text-slate-400">Atorvastatin 80mg / Rosuvastatin 40mg (LDL &le; 68 mg/dL)</div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                interventions.highIntensityStatin ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
              }`}
            >
              {interventions.highIntensityStatin && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Toggle 2: Antihypertensive Optimization */}
          <div
            onClick={() => toggleIntervention('antihypertensiveOptimization')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              interventions.antihypertensiveOptimization
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Activity
                className={`w-4 h-4 ${interventions.antihypertensiveOptimization ? 'text-indigo-400' : 'text-slate-500'}`}
              />
              <div>
                <div className="text-xs font-semibold">Antihypertensive Optimization</div>
                <div className="text-[10px] text-slate-400">Dual ACEi/ARB + CCB (Target SBP &le; 118 mmHg)</div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                interventions.antihypertensiveOptimization
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-600'
              }`}
            >
              {interventions.antihypertensiveOptimization && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Toggle 3: Smoking Cessation */}
          <div
            onClick={() => toggleIntervention('smokingCessation')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              interventions.smokingCessation
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Flame className={`w-4 h-4 ${interventions.smokingCessation ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-semibold">Smoking Cessation Program</div>
                <div className="text-[10px] text-slate-400">Nicotine replacement / Varenicline (Current Smoker &rarr; 0)</div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                interventions.smokingCessation ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
              }`}
            >
              {interventions.smokingCessation && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Toggle 4: Glycemic & Metabolic Control */}
          <div
            onClick={() => toggleIntervention('glycemicMetabolicControl')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              interventions.glycemicMetabolicControl
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Scale
                className={`w-4 h-4 ${interventions.glycemicMetabolicControl ? 'text-indigo-400' : 'text-slate-500'}`}
              />
              <div>
                <div className="text-xs font-semibold">Glycemic & Weight Control (GLP-1 RA)</div>
                <div className="text-[10px] text-slate-400">Target FBS &le; 92 mg/dL, 10% BMI weight reduction</div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                interventions.glycemicMetabolicControl
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-600'
              }`}
            >
              {interventions.glycemicMetabolicControl && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Toggle 5: Cardioprotective Rehab & Exercise */}
          <div
            onClick={() => toggleIntervention('cardiacRehabExercise')}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              interventions.cardiacRehabExercise
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Zap
                className={`w-4 h-4 ${interventions.cardiacRehabExercise ? 'text-indigo-400' : 'text-slate-500'}`}
              />
              <div>
                <div className="text-xs font-semibold">Supervised Cardiac Rehab & Exercise</div>
                <div className="text-[10px] text-slate-400">Resting PR &le; 65 bpm, +15% HDL, anti-anginal effect</div>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                interventions.cardiacRehabExercise ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
              }`}
            >
              {interventions.cardiacRehabExercise && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Projected Outcomes & Comparative Deltas */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Projected Post-Treatment Impact
            </span>
            {isSimulating && (
              <span className="text-[10px] font-mono text-indigo-400 animate-pulse">Calculating SHAP delta...</span>
            )}
          </div>

          {/* Overall CAD Comparison Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-white">Overall CAD Risk Probability</span>
              <div className="flex items-center space-x-1.5 font-mono">
                <span className="text-slate-400 line-through">{cadBaseline}%</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-emerald-400 font-bold text-sm">{cadProjected}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Absolute Risk Delta: {cadDelta}%</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px]">
                Projected NNT: <strong className="text-white">{estimatedNNT}</strong>
              </div>
            </div>
          </div>

          {/* Vessel-by-Vessel Stenosis Deltas */}
          <div className="space-y-2">
            {/* LAD */}
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="font-medium text-slate-300">LAD (Anterior Wall)</span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-slate-500 line-through text-[11px]">{ladBaseline}%</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                <span className="text-white font-bold">{ladProjected}%</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ladDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>
                  {ladDelta}%
                </span>
              </div>
            </div>

            {/* LCX */}
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="font-medium text-slate-300">LCX (Lateral / Posterior)</span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-slate-500 line-through text-[11px]">{lcxBaseline}%</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                <span className="text-white font-bold">{lcxProjected}%</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${lcxDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>
                  {lcxDelta}%
                </span>
              </div>
            </div>

            {/* RCA */}
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="font-medium text-slate-300">RCA (Inferior / Crux)</span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-slate-500 line-through text-[11px]">{rcaBaseline}%</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                <span className="text-white font-bold">{rcaProjected}%</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rcaDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>
                  {rcaDelta}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Commit to Patient Profile */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleCommitToPatient}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Counterfactual Profile to Clinical Inputs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

