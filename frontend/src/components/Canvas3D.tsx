import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HeartMesh, CTViewMode } from './HeartMesh';
import { VesselRiskInfo, CadRadsClassification } from '../services/api';
import { PlaqueCutawayModal } from './PlaqueCutawayModal';
import { ECGMonitor } from './ECGMonitor';
import {
  RotateCcw,
  Layers,
  Sparkles,
  Droplet,
  Eye,
  Activity,
  Maximize2,
  FileText,
} from 'lucide-react';

interface Canvas3DProps {
  vessels: {
    LAD: VesselRiskInfo;
    LCX: VesselRiskInfo;
    RCA: VesselRiskInfo;
  };
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | null) => void;
  isBeating: boolean;
  onToggleBeating: () => void;
  patientVitals?: {
    pr?: number;
    bp?: number;
    st_depression?: boolean;
    st_elevation?: boolean;
  };
  cadRads?: CadRadsClassification;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  isBeating,
  onToggleBeating,
  patientVitals,
  cadRads,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [viewMode, setViewMode] = useState<CTViewMode>('anatomical');
  const [inspectModalVessel, setInspectModalVessel] = useState<'LAD' | 'LCX' | 'RCA' | null>(null);

  // Anatomical camera angle presets
  const setCameraView = (view: 'anterior' | 'lateral' | 'inferior' | 'reset') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (view) {
      case 'anterior': // LAD / RAO Cranial view
        controls.object.position.set(0.2, 0.1, 3.8);
        controls.target.set(0, 0, 0);
        break;
      case 'lateral': // LCX / LAO Caudal Spider view
        controls.object.position.set(3.4, 0.6, 1.2);
        controls.target.set(0, 0, 0);
        break;
      case 'inferior': // RCA / LAO Cranial view
        controls.object.position.set(-3.2, -0.6, 1.8);
        controls.target.set(0, 0, 0);
        break;
      case 'reset':
      default:
        controls.object.position.set(1.5, 0.8, 3.5);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  };

  const handleOpenInspector = (v: 'LAD' | 'LCX' | 'RCA') => {
    setInspectModalVessel(v);
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-[#0b101d] via-[#070b14] to-[#04060c] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* ================= TOP TOOLBAR ================= */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Badges: Mode & CAD-RADS */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-bold text-white tracking-wide">3D Coronary Anatomy & Plaque Engine</span>
          </div>

          {cadRads && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-indigo-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-indigo-700/50 text-indigo-300 shadow-lg text-xs font-mono font-bold">
              <span>{cadRads.grade}</span>
            </div>
          )}
        </div>

        {/* Right Controls: CT Window Modes & View Presets */}
        <div className="flex items-center flex-wrap gap-1.5 pointer-events-auto">
          {/* CT Window Mode Switcher (CORA Direct Feature) */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg text-xs">
            <button
              onClick={() => setViewMode('anatomical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'anatomical' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Photorealistic Heart Anatomy"
            >
              <span>🫀 Anatomy</span>
            </button>
            <button
              onClick={() => setViewMode('angio')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'angio' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="CCTA Angiographic Lumen Contrast (CORA 350/700 HU)"
            >
              <span>💉 CCTA Angio</span>
            </button>
            <button
              onClick={() => setViewMode('calcium')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'calcium' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Dense Calcium & Atheroma Scoring (CORA 500/2000 HU)"
            >
              <span>⚡ Calcium HU</span>
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'flow' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Hemodynamic Flow Velocity Dynamics"
            >
              <span>🌊 Flow</span>
            </button>
          </div>

          {/* Camera Angles */}
          <div className="flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg text-xs">
            <button
              onClick={() => setCameraView('anterior')}
              className="px-2 py-1 text-[11px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Focus Anterior / LAD"
            >
              LAD
            </button>
            <button
              onClick={() => setCameraView('lateral')}
              className="px-2 py-1 text-[11px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Focus Lateral / LCX"
            >
              LCX
            </button>
            <button
              onClick={() => setCameraView('inferior')}
              className="px-2 py-1 text-[11px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Focus Right / RCA"
            >
              RCA
            </button>
            <button
              onClick={() => setCameraView('reset')}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Reset Viewpoint"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleBeating}
              className={`px-2 py-1 text-[11px] rounded-lg font-medium transition flex items-center space-x-1 ${
                isBeating ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle Cardiac Rhythm"
            >
              <span>{isBeating ? 'Beating' : 'Paused'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= THREE.JS CANVAS ================= */}
      <div className="flex-1 w-full h-full canvas-container">
        <Canvas gl={{ antialias: true, alpha: true }}>
          <PerspectiveCamera makeDefault position={[1.5, 0.8, 3.5]} fov={45} />
          <ambientLight intensity={viewMode === 'calcium' ? 0.4 : 0.95} />
          <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
          <directionalLight position={[-5, -4, -4]} intensity={0.7} color="#60a5fa" />
          <pointLight position={[0, 2, 2.5]} intensity={0.9} color="#ffffff" />
          <pointLight position={[-2, -1, -2]} intensity={0.5} color="#ec4899" />

          <Center>
            <HeartMesh
              vessels={vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={onSelectVessel}
              isBeating={isBeating}
              viewMode={viewMode}
              onInspectLesion={handleOpenInspector}
            />
          </Center>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={1.8}
            maxDistance={7.5}
            rotateSpeed={0.8}
            zoomSpeed={0.8}
          />
        </Canvas>
      </div>

      {/* ================= BOTTOM OVERLAY: ECG MONITOR & QUICK INSPECT BAR ================= */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col md:flex-row items-center justify-between gap-2.5 pointer-events-none">
        {/* Real-Time Synced Lead II ECG Strip */}
        <ECGMonitor
          bpm={patientVitals?.pr || 75}
          isBeating={isBeating}
          hasStDepression={patientVitals?.st_depression}
          hasStElevation={patientVitals?.st_elevation}
        />

        {/* Vessel Plaque Inspector Launcher Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-xl pointer-events-auto">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Vessels:</span>
          {(['LAD', 'LCX', 'RCA'] as const).map((v) => {
            const vData = vessels[v];
            const isSelected = selectedVessel === v;
            return (
              <div key={v} className="flex items-center space-x-1">
                <button
                  onClick={() => onSelectVessel(isSelected ? null : v)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={`Focus ${v}`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: vData.color }}
                  ></span>
                  <span>{v}</span>
                  <span className="text-[10px] opacity-80">{vData.stenosis_percentage}%</span>
                </button>

                {/* Direct Cross-Section Inspector Button */}
                <button
                  onClick={() => handleOpenInspector(v)}
                  className="p-1 rounded bg-slate-800/60 hover:bg-indigo-600 hover:text-white text-slate-400 transition"
                  title={`Open ${v} Plaque Cross-Section Cutaway`}
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CROSS-SECTION CUTAWAY MODAL ================= */}
      {inspectModalVessel && (
        <PlaqueCutawayModal
          vesselKey={inspectModalVessel}
          vesselInfo={vessels[inspectModalVessel]}
          onClose={() => setInspectModalVessel(null)}
        />
      )}
    </div>
  );
};
