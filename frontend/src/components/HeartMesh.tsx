import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { VesselRiskInfo } from '../services/api';

interface HeartMeshProps {
  vessels: {
    LAD: VesselRiskInfo;
    LCX: VesselRiskInfo;
    RCA: VesselRiskInfo;
  };
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | null) => void;
  isBeating?: boolean;
}

export const HeartMesh: React.FC<HeartMeshProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  isBeating = true,
}) => {
  const heartGroupRef = useRef<THREE.Group>(null);
  const [hoveredVessel, setHoveredVessel] = useState<'LAD' | 'LCX' | 'RCA' | null>(null);

  // Heartbeat deformation simulation
  useFrame((state) => {
    if (heartGroupRef.current && isBeating) {
      const t = state.clock.getElapsedTime();
      // Cardiac cycle: double pulse rhythm (systole / diastole)
      const beat1 = Math.pow(Math.sin(t * 3.5), 16) * 0.04;
      const beat2 = Math.pow(Math.sin((t * 3.5) - 0.35), 16) * 0.02;
      const scale = 1 + beat1 + beat2;
      heartGroupRef.current.scale.set(scale, scale * 1.02, scale);
    }
  });

  // Coronary Artery Paths (3D anatomical trajectories)
  const ladCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 0.9, 0.45),   // LAD Ostium / Left Main origin
      new THREE.Vector3(0.25, 0.5, 0.65),   // Proximal LAD
      new THREE.Vector3(0.2, 0.05, 0.78),   // Mid LAD (Anterior Interventricular Sulcus)
      new THREE.Vector3(0.12, -0.45, 0.75), // Distal LAD
      new THREE.Vector3(0.05, -0.95, 0.55), // Cardiac Apex
    ]);
  }, []);

  const lcxCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.88, 0.42),    // LCX Origin from Left Main
      new THREE.Vector3(0.65, 0.65, 0.25),   // Proximal LCX (Left AV Groove)
      new THREE.Vector3(0.85, 0.25, -0.15),  // Obtuse Marginal Branch / Mid LCX
      new THREE.Vector3(0.75, -0.2, -0.45),  // Distal LCX
      new THREE.Vector3(0.4, -0.55, -0.55),  // Posterior Ventricular Wall
    ]);
  }, []);

  const rcaCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 0.85, 0.4),   // Right Aortic Sinus origin
      new THREE.Vector3(-0.65, 0.5, 0.45),   // Proximal RCA (Right AV Groove)
      new THREE.Vector3(-0.8, 0.05, 0.2),    // Mid RCA (Acute Margin)
      new THREE.Vector3(-0.7, -0.4, -0.15),  // Distal RCA
      new THREE.Vector3(-0.3, -0.75, -0.35), // Posterior Descending Artery (Crux)
    ]);
  }, []);

  // Vessel Tube Geometries
  const ladGeometry = useMemo(() => new THREE.TubeGeometry(ladCurve, 64, 0.045, 12, false), [ladCurve]);
  const lcxGeometry = useMemo(() => new THREE.TubeGeometry(lcxCurve, 64, 0.042, 12, false), [lcxCurve]);
  const rcaGeometry = useMemo(() => new THREE.TubeGeometry(rcaCurve, 64, 0.043, 12, false), [rcaCurve]);

  // Dynamic colors with interpolation
  const getVesselColor = (vesselKey: 'LAD' | 'LCX' | 'RCA') => {
    const isSelected = selectedVessel === vesselKey;
    const isHovered = hoveredVessel === vesselKey;
    const baseColor = vessels[vesselKey]?.color || '#22c55e';
    return { baseColor, isSelected, isHovered };
  };

  const ladStyle = getVesselColor('LAD');
  const lcxStyle = getVesselColor('LCX');
  const rcaStyle = getVesselColor('RCA');

  return (
    <group ref={heartGroupRef} dispose={null}>
      {/* ================= HEART MUSCLE / ANATOMICAL BASE ================= */}
      {/* Left Ventricle (Apex & Anterior Body) */}
      <mesh position={[0.1, -0.25, 0.1]} rotation={[0.15, 0, -0.2]}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          color="#991b1b"
          roughness={0.45}
          metalness={0.15}
          bumpScale={0.02}
        />
      </mesh>

      {/* Right Ventricle (Anterior crescent wrap) */}
      <mesh position={[-0.35, -0.2, 0.2]} rotation={[0.1, 0.2, 0.15]} scale={[0.85, 0.95, 0.75]}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshStandardMaterial
          color="#831843"
          roughness={0.5}
          metalness={0.12}
        />
      </mesh>

      {/* Left & Right Atria (Superior posterior chambers) */}
      <mesh position={[0.25, 0.55, -0.1]} scale={[0.7, 0.6, 0.65]}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial color="#701a75" roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh position={[-0.3, 0.5, 0.0]} scale={[0.65, 0.55, 0.6]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#581c87" roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Cardiac Apex Conical Extension */}
      <mesh position={[0.08, -0.85, 0.35]} rotation={[0.2, 0, -0.2]} scale={[0.6, 0.8, 0.55]}>
        <coneGeometry args={[0.65, 0.8, 32]} />
        <meshStandardMaterial color="#881337" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* ================= GREAT VESSELS ================= */}
      {/* Ascending Aorta (Arch curving superiorly) */}
      <mesh position={[0.0, 1.05, 0.05]} rotation={[-0.1, 0.2, -0.3]}>
        <cylinderGeometry args={[0.22, 0.25, 0.8, 32]} />
        <meshStandardMaterial
          color="#dc2626"
          roughness={0.3}
          metalness={0.25}
        />
      </mesh>

      {/* Pulmonary Trunk */}
      <mesh position={[-0.15, 0.95, 0.3]} rotation={[0.25, -0.15, 0.2]}>
        <cylinderGeometry args={[0.19, 0.22, 0.7, 32]} />
        <meshStandardMaterial
          color="#2563eb"
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>

      {/* Superior Vena Cava */}
      <mesh position={[-0.55, 0.9, -0.2]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.15, 0.17, 0.7, 24]} />
        <meshStandardMaterial color="#1e40af" roughness={0.4} />
      </mesh>

      {/* ================= CORONARY ARTERY: LAD ================= */}
      <group>
        <mesh
          geometry={ladGeometry}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'LAD' ? null : 'LAD');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LAD');
          }}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <meshStandardMaterial
            color={ladStyle.baseColor}
            emissive={ladStyle.baseColor}
            emissiveIntensity={ladStyle.isSelected || ladStyle.isHovered ? 0.9 : vessels.LAD.stenotic ? 0.5 : 0.2}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>

        {/* LAD Interactive Landmark Node (Mid LAD) */}
        <mesh
          position={[0.2, 0.05, 0.78]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('LAD');
          }}
          onPointerOver={() => setHoveredVessel('LAD')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.08, 24, 24]} />
          <meshStandardMaterial
            color={ladStyle.baseColor}
            emissive={ladStyle.baseColor}
            emissiveIntensity={1.0}
          />
          {(hoveredVessel === 'LAD' || selectedVessel === 'LAD') && (
            <Html distanceFactor={8} position={[0, 0.15, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-2.5 rounded-lg text-xs w-48 backdrop-blur-md pointer-events-none transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">LAD Artery</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.LAD.color}33`, color: vessels.LAD.color }}
                  >
                    {vessels.LAD.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">Stenosis: <span className="font-semibold text-white">{vessels.LAD.stenosis_percentage}%</span></div>
                <div className="text-[10px] text-slate-400 mt-1">{vessels.LAD.anatomical_territory}</div>
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if LAD is High Risk */}
        {vessels.LAD.stenotic && (
          <mesh position={[0.2, 0.05, 0.78]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.LAD.color} wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>

      {/* ================= CORONARY ARTERY: LCX ================= */}
      <group>
        <mesh
          geometry={lcxGeometry}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'LCX' ? null : 'LCX');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LCX');
          }}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <meshStandardMaterial
            color={lcxStyle.baseColor}
            emissive={lcxStyle.baseColor}
            emissiveIntensity={lcxStyle.isSelected || lcxStyle.isHovered ? 0.9 : vessels.LCX.stenotic ? 0.5 : 0.2}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>

        {/* LCX Interactive Landmark Node */}
        <mesh
          position={[0.85, 0.25, -0.15]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('LCX');
          }}
          onPointerOver={() => setHoveredVessel('LCX')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.08, 24, 24]} />
          <meshStandardMaterial
            color={lcxStyle.baseColor}
            emissive={lcxStyle.baseColor}
            emissiveIntensity={1.0}
          />
          {(hoveredVessel === 'LCX' || selectedVessel === 'LCX') && (
            <Html distanceFactor={8} position={[0, 0.15, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-2.5 rounded-lg text-xs w-48 backdrop-blur-md pointer-events-none transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">LCX Artery</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.LCX.color}33`, color: vessels.LCX.color }}
                  >
                    {vessels.LCX.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">Stenosis: <span className="font-semibold text-white">{vessels.LCX.stenosis_percentage}%</span></div>
                <div className="text-[10px] text-slate-400 mt-1">{vessels.LCX.anatomical_territory}</div>
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if LCX is High Risk */}
        {vessels.LCX.stenotic && (
          <mesh position={[0.85, 0.25, -0.15]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.LCX.color} wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>

      {/* ================= CORONARY ARTERY: RCA ================= */}
      <group>
        <mesh
          geometry={rcaGeometry}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'RCA' ? null : 'RCA');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('RCA');
          }}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <meshStandardMaterial
            color={rcaStyle.baseColor}
            emissive={rcaStyle.baseColor}
            emissiveIntensity={rcaStyle.isSelected || rcaStyle.isHovered ? 0.9 : vessels.RCA.stenotic ? 0.5 : 0.2}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>

        {/* RCA Interactive Landmark Node */}
        <mesh
          position={[-0.8, 0.05, 0.2]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('RCA');
          }}
          onPointerOver={() => setHoveredVessel('RCA')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.08, 24, 24]} />
          <meshStandardMaterial
            color={rcaStyle.baseColor}
            emissive={rcaStyle.baseColor}
            emissiveIntensity={1.0}
          />
          {(hoveredVessel === 'RCA' || selectedVessel === 'RCA') && (
            <Html distanceFactor={8} position={[0, 0.15, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-2.5 rounded-lg text-xs w-48 backdrop-blur-md pointer-events-none transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">RCA Artery</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.RCA.color}33`, color: vessels.RCA.color }}
                  >
                    {vessels.RCA.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">Stenosis: <span className="font-semibold text-white">{vessels.RCA.stenosis_percentage}%</span></div>
                <div className="text-[10px] text-slate-400 mt-1">{vessels.RCA.anatomical_territory}</div>
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if RCA is High Risk */}
        {vessels.RCA.stenotic && (
          <mesh position={[-0.8, 0.05, 0.2]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.RCA.color} wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>
    </group>
  );
};

