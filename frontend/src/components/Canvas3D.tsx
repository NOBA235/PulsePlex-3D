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
    <div className="research-canvas relative w-full h-full min-h-[500px] bg-[#f6f7f5] rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
      {/* ================= TOP TOOLBAR ================= */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Badges: Mode & CAD-RADS */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-700"></span>
            <span className="text-xs font-semibold text-slate-800 tracking-wide">Interactive cardiac anatomy</span>
            <span className="text-[10px] text-slate-500">· schematic · hover to identify</span>
          </div>

          {cadRads && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-mono font-semibold">
              <span>{cadRads.grade}</span>
            </div>
          )}
        </div>

        {/* Right Controls: CT Window Modes & View Presets */}
        <div className="flex items-center flex-wrap gap-1.5 pointer-events-auto">
          {/* CT Window Mode Switcher (CORA Direct Feature) */}
          <div className="flex items-center bg-white/95 p-1 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setViewMode('anatomical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'anatomical' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Anatomical schematic"
            >
              <span>Anatomy</span>
            </button>
            <button
              onClick={() => setViewMode('angio')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'angio' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Angiographic display mode"
            >
              <span>Angio</span>
            </button>
            <button
              onClick={() => setViewMode('calcium')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'calcium' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Calcium display mode"
            >
              <span>Calcium</span>
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
                viewMode === 'flow' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Illustrative flow display"
            >
              <span>Flow</span>
            </button>
          </div>

          {/* Camera Angles */}
          <div className="flex items-center space-x-1 bg-white/95 p-1 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setCameraView('anterior')}
              className="px-2 py-1 text-[11px] rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Focus Anterior / LAD"
            >
              LAD
            </button>
            <button
              onClick={() => setCameraView('lateral')}
              className="px-2 py-1 text-[11px] rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Focus Lateral / LCX"
            >
              LCX
            </button>
            <button
              onClick={() => setCameraView('inferior')}
              className="px-2 py-1 text-[11px] rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Focus Right / RCA"
            >
              RCA
            </button>
            <button
              onClick={() => setCameraView('reset')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
              title="Reset Viewpoint"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleBeating}
              className={`px-2 py-1 text-[11px] rounded-lg font-medium transition flex items-center space-x-1 ${
                isBeating ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'text-slate-500 hover:bg-slate-100'
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
          <ambientLight intensity={viewMode === 'calcium' ? 0.55 : 1.05} />
          <directionalLight position={[5, 8, 5]} intensity={1.25} castShadow />
          <directionalLight position={[-5, -4, -4]} intensity={0.45} color="#d7e0e5" />
          <pointLight position={[0, 2, 2.5]} intensity={0.35} color="#ffffff" />

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
        <div className="flex items-center space-x-1.5 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-300 pointer-events-auto">
          <span className="text-[11px] text-slate-600 font-medium mr-1">Coronaries:</span>
          {(['LAD', 'LCX', 'RCA'] as const).map((v) => {
            const vData = vessels[v];
            const isSelected = selectedVessel === v;
            return (
              <div key={v} className="flex items-center space-x-1">
                <button
                  onClick={() => onSelectVessel(isSelected ? null : v)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
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
