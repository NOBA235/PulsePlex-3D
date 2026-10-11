import React, { useState } from 'react';
import {
  PredictResponse,
  MetricsMap,
  ShapExplanation,
  VesselRiskInfo,
} from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

interface DashboardProps {
  prediction: PredictResponse | null;
  metrics: MetricsMap | null;
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  prediction,
  metrics,
  selectedVessel,
  onSelectVessel,
}) => {
  const [explainTarget, setExplainTarget] = useState<'CAD' | 'LAD' | 'LCX' | 'RCA'>('CAD');

  if (!prediction) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <HelpCircle className="w-10 h-10 text-slate-500 mb-3 animate-bounce" />
        <h3 className="text-base font-semibold text-slate-300">Awaiting Patient Assessment</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Adjust the clinical parameters on the left or select a preset profile to generate multi-vessel predictions and SHAP explainability.
        </p>
      </div>
    );
  }

  // Active SHAP explanation based on selected target tab
  const activeExplanation: ShapExplanation | undefined = prediction.shap_explanations[explainTarget];

  // Prepare SHAP chart data
  const chartData = (activeExplanation?.top_features || []).map((f) => ({
    name: f.display_name.length > 28 ? f.display_name.slice(0, 26) + '...' : f.display_name,
    fullName: f.display_name,
    shap: f.shap_value,
    patientValue: f.patient_value,
    direction: f.direction,
  })).reverse(); // Reverse for top-down bar chart

  return (
    <div className="space-y-5">
      {/* ================= SECTION 1: RISK SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* Overall CAD Status */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Overall CAD Status</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${prediction.cad_risk_color}22`,
                color: prediction.cad_risk_color,
                border: `1px solid ${prediction.cad_risk_color}44`,
              }}
            >
              {prediction.cad_risk_category} Risk
            </span>
          </div>

          <div className="my-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {prediction.cad_percentage}%
            </span>
            <span className="text-xs text-slate-400">Probability</span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(prediction.cad_percentage, 100)}%`,
                  backgroundColor: prediction.cad_risk_color,
                }}
              ></div>
            </div>
            <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between pt-1">
              <span>{prediction.vascular_pattern}</span>
            </div>
          </div>
        </div>

        {/* Individual Vessels: LAD, LCX, RCA */}
        {(['LAD', 'LCX', 'RCA'] as const).map((vKey) => {
          const v = prediction.vessels[vKey];
          const isSelected = selectedVessel === vKey;

          return (
            <div
              key={vKey}
              onClick={() => onSelectVessel(isSelected ? null : vKey)}
              className={`bg-[#111827] rounded-2xl p-4 shadow-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-900/90'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }}></span>
                  <span className="text-white font-bold">{vKey} Stenosis</span>
                </div>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: `${v.color}22`, color: v.color }}
                >
                  {v.risk_category}
                </span>
              </div>

              <div className="my-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold font-mono text-white">{v.stenosis_percentage}%</span>
                  <span className="text-[10px] text-slate-400 ml-1">Risk</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {v.stenotic ? '≥50% Narrowed' : '<50% Narrowed'}
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(v.stenosis_percentage, 100)}%`,
                    backgroundColor: v.color,
                  }}
                ></div>
              </div>

              <div className="text-[10px] text-slate-400 truncate flex items-center justify-between">
                <span>{v.anatomical_territory.split(' ')[0]} territory</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= SECTION 2: SHAP EXPLAINABILITY PANEL ================= */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                SHAP Local Feature Attributions (Explainability)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              TreeExplainer breakdown showing individualized clinical drivers for this patient.
            </p>
          </div>

          {/* Target Explainer Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['CAD', 'LAD', 'LCX', 'RCA'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setExplainTarget(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  explainTarget === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'CAD' ? 'Overall CAD' : `${t} Artery`}
              </button>
            ))}
          </div>
        </div>

        {activeExplanation ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Horizontal Diverging SHAP Bar Chart */}
            <div className="lg:col-span-8 h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    width={135}
                  />
                  <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs">
                            <div className="font-bold text-white mb-1">{data.fullName}</div>
                            <div className="flex justify-between space-x-4 text-slate-300">
                              <span>SHAP Attribution:</span>
                              <span
                                className={`font-mono font-bold ${
                                  data.shap > 0 ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {data.shap > 0 ? `+${data.shap}` : data.shap}
                              </span>
                            </div>
                            <div className="flex justify-between space-x-4 text-slate-400 mt-0.5">
                              <span>Patient Measured Value:</span>
                              <span className="font-mono text-white">{data.patientValue}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {data.shap > 0 ? '🔺 Pushes risk higher' : '🟢 Protective (reduces risk)'}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="shap" radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.shap > 0 ? '#ef4444' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Drivers Narrative Panel */}
            <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Dominant Risk Drivers</span>
                <span className="text-[10px] text-slate-400 font-mono">Baseline: {activeExplanation.base_value}</span>
              </div>

              {/* Top Risk Increasing Features */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-rose-400 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Risk Escalation Factors (+SHAP)</span>
                </div>
                {activeExplanation.risk_drivers.slice(0, 3).map((f) => (
                  <div
                    key={f.feature}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="text-slate-200 font-medium text-[11px] block truncate">
                        {f.display_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Val: {f.patient_value}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-400 text-xs">+{f.shap_value}</span>
                  </div>
                ))}
              </div>

              {/* Top Protective Features */}
              {activeExplanation.protective_factors.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold uppercase text-emerald-400 flex items-center space-x-1">
                    <TrendingDown className="w-3 h-3" />
                    <span>Protective Factors (-SHAP)</span>
                  </div>
                  {activeExplanation.protective_factors.slice(0, 2).map((f) => (
                    <div
                      key={f.feature}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="text-slate-200 font-medium text-[11px] block truncate">
                          {f.display_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Val: {f.patient_value}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-xs">{f.shap_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500">
            No SHAP attribution generated for target {explainTarget}.
          </div>
        )}
      </div>

      {/* ================= SECTION 3: MODEL PERFORMANCE & CLINICAL METRICS ================= */}
      {metrics && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Empirical Model Validation Benchmarks (Z-Alizadeh Sani Test Set)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Target Endpoint</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Precision</th>
                  <th className="py-2.5 px-3">Recall</th>
                  <th className="py-2.5 px-3">F1-Score</th>
                  <th className="py-2.5 px-3">ROC-AUC</th>
                  <th className="py-2.5 px-3">5-Fold CV ROC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {Object.entries(metrics).map(([key, m]) => (
                  <tr key={key} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">
                      {key === 'CAD' ? 'Overall CAD' : `${key} Stenosis`}
                    </td>
                    <td className="py-2.5 px-3">{(m.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-400">{m.f1_score.toFixed(3)}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{m.roc_auc.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.cv_mean_roc_auc.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

