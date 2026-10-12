import React, { useState } from 'react';
import { VesselRiskInfo } from '../services/api';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  Droplet,
  ArrowRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface PlaqueCutawayModalProps {
  vesselKey: 'LAD' | 'LCX' | 'RCA' | null;
  vesselInfo: VesselRiskInfo | null;
  onClose: () => void;
  isStented?: boolean;
  onToggleStent?: (vesselKey: 'LAD' | 'LCX' | 'RCA', stented: boolean) => void;
}

export const PlaqueCutawayModal: React.FC<PlaqueCutawayModalProps> = ({
  vesselKey,
  vesselInfo,
  onClose,
  isStented: externalStented = false,
  onToggleStent,
}) => {
  const [internalStented, setInternalStented] = useState<boolean>(externalStented);
  const isStented = onToggleStent ? externalStented : internalStented;

  if (!vesselKey || !vesselInfo) return null;

  const baseMetrics = vesselInfo.plaque_metrics || {
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

  // If stented, calculate post-procedural restored metrics
  const stenosisPct = isStented ? 8 : vesselInfo.stenosis_percentage;
  const mld = isStented ? +(baseMetrics.reference_diameter_mm * 0.92).toFixed(2) : baseMetrics.minimal_lumen_diameter_mm;
  const mla = isStented ? +(Math.PI * Math.pow(mld / 2, 2)).toFixed(2) : baseMetrics.minimal_lumen_area_mm2;
  const ffr = isStented ? 0.96 : baseMetrics.hemodynamic_ffr_estimate;
  const acuteGain = isStented ? +(mld - baseMetrics.minimal_lumen_diameter_mm).toFixed(2) : 0;

  // SVG cross-section dimensions
  const outerRadius = 80; // mm visual scale
  const lumenRatio = isStented ? 0.82 : Math.max(0.18, 1 - vesselInfo.stenosis_percentage / 100);
  const lumenRadius = outerRadius * Math.sqrt(lumenRatio);
  const lumenCenterX = isStented ? 0 : outerRadius * 0.22 * (1 - lumenRatio);
  const lumenCenterY = isStented ? 0 : outerRadius * 0.18 * (1 - lumenRatio);

  const handleToggle = () => {
    const next = !isStented;
    setInternalStented(next);
    if (onToggleStent && vesselKey) {
      onToggleStent(vesselKey, next);
    }
  };

  // Stent strut coordinates around circular expanded lumen
  const strutCount = 14;
  const struts = Array.from({ length: strutCount }, (_, idx) => {
    const angle = (idx / strutCount) * Math.PI * 2;
    return {
      x: lumenCenterX + Math.cos(angle) * (lumenRadius - 2),
      y: lumenCenterY + Math.sin(angle) * (lumenRadius - 2),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#070b14] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-lg"
              style={{
                backgroundColor: isStented ? '#10b981' : vesselInfo.color,
                boxShadow: `0 0 12px ${isStented ? '#10b981' : vesselInfo.color}`,
              }}
            ></div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{vesselKey} Coronary Cross-Section & Plaque Inspector</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: isStented ? '#10b98122' : `${vesselInfo.color}22`,
                    color: isStented ? '#34d399' : vesselInfo.color,
                  }}
                >
                  {isStented ? 'Stented (Patent)' : `${vesselInfo.risk_category} Risk`}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                CCTA Multi-Window Morphology & Attenuation (CORA Framework Reference)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* PCI Stenting Simulator Toggle Button */}
            <button
              type="button"
              onClick={handleToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border shadow-sm ${
                isStented
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isStented ? 'Stent Deployed (Reset)' : 'Simulate PCI Stent'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Grid: Cross-Section Graphic + Key Readouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* SVG Cross-Section Illustration */}
            <div className="flex flex-col items-center justify-center bg-slate-950/60 p-4 rounded-xl border border-slate-800 relative">
              <div className="flex items-center justify-between w-full mb-2 px-1">
                <span className="text-[11px] font-mono font-medium text-slate-400">
                  Minimal Lumen Area (MLA) Cutaway
                </span>
                {isStented && (
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800">
                    DES 3.0 x 18 mm
                  </span>
                )}
              </div>

              <svg width="200" height="200" viewBox="-100 -100 200 200" className="drop-shadow-lg">
                {/* Outer Vessel Wall (Adventitia) */}
                <circle cx="0" cy="0" r={outerRadius} fill="#1e293b" stroke="#475569" strokeWidth="3" />

                {/* Media / Vessel Wall Thickness */}
                <circle cx="0" cy="0" r={outerRadius - 4} fill="#334155" stroke="#64748b" strokeWidth="1" />

                {/* Plaque Mass (Atheroma background compressed outward if stented) */}
                <circle
                  cx="0"
                  cy="0"
                  r={outerRadius - 8}
                  fill="#ca8a04"
                  opacity={isStented ? 0.25 : 0.45}
                />

                {/* Soft Lipid Core (Low Attenuation Plaque) */}
                {!isStented && (
                  <path
                    d={`M -20 -60 Q 40 -60 50 -10 Q 55 40 20 60 Q -50 40 -40 -10 Z`}
                    fill="#f59e0b"
                    opacity="0.8"
                  />
                )}

                {/* Calcified Plaque Deposit */}
                {baseMetrics.calcified_percentage > 15 && !isStented && (
                  <path
                    d={`M -55 -25 Q -40 -60 -10 -55 Q -30 -30 -50 -10 Z`}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                  />
                )}

                {/* Compressed Plaque Ring if Stented */}
                {isStented && (
                  <circle
                    cx="0"
                    cy="0"
                    r={lumenRadius + 5}
                    fill="none"
                    stroke="#ca8a04"
                    strokeWidth="4"
                    opacity="0.6"
                  />
                )}

                {/* Patent Lumen */}
                <circle
                  cx={lumenCenterX}
                  cy={lumenCenterY}
                  r={lumenRadius}
                  fill={isStented ? '#047857' : '#b91c1c'}
                  stroke={isStented ? '#10b981' : '#ef4444'}
                  strokeWidth="2.5"
                  className={isStented ? '' : 'animate-pulse'}
                />

                {/* Center marker */}
                <circle cx={lumenCenterX} cy={lumenCenterY} r="3" fill="#fca5a5" />

                {/* Stent Struts (Metallic circular markers) */}
                {isStented &&
                  struts.map((s, idx) => (
                    <g key={idx}>
                      <circle cx={s.x} cy={s.y} r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
                      <circle cx={s.x} cy={s.y} r="4.5" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.7" />
                    </g>
                  ))}

                {/* Measurement line */}
                <line
                  x1={lumenCenterX - lumenRadius}
                  y1={lumenCenterY}
                  x2={lumenCenterX + lumenRadius}
                  y2={lumenCenterY}
                  stroke="#ffffff"
                  strokeDasharray="2,2"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Cross-section Legend */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] w-full text-center">
                <div className="flex items-center space-x-1 justify-center">
                  <span className={`w-2 h-2 rounded-full ${isStented ? 'bg-emerald-500' : 'bg-red-600'}`}></span>
                  <span className="text-slate-300">{isStented ? 'Patent Lumen' : 'Residual Lumen'}</span>
                </div>
                <div className="flex items-center space-x-1 justify-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-300">{isStented ? 'Compressed Plaque' : 'Lipid Core'}</span>
                </div>
                <div className="flex items-center space-x-1 justify-center">
                  <span className={`w-2 h-2 rounded-full ${isStented ? 'bg-cyan-400' : 'bg-slate-100'}`}></span>
                  <span className="text-slate-300">{isStented ? 'Stent Struts' : 'Calcium (Dense)'}</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Stenosis Severity</span>
                  <span className={`font-mono font-bold ${isStented ? 'text-emerald-400' : 'text-white'}`}>
                    {stenosisPct}% Diameter Narrowing {isStented ? '(Post-PCI)' : ''}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(stenosisPct, 100)}%`,
                      backgroundColor: isStented ? '#10b981' : vesselInfo.color,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Ref Diameter: {baseMetrics.reference_diameter_mm} mm</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    MLD: {mld} mm {isStented ? `(+${acuteGain} mm)` : ''}
                  </span>
                </div>
              </div>

              {/* Hemodynamic FFR & Flow Reserve */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Minimal Lumen Area</span>
                  <span className="font-mono font-bold text-white text-sm">{mla} mm²</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isStented ? 'Optimal Apposition' : mla < 4.0 ? 'Ischemic (MLA < 4.0)' : 'Non-flow limiting'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Hemodynamic FFR</span>
                  <span className={`font-mono font-bold text-sm ${ffr >= 0.8 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ffr}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {ffr >= 0.8 ? 'Normal (Non-Ischemic)' : 'Ischemic Deficit (≤0.80)'}
                  </span>
                </div>
              </div>

              {/* Plaque Composition or Post-PCI Summary */}
              {isStented ? (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Post-PCI Drug-Eluting Stent (DES) Outcome</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Acute luminal gain of +{acuteGain} mm achieved. FFR restored to {ffr}. Guideline recommendation:
                    Dual Antiplatelet Therapy (DAPT) with Aspirin 81mg + Ticagrelor 90mg BID for 12 months.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Plaque Volume & Atheroma Phenotype
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Plaque Vol:</span>
                    <span className="text-white font-bold">{baseMetrics.plaque_volume_mm3} mm³</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Lesion Length:</span>
                    <span className="text-white font-bold">{baseMetrics.lesion_length_mm} mm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vulnerability Alert / Clinical Recommendation */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
              isStented
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : baseMetrics.is_vulnerable_plaque
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {isStented ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : baseMetrics.is_vulnerable_plaque ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold mb-0.5">
                {isStented
                  ? 'Vessel Patency Restored via Percutaneous Coronary Intervention'
                  : baseMetrics.is_vulnerable_plaque
                  ? 'High-Risk Vulnerable Plaque Profile Detected (SCCT Criteria)'
                  : 'Stable / Non-Vulnerable Plaque Morphology'}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isStented
                  ? `Stent fully expanded and apposed to the ${vesselKey} arterial wall. Intracoronary flow restored to normal velocity without pressure drop.`
                  : baseMetrics.is_vulnerable_plaque
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
