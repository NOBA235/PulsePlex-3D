import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HeartMesh } from './HeartMesh';
import { VesselRiskInfo } from '../services/api';
import { Eye, RotateCcw, Activity, Info } from 'lucide-react';

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
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  isBeating,
  onToggleBeating,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Camera presets
  const setCameraView = (view: 'anterior' | 'lateral' | 'inferior' | 'reset') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (view) {
      case 'anterior': // Front / LAD view
        controls.object.position.set(0, 0, 3.8);
        controls.target.set(0, 0, 0);
        break;
      case 'lateral': // Left side / LCX view
        controls.object.position.set(3.5, 0.5, 1.2);
        controls.target.set(0, 0, 0);
        break;
      case 'inferior': // Right side / RCA view
        controls.object.position.set(-3.2, -0.8, 1.8);
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

  return (
    <div className="relative w-full h-full min-h-[460px] bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#050811] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Header & View Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Interactive 3D Coronary Anatomy</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            onClick={() => setCameraView('anterior')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Focus Anterior Sulcus / LAD"
          >
            Anterior (LAD)
          </button>
          <button
            onClick={() => setCameraView('lateral')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Focus Left Lateral / LCX"
          >
            Lateral (LCX)
          </button>
          <button
            onClick={() => setCameraView('inferior')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Focus Inferior / RCA"
          >
            Right/Inferior (RCA)
          </button>
          <button
            onClick={() => setCameraView('reset')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleBeating}
            className={`px-2 py-1 text-xs font-medium rounded-lg transition flex items-center space-x-1 ${
              isBeating ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle heart beat animation"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping"></span>
            <span>{isBeating ? 'Beating' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* R3F Canvas */}
      <div className="flex-1 w-full h-full canvas-container">
        <Canvas gl={{ antialias: true, alpha: true }}>
          <PerspectiveCamera makeDefault position={[1.5, 0.8, 3.5]} fov={45} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-5, -4, -4]} intensity={0.6} color="#60a5fa" />
          <pointLight position={[0, 2, 2]} intensity={0.8} color="#ffffff" />

          <Center>
            <HeartMesh
              vessels={vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={onSelectVessel}
              isBeating={isBeating}
            />
          </Center>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={2.0}
            maxDistance={7.0}
            rotateSpeed={0.8}
            zoomSpeed={0.8}
          />
        </Canvas>
      </div>

      {/* Bottom Floating Legend & Vessel Focus Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
        {/* Risk Level Color Palette */}
        <div className="flex items-center space-x-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-lg text-xs pointer-events-auto">
          <span className="text-slate-400 font-medium">Risk Mapping:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="text-slate-300 text-[11px] font-medium">&lt;30% Low</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span>
            <span className="text-slate-300 text-[11px] font-medium">30-60% Moderate</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
            <span className="text-slate-300 text-[11px] font-medium">&gt;60% High</span>
          </div>
        </div>

        {/* Selected Vessel Quick Selector */}
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          {(['LAD', 'LCX', 'RCA'] as const).map((v) => {
            const vData = vessels[v];
            const isSelected = selectedVessel === v;
            return (
              <button
                key={v}
                onClick={() => onSelectVessel(isSelected ? null : v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: vData.color }}
                ></span>
                <span>{v}</span>
                <span className="text-[10px] opacity-80">{vData.stenosis_percentage}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

