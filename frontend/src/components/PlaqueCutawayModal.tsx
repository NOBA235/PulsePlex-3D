import React from 'react';
import { VesselRiskInfo } from '../services/api';
import { X, AlertTriangle, ShieldCheck, Activity, Layers, Droplet, ArrowRight } from 'lucide-react';

interface PlaqueCutawayModalProps {
  vesselKey: 'LAD' | 'LCX' | 'RCA' | null;
  vesselInfo: VesselRiskInfo | null;
  onClose: () => void;
}

export const PlaqueCutawayModal: React.FC<PlaqueCutawayModalProps> = ({
  vesselKey,
  vesselInfo,
  onClose,
}) => {
  if (!vesselKey || !vesselInfo) return null;

  const m = vesselInfo.plaque_metrics || {
    reference_diameter_mm: vesselKey === 'LAD' ? 3.6 : vesselKey === 'LCX' ? 3.2 : 3.8,
    minimal_lumen_diameter_mm: +(
      (vesselKey === 'LAD' ? 3.6 : vesselKey === 'LCX' ? 3.2 : 3.8) *
      (1 - (vesselInfo.stenosis_percentage / 100) * 0.85)
    ).toFixed(2),
    reference_area_mm2: 10.18,
    minimal_lumen_area_mm2: +(
      Math.PI * Math.pow(((vesselKey === 'LAD' ? 3.6 : vesselKey === 'LCX' ? 3.2 : 3.8) * (1 - (vesselInfo.stenosis_percentage / 100) * 0.85)) / 2, 2)
    ).toFixed(2),
    area_stenosis_percentage: vesselInfo.stenosis_percentage,
    lesion_length_mm: +(8.0 + (vesselInfo.stenosis_percentage / 100) * 16.0).toFixed(1),
    plaque_volume_mm3: 42.5,
    calcified_percentage: 38.0,
    soft_lipid_percentage: 34.0,
    fibrous_percentage: 28.0,
    calcified_hu: 980,
    soft_lipid_hu: 45,
    is_vulnerable_plaque: vesselInfo.stenosis_percentage >= 50,
    hemodynamic_ffr_estimate: +(1.0 - (vesselInfo.stenosis_percentage / 100) * 0.58).toFixed(2),
  };

  const stenosisPct = vesselInfo.stenosis_percentage;
  const isHighRisk = stenosisPct >= 60;
  const isModerate = stenosisPct >= 30 && stenosisPct < 60;

  // SVG cross-section dimensions
  const outerRadius = 80; // mm visual scale
  const lumenRatio = Math.max(0.18, 1 - stenosisPct / 100);
  const lumenRadius = outerRadius * Math.sqrt(lumenRatio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#070b14] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-lg"
              style={{ backgroundColor: vesselInfo.color, boxShadow: `0 0 12px ${vesselInfo.color}` }}
            ></div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{vesselKey} Coronary Cross-Section & Plaque Inspector</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${vesselInfo.color}22`, color: vesselInfo.color }}
                >
                  {vesselInfo.risk_category} Risk
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                CCTA Multi-Window Morphology & Attenuation (CORA Framework Reference)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Grid: Cross-Section Graphic + Key Readouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* SVG Cross-Section Illustration */}
            <div className="flex flex-col items-center justify-center bg-slate-950/60 p-4 rounded-xl border border-slate-800 relative">
              <span className="text-[11px] font-mono font-medium text-slate-400 mb-2">
                Minimal Lumen Area (MLA) Cutaway
              </span>
              <svg width="200" height="200" viewBox="-100 -100 200 200" className="drop-shadow-lg">
                {/* Outer Vessel Wall (Adventitia) */}
                <circle cx="0" cy="0" r={outerRadius} fill="#1e293b" stroke="#475569" strokeWidth="3" />

                {/* Media / Vessel Wall Thickness */}
                <circle cx="0" cy="0" r={outerRadius - 4} fill="#334155" stroke="#64748b" strokeWidth="1" />

                {/* Plaque Mass (Atheroma background) */}
                <circle cx="0" cy="0" r={outerRadius - 8} fill="#ca8a04" opacity="0.45" />

                {/* Soft Lipid Core (Low Attenuation Plaque) */}
                <path
                  d={`M -20 -60 Q 40 -60 50 -10 Q 55 40 20 60 Q -50 40 -40 -10 Z`}
                  fill="#f59e0b"
                  opacity="0.8"
                />

                {/* Calcified Plaque Deposit (CORA High HU Dense Core) */}
                {m.calcified_percentage > 15 && (
                  <path
                    d={`M -55 -25 Q -40 -60 -10 -55 Q -30 -30 -50 -10 Z`}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                  />
                )}

                {/* Residual Patent Lumen (Eccentric Narrowing) */}
                <circle
                  cx={outerRadius * 0.22 * (1 - lumenRatio)}
                  cy={outerRadius * 0.18 * (1 - lumenRatio)}
                  r={lumenRadius}
                  fill="#b91c1c"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />

                {/* Center marker */}
                <circle
                  cx={outerRadius * 0.22 * (1 - lumenRatio)}
                  cy={outerRadius * 0.18 * (1 - lumenRatio)}
                  r="3"
                  fill="#fca5a5"
                />

                {/* Labels & Measurement lines */}
                <line
                  x1={outerRadius * 0.22 * (1 - lumenRatio) - lumenRadius}
                  y1={outerRadius * 0.18 * (1 - lumenRatio)}
                  x2={outerRadius * 0.22 * (1 - lumenRatio) + lumenRadius}
                  y2={outerRadius * 0.18 * (1 - lumenRatio)}
                  stroke="#ffffff"
                  strokeDasharray="2,2"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Cross-section Legend */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] w-full text-center">
                <div className="flex items-center space-x-1 justify-center">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span className="text-slate-300">Patent Lumen</span>
                </div>
                <div className="flex items-center space-x-1 justify-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-300">Lipid Core</span>
                </div>
                <div className="flex items-center space-x-1 justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-100"></span>
                  <span className="text-slate-300">Calcium (HU 900+)</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Stenosis Severity</span>
                  <span className="font-mono text-white font-bold">{stenosisPct}% Diameter Stenosis</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(stenosisPct, 100)}%`, backgroundColor: vesselInfo.color }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Ref: {m.reference_diameter_mm} mm</span>
                  <span className="text-white font-semibold">Min: {m.minimal_lumen_diameter_mm} mm</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Min Lumen Area (MLA)</span>
                  <span className="text-base font-bold font-mono text-white">
                    {m.minimal_lumen_area_mm2} <span className="text-[10px] text-slate-400">mm²</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Ref: {m.reference_area_mm2} mm²</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Est. FFR Index</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      m.hemodynamic_ffr_estimate <= 0.8 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {m.hemodynamic_ffr_estimate}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {m.hemodynamic_ffr_estimate <= 0.8 ? 'Ischemia (≤0.80)' : 'Non-ischemic (>0.80)'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Lesion Length</span>
                  <span className="text-base font-bold font-mono text-white">
                    {m.lesion_length_mm} <span className="text-[10px] text-slate-400">mm</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Total plaque segment</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Plaque Burden Vol</span>
                  <span className="text-base font-bold font-mono text-white">
                    {m.plaque_volume_mm3} <span className="text-[10px] text-slate-400">mm³</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Atheroma mass</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tissue Attenuation & Multi-Window Composition (CORA Direct Influence) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Plaque Composition & Hounsfield Unit (HU) Spectral Breakdown</span>
            </div>

            {/* Stacked bar representation */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                <div
                  style={{ width: `${m.calcified_percentage}%` }}
                  className="bg-slate-100 transition-all"
                  title={`Calcified: ${m.calcified_percentage}%`}
                ></div>
                <div
                  style={{ width: `${m.soft_lipid_percentage}%` }}
                  className="bg-amber-500 transition-all"
                  title={`Soft Lipid: ${m.soft_lipid_percentage}%`}
                ></div>
                <div
                  style={{ width: `${m.fibrous_percentage}%` }}
                  className="bg-indigo-400 transition-all"
                  title={`Fibrous: ${m.fibrous_percentage}%`}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center space-x-1 text-slate-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-100"></span>
                    <span>Calcified</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{m.calcified_percentage}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">HU: {m.calcified_hu} (Dense)</div>
                </div>

                <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center space-x-1 text-amber-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Soft Lipid Core</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">{m.soft_lipid_percentage}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">HU: {m.soft_lipid_hu} (Low Atten)</div>
                </div>

                <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center space-x-1 text-indigo-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Fibrous Stroma</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">{m.fibrous_percentage}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">HU: 110-180</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerability Alert / Clinical Recommendation */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
              m.is_vulnerable_plaque
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {m.is_vulnerable_plaque ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold mb-0.5">
                {m.is_vulnerable_plaque
                  ? 'High-Risk Vulnerable Plaque Profile Detected (SCCT Criteria)'
                  : 'Stable / Non-Vulnerable Plaque Morphology'}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {m.is_vulnerable_plaque
                  ? `Low attenuation plaque (<30-50 HU) and positive vessel remodeling detected in the ${vesselKey}. Increased vulnerability for acute rupture. Recommend aggressive statin intensification and cardiology review.`
                  : `Predominantly calcified or stable fibrous stroma without napkin-ring signs. Low acute rupture propensity.`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Territory: <strong className="text-white">{vesselInfo.anatomical_territory}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

