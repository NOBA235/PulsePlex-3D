import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { VesselRiskInfo } from '../services/api';

export type CTViewMode = 'anatomical' | 'angio' | 'calcium' | 'flow';

interface HeartMeshProps {
  vessels: {
    LAD: VesselRiskInfo;
    LCX: VesselRiskInfo;
    RCA: VesselRiskInfo;
  };
  selectedVessel: 'LAD' | 'LCX' | 'RCA' | null;
  onSelectVessel: (vessel: 'LAD' | 'LCX' | 'RCA' | null) => void;
  isBeating?: boolean;
  viewMode?: CTViewMode;
  onInspectLesion?: (vessel: 'LAD' | 'LCX' | 'RCA') => void;
  stentedVessels?: {
    LAD?: boolean;
    LCX?: boolean;
    RCA?: boolean;
  };
}

export const HeartMesh: React.FC<HeartMeshProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  isBeating = true,
  viewMode = 'anatomical',
  onInspectLesion,
  stentedVessels,
}) => {
  const heartGroupRef = useRef<THREE.Group>(null);
  const flowGroupRef = useRef<THREE.Group>(null);
  const [hoveredVessel, setHoveredVessel] = useState<'LAD' | 'LCX' | 'RCA' | null>(null);
  const [hoveredPart, setHoveredPart] = useState<{
    name: string;
    description: string;
    position: [number, number, number];
  } | null>(null);
  const ventricularBodyGeometry = useMemo(
    () => new THREE.LatheGeometry([
      new THREE.Vector2(0.015, -1.12),
      new THREE.Vector2(0.12, -1.04),
      new THREE.Vector2(0.30, -0.82),
      new THREE.Vector2(0.52, -0.50),
      new THREE.Vector2(0.70, -0.12),
      new THREE.Vector2(0.76, 0.22),
      new THREE.Vector2(0.66, 0.50),
      new THREE.Vector2(0.42, 0.72),
      new THREE.Vector2(0.12, 0.82),
    ], 48),
    [],
  );

  const trackAnatomy = (name: string, description: string, point: THREE.Vector3) => {
    const localPoint = heartGroupRef.current
      ? heartGroupRef.current.worldToLocal(point.clone())
      : point.clone();
    setHoveredPart({
      name,
      description,
      position: [localPoint.x, localPoint.y, localPoint.z],
    });
  };

  // Wiggers cardiac cycle simulation (Systole contraction + Diastole filling)
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (heartGroupRef.current && isBeating) {
      // Biphasic cardiac cycle
      const sys = Math.pow(Math.sin(t * 3.4), 18) * 0.055;
      const dia = Math.pow(Math.sin(t * 3.4 - 0.38), 16) * 0.025;
      const s = 1 + sys + dia;
      heartGroupRef.current.scale.set(s, s * 1.025, s * 0.98);
    }

    // Animated hemodynamic flow pulses
    if (flowGroupRef.current && viewMode === 'flow') {
      flowGroupRef.current.children.forEach((child, idx) => {
        const offset = (t * 1.8 + idx * 0.25) % 1.0;
        child.position.y = -offset * 1.5;
        (child as THREE.Mesh).scale.setScalar(0.8 + Math.sin(t * 6) * 0.2);
      });
    }
  });

  // ================= CORONARY ARTERY VASCULAR NETWORK =================
  // 1. Left Main Coronary Artery (LMCA) Ostium & Trunk
  const lmcaCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.98, 0.32),  // Left Aortic Sinus of Valsalva
      new THREE.Vector3(0.14, 0.92, 0.42),
      new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation Point
    ]);
  }, []);

  // 2. LAD Main Trunk (Anterior Interventricular Sulcus)
  const ladCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation
      new THREE.Vector3(0.24, 0.58, 0.66),  // Proximal LAD (frequent plaque site)
      new THREE.Vector3(0.21, 0.12, 0.80),  // Mid LAD
      new THREE.Vector3(0.13, -0.42, 0.76), // Distal LAD
      new THREE.Vector3(0.05, -0.96, 0.52), // Cardiac Apex
    ]);
  }, []);

  // 2b. LAD Diagonal Branches (D1 & D2)
  const ladD1Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.23, 0.42, 0.72),  // D1 Takeoff
      new THREE.Vector3(0.42, 0.22, 0.68),
      new THREE.Vector3(0.55, -0.15, 0.52), // Lateral LV free wall
    ]);
  }, []);

  const ladD2Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, -0.15, 0.79), // D2 Takeoff
      new THREE.Vector3(0.35, -0.38, 0.65),
      new THREE.Vector3(0.45, -0.65, 0.45),
    ]);
  }, []);

  // 3. LCX Main Trunk (Left Atrioventricular Groove)
  const lcxCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation
      new THREE.Vector3(0.48, 0.76, 0.36),  // Proximal LCX (Left AV Sulcus)
      new THREE.Vector3(0.78, 0.45, 0.08),  // Mid LCX (Obtuse Margin)
      new THREE.Vector3(0.82, -0.05, -0.28),// Distal LCX
      new THREE.Vector3(0.52, -0.48, -0.52),// Posterior Ventricular Wall
    ]);
  }, []);

  // 3b. LCX Obtuse Marginal Branch (OM1)
  const lcxOM1Curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.72, 0.52, 0.18),  // OM1 Takeoff
      new THREE.Vector3(0.85, 0.15, 0.02),
      new THREE.Vector3(0.82, -0.32, -0.18),// Descending lateral LV wall
    ]);
  }, []);

  // 4. RCA Main Trunk (Right Atrioventricular Groove)
  const rcaCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 0.92, 0.36), // Right Aortic Sinus of Valsalva
      new THREE.Vector3(-0.62, 0.62, 0.44), // Proximal RCA
      new THREE.Vector3(-0.84, 0.16, 0.22), // Mid RCA (Acute Margin)
      new THREE.Vector3(-0.76, -0.36, -0.08),// Distal RCA
      new THREE.Vector3(-0.35, -0.74, -0.32),// Crux Cordis / PDA origin
    ]);
  }, []);

  // 4b. RCA Acute Marginal (AM) & Posterior Descending Artery (PDA)
  const rcaAMCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.84, 0.16, 0.22), // AM Takeoff
      new THREE.Vector3(-0.80, -0.15, 0.36),
      new THREE.Vector3(-0.60, -0.48, 0.46), // Lower anterior RV wall
    ]);
  }, []);

  const rcaPDACurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -0.74, -0.32),// Crux Cordis
      new THREE.Vector3(-0.15, -0.86, -0.15),
      new THREE.Vector3(0.02, -0.94, 0.25),  // Inferior interventricular sulcus
    ]);
  }, []);

  // Tube Geometries
  const lmcaGeo = useMemo(() => new THREE.TubeGeometry(lmcaCurve, 24, 0.052, 12, false), [lmcaCurve]);
  const ladGeo = useMemo(() => new THREE.TubeGeometry(ladCurve, 64, 0.046, 12, false), [ladCurve]);
  const ladD1Geo = useMemo(() => new THREE.TubeGeometry(ladD1Curve, 32, 0.028, 10, false), [ladD1Curve]);
  const ladD2Geo = useMemo(() => new THREE.TubeGeometry(ladD2Curve, 32, 0.024, 10, false), [ladD2Curve]);

  const lcxGeo = useMemo(() => new THREE.TubeGeometry(lcxCurve, 64, 0.042, 12, false), [lcxCurve]);
  const lcxOM1Geo = useMemo(() => new THREE.TubeGeometry(lcxOM1Curve, 32, 0.028, 10, false), [lcxOM1Curve]);

  const rcaGeo = useMemo(() => new THREE.TubeGeometry(rcaCurve, 64, 0.045, 12, false), [rcaCurve]);
  const rcaAMGeo = useMemo(() => new THREE.TubeGeometry(rcaAMCurve, 32, 0.026, 10, false), [rcaAMCurve]);
  const rcaPDAGeo = useMemo(() => new THREE.TubeGeometry(rcaPDACurve, 32, 0.030, 10, false), [rcaPDACurve]);

  // Color calculation based on viewMode & stenosis
  const getVesselStyle = (vesselKey: 'LAD' | 'LCX' | 'RCA') => {
    const isSelected = selectedVessel === vesselKey;
    const isHovered = hoveredVessel === vesselKey;
    const isStented = Boolean(stentedVessels?.[vesselKey]);
    const info = vessels[vesselKey];
    const baseColor = isStented ? '#10b981' : (info?.color || '#22c55e');

    let displayColor = baseColor;
    let emissiveColor = baseColor;
    let emissiveInt = 0.25;

    if (isStented) {
      displayColor = '#10b981';
      emissiveColor = '#34d399';
      emissiveInt = 0.5;
    } else if (viewMode === 'angio') {
      // Contrast lumen glow (bright white/cyan for healthy, warning yellow/red for stenosed)
      displayColor = info.stenotic ? baseColor : '#38bdf8';
      emissiveColor = info.stenotic ? baseColor : '#0284c7';
      emissiveInt = isSelected || isHovered ? 1.0 : 0.65;
    } else if (viewMode === 'calcium') {
      // Calcified plaque highlighting mode
      displayColor = info.stenotic ? '#f8fafc' : '#475569';
      emissiveColor = info.stenotic ? '#fbbf24' : '#1e293b';
      emissiveInt = info.stenotic ? 0.9 : 0.1;
    } else if (viewMode === 'flow') {
      // Flow dynamics mode
      displayColor = info.stenotic ? '#ef4444' : '#10b981';
      emissiveColor = displayColor;
      emissiveInt = 0.7;
    } else {
      // Anatomical mode
      if (isSelected || isHovered) {
        emissiveInt = 0.85;
      } else {
        emissiveInt = info.stenotic ? 0.45 : 0.18;
      }
    }

    return {
      color: displayColor,
      emissive: emissiveColor,
      emissiveIntensity: emissiveInt,
      isSelected,
      isHovered,
    };
  };

  const ladStyle = getVesselStyle('LAD');
  const lcxStyle = getVesselStyle('LCX');
  const rcaStyle = getVesselStyle('RCA');

  // Myocardium Material properties according to CT Window Mode
  const myocardiumProps = useMemo(() => {
    switch (viewMode) {
      case 'angio':
        return {
          color: '#0f172a',
          roughness: 0.15,
          metalness: 0.1,
          transparent: true,
          opacity: 0.22,
          wireframe: false,
        };
      case 'calcium':
        return {
          color: '#1e293b',
          roughness: 0.65,
          metalness: 0.1,
          transparent: true,
          opacity: 0.55,
          wireframe: false,
        };
      case 'flow':
        return {
          color: '#090d16',
          roughness: 0.3,
          metalness: 0.2,
          transparent: true,
          opacity: 0.4,
        };
      case 'anatomical':
      default:
        return {
          color: '#a94b4d', // Muted myocardium tone for the anatomical view
          roughness: 0.38,
          metalness: 0.12,
          transparent: false,
          opacity: 1.0,
        };
    }
  }, [viewMode]);

  return (
    <group ref={heartGroupRef} dispose={null}>
      {/* ================= HEART MUSCLE / ANATOMICAL CHAMBERS ================= */}
      {/* Left Ventricle (LV) - Main thick muscular cone */}
      <mesh
        geometry={ventricularBodyGeometry}
        position={[0.12, -0.02, 0.14]}
        rotation={[0.06, 0, -0.12]}
        scale={[1, 1, 0.84]}
        onPointerMove={(e) => trackAnatomy(
          e.point.y < -0.72 ? 'Cardiac apex' : 'Left ventricle',
          e.point.y < -0.72
            ? 'Inferior tip of the heart, formed predominantly by the left ventricle.'
            : 'Main systemic pumping chamber; forms much of the apex.',
          e.point,
        )}
        onPointerOut={() => setHoveredPart(null)}
      >
        <meshStandardMaterial {...myocardiumProps} />
      </mesh>

      {/* Right Ventricle (RV) - Anterior crescent chamber hugging LV */}
      <mesh
        position={[-0.34, -0.18, 0.24]}
        rotation={[0.12, 0.22, 0.18]}
        scale={[0.84, 0.96, 0.74]}
        onPointerMove={(e) => trackAnatomy('Right ventricle', 'Anterior chamber that pumps blood into the pulmonary circulation.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <sphereGeometry args={[0.76, 36, 36]} />
        <meshStandardMaterial
          {...myocardiumProps}
          color={viewMode === 'anatomical' ? '#8f4246' : myocardiumProps.color}
        />
      </mesh>

      {/* Right Ventricular Outflow Tract (RVOT / Conus Arteriosus) */}
      <mesh
        position={[-0.14, 0.58, 0.32]}
        rotation={[0.3, -0.15, 0.15]}
        onPointerMove={(e) => trackAnatomy('Right ventricular outflow tract', 'Outflow pathway from the right ventricle to the pulmonary trunk.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <cylinderGeometry args={[0.22, 0.28, 0.5, 24]} />
        <meshStandardMaterial
          {...myocardiumProps}
          color={viewMode === 'anatomical' ? '#98464b' : myocardiumProps.color}
        />
      </mesh>

      {/* Left Atrium & Auricle (Posterior-superior) */}
      <mesh
        position={[0.26, 0.58, -0.14]}
        scale={[0.68, 0.62, 0.64]}
        onPointerMove={(e) => trackAnatomy('Left atrium', 'Receives oxygenated blood returning from the pulmonary veins.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <sphereGeometry args={[0.66, 32, 32]} />
        <meshStandardMaterial
          {...myocardiumProps}
          color={viewMode === 'anatomical' ? '#a85c65' : myocardiumProps.color}
        />
      </mesh>

      {/* Right Atrium & Auricle (Anterior-superior) */}
      <mesh
        position={[-0.32, 0.52, -0.02]}
        scale={[0.66, 0.58, 0.62]}
        onPointerMove={(e) => trackAnatomy('Right atrium', 'Receives systemic venous blood and passes it to the right ventricle.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial
          {...myocardiumProps}
          color={viewMode === 'anatomical' ? '#934f58' : myocardiumProps.color}
        />
      </mesh>

      {/* Epicardial Sulcus Fat Pads (CORA Fat Window -100 HU) */}
      {viewMode === 'anatomical' && (
        <>
          {/* Anterior Interventricular Sulcus Fat Pad */}
          <mesh position={[0.2, 0.2, 0.72]} rotation={[0.1, 0, -0.15]} scale={[0.14, 0.75, 0.08]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#b45309" roughness={0.65} metalness={0.05} opacity={0.6} transparent />
          </mesh>
          {/* Right AV Groove Fat Pad */}
          <mesh position={[-0.6, 0.45, 0.32]} rotation={[0, 0.3, 0.4]} scale={[0.12, 0.65, 0.08]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#b45309" roughness={0.65} metalness={0.05} opacity={0.6} transparent />
          </mesh>
        </>
      )}

      {/* ================= GREAT VESSELS ================= */}
      {/* Ascending Aorta (Arising from Aortic Root with Sinuses of Valsalva) */}
      <mesh
        position={[0.02, 1.08, 0.08]}
        rotation={[-0.12, 0.22, -0.28]}
        onPointerMove={(e) => trackAnatomy('Ascending aorta', 'Carries oxygenated blood from the left ventricle into the systemic circulation.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <cylinderGeometry args={[0.23, 0.27, 0.85, 32]} />
        <meshStandardMaterial
          color={viewMode === 'angio' ? '#38bdf8' : '#a9494c'}
          emissive={viewMode === 'angio' ? '#0284c7' : '#000000'}
          emissiveIntensity={viewMode === 'angio' ? 0.35 : 0}
          roughness={0.68}
          metalness={0.02}
        />
      </mesh>

      {/* Aortic Arch Curvature & Supra-Aortic Branches */}
      <mesh
        position={[0.18, 1.48, -0.06]}
        rotation={[0.4, 0.3, -0.5]}
        onPointerMove={(e) => trackAnatomy('Aortic arch', 'Curved continuation of the aorta; gives rise to major branches supplying the head and upper limbs.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <torusGeometry args={[0.28, 0.12, 16, 24, Math.PI * 0.75]} />
        <meshStandardMaterial
          color={viewMode === 'angio' ? '#38bdf8' : '#a9494c'}
          roughness={0.68}
          metalness={0.02}
        />
      </mesh>

      {/* Pulmonary Trunk (Crossing anterior to aorta from RVOT) */}
      <mesh
        position={[-0.14, 1.0, 0.28]}
        rotation={[0.28, -0.18, 0.22]}
        onPointerMove={(e) => trackAnatomy('Pulmonary trunk', 'Carries deoxygenated blood from the right ventricle toward the lungs.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <cylinderGeometry args={[0.2, 0.23, 0.75, 32]} />
        <meshStandardMaterial
          color={viewMode === 'angio' ? '#1e40af' : '#66849b'}
          roughness={0.68}
          metalness={0.02}
        />
      </mesh>

      {/* Superior Vena Cava (SVC) entering Right Atrium */}
      <mesh
        position={[-0.56, 0.94, -0.18]}
        rotation={[0, 0, 0.12]}
        onPointerMove={(e) => trackAnatomy('Superior vena cava', 'Returns blood from the upper body to the right atrium.', e.point)}
        onPointerOut={() => setHoveredPart(null)}
      >
        <cylinderGeometry args={[0.15, 0.17, 0.75, 24]} />
        <meshStandardMaterial color="#5d7d94" roughness={0.68} metalness={0.02} />
      </mesh>

      {/* ================= CORONARY ARTERY: LEFT MAIN (LMCA) ================= */}
      <mesh geometry={lmcaGeo}>
        <meshStandardMaterial
          color={ladStyle.color}
          emissive={ladStyle.emissive}
          emissiveIntensity={ladStyle.emissiveIntensity}
          roughness={0.18}
          metalness={0.65}
        />
      </mesh>

      {/* ================= CORONARY ARTERY: LAD & BRANCHES ================= */}
      <group>
        {/* LAD Main Trunk */}
        <mesh
          geometry={ladGeo}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'LAD' ? null : 'LAD');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LAD');
          }}
          onPointerMove={(e) => trackAnatomy('Left anterior descending artery (LAD)', 'Runs in the anterior interventricular groove and supplies much of the anterior left ventricle.', e.point)}
          onPointerOut={() => {
            setHoveredVessel(null);
            setHoveredPart(null);
          }}
        >
          <meshStandardMaterial
            color={ladStyle.color}
            emissive={ladStyle.emissive}
            emissiveIntensity={ladStyle.emissiveIntensity}
            roughness={0.18}
            metalness={0.65}
          />
        </mesh>

        {/* Diagonal Branches D1 & D2 */}
        <mesh geometry={ladD1Geo}>
          <meshStandardMaterial
            color={ladStyle.color}
            emissive={ladStyle.emissive}
            emissiveIntensity={ladStyle.emissiveIntensity * 0.8}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
        <mesh geometry={ladD2Geo}>
          <meshStandardMaterial
            color={ladStyle.color}
            emissive={ladStyle.emissive}
            emissiveIntensity={ladStyle.emissiveIntensity * 0.7}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>

        {/* CORA Plaque Lesion Model (Proximal/Mid LAD: [0.22, 0.38, 0.72]) */}
        {vessels.LAD.stenosis_percentage >= 25 && (
          <group position={[0.22, 0.38, 0.72]}>
            {/* Eccentric Atheroma Plaque Bulge (Composite Gaussian blob) */}
            <mesh scale={[1.1, 1.6, 1.2]}>
              <sphereGeometry args={[0.075, 18, 18]} />
              <meshStandardMaterial
                color={viewMode === 'calcium' ? '#f8fafc' : '#ca8a04'}
                emissive={viewMode === 'calcium' ? '#fbbf24' : '#a16207'}
                emissiveIntensity={viewMode === 'calcium' ? 1.0 : 0.4}
                roughness={0.3}
                metalness={viewMode === 'calcium' ? 0.8 : 0.2}
              />
            </mesh>

            {/* Dense Calcium Core (HU 900+ Agatston speckle) */}
            {(vessels.LAD.plaque_metrics?.calcified_percentage || 35) > 20 && (
              <mesh position={[0.02, 0.01, 0.03]} scale={[0.6, 0.8, 0.6]}>
                <dodecahedronGeometry args={[0.05]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={viewMode === 'calcium' ? 1.2 : 0.6}
                  metalness={0.9}
                  roughness={0.1}
                />
              </mesh>
            )}
          </group>
        )}

        {/* LAD Stent Mesh (Simulated Drug-Eluting Stent) */}
        {stentedVessels?.LAD && (
          <group position={[0.24, 0.45, 0.68]} rotation={[0.4, -0.2, 0.3]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.055, 0.22, 16, 6, true]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.85}
                metalness={0.95}
                roughness={0.1}
                wireframe
              />
            </mesh>
          </group>
        )}

        {/* LAD Interactive Landmark Node */}
        <mesh
          position={[0.21, 0.12, 0.80]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('LAD');
          }}
          onPointerOver={() => setHoveredVessel('LAD')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color={ladStyle.color}
            emissive={ladStyle.emissive}
            emissiveIntensity={1.0}
          />

          {(hoveredVessel === 'LAD' || selectedVessel === 'LAD') && (
            <Html position={[0, 0.18, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-3 rounded-xl text-xs w-56 backdrop-blur-md pointer-events-auto transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">LAD (Left Anterior Desc)</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.LAD.color}33`, color: vessels.LAD.color }}
                  >
                    {vessels.LAD.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">
                  Stenosis: <span className="font-semibold text-white">{vessels.LAD.stenosis_percentage}%</span>
                </div>
                {vessels.LAD.plaque_metrics && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>MLA: {vessels.LAD.plaque_metrics.minimal_lumen_area_mm2} mm²</span>
                    <span>FFR: {vessels.LAD.plaque_metrics.hemodynamic_ffr_estimate}</span>
                  </div>
                )}
                {viewMode === 'calcium' && vessels.LAD.plaque_metrics && (
                  <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                    Dense Calcium: {vessels.LAD.plaque_metrics.calcified_hu} HU
                  </div>
                )}
                {onInspectLesion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectLesion('LAD');
                    }}
                    className="mt-2 w-full py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold text-center transition"
                  >
                    🔬 Inspect Plaque Cutaway
                  </button>
                )}
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if LAD is High Risk */}
        {vessels.LAD.stenotic && (
          <mesh position={[0.21, 0.12, 0.80]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.LAD.color} wireframe transparent opacity={0.65} />
          </mesh>
        )}
      </group>

      {/* ================= CORONARY ARTERY: LCX & BRANCHES ================= */}
      <group>
        {/* LCX Main Trunk */}
        <mesh
          geometry={lcxGeo}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'LCX' ? null : 'LCX');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('LCX');
          }}
          onPointerMove={(e) => trackAnatomy('Left circumflex artery (LCX)', 'Courses in the left atrioventricular groove and supplies the lateral myocardium.', e.point)}
          onPointerOut={() => {
            setHoveredVessel(null);
            setHoveredPart(null);
          }}
        >
          <meshStandardMaterial
            color={lcxStyle.color}
            emissive={lcxStyle.emissive}
            emissiveIntensity={lcxStyle.emissiveIntensity}
            roughness={0.18}
            metalness={0.65}
          />
        </mesh>

        {/* Obtuse Marginal Branch OM1 */}
        <mesh geometry={lcxOM1Geo}>
          <meshStandardMaterial
            color={lcxStyle.color}
            emissive={lcxStyle.emissive}
            emissiveIntensity={lcxStyle.emissiveIntensity * 0.8}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>

        {/* CORA Plaque Lesion Model (LCX Proximal/OM1 origin: [0.72, 0.48, 0.14]) */}
        {vessels.LCX.stenosis_percentage >= 25 && (
          <group position={[0.72, 0.48, 0.14]}>
            <mesh scale={[1.2, 1.5, 1.1]}>
              <sphereGeometry args={[0.07, 18, 18]} />
              <meshStandardMaterial
                color={viewMode === 'calcium' ? '#f8fafc' : '#ca8a04'}
                emissive={viewMode === 'calcium' ? '#fbbf24' : '#a16207'}
                emissiveIntensity={viewMode === 'calcium' ? 1.0 : 0.4}
                roughness={0.3}
                metalness={viewMode === 'calcium' ? 0.8 : 0.2}
              />
            </mesh>
          </group>
        )}

        {/* LCX Stent Mesh (Simulated Drug-Eluting Stent) */}
        {stentedVessels?.LCX && (
          <group position={[0.72, 0.48, 0.14]} rotation={[0.2, 0.6, -0.4]}>
            <mesh>
              <cylinderGeometry args={[0.052, 0.052, 0.20, 16, 6, true]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.85}
                metalness={0.95}
                roughness={0.1}
                wireframe
              />
            </mesh>
          </group>
        )}

        {/* LCX Interactive Landmark Node */}
        <mesh
          position={[0.78, 0.45, 0.08]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('LCX');
          }}
          onPointerOver={() => setHoveredVessel('LCX')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color={lcxStyle.color}
            emissive={lcxStyle.emissive}
            emissiveIntensity={1.0}
          />

          {(hoveredVessel === 'LCX' || selectedVessel === 'LCX') && (
            <Html position={[0, 0.18, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-3 rounded-xl text-xs w-56 backdrop-blur-md pointer-events-auto transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">LCX (Left Circumflex)</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.LCX.color}33`, color: vessels.LCX.color }}
                  >
                    {vessels.LCX.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">
                  Stenosis: <span className="font-semibold text-white">{vessels.LCX.stenosis_percentage}%</span>
                </div>
                {vessels.LCX.plaque_metrics && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>MLA: {vessels.LCX.plaque_metrics.minimal_lumen_area_mm2} mm²</span>
                    <span>FFR: {vessels.LCX.plaque_metrics.hemodynamic_ffr_estimate}</span>
                  </div>
                )}
                {onInspectLesion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectLesion('LCX');
                    }}
                    className="mt-2 w-full py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold text-center transition"
                  >
                    🔬 Inspect Plaque Cutaway
                  </button>
                )}
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if LCX is High Risk */}
        {vessels.LCX.stenotic && (
          <mesh position={[0.78, 0.45, 0.08]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.LCX.color} wireframe transparent opacity={0.65} />
          </mesh>
        )}
      </group>

      {/* ================= CORONARY ARTERY: RCA & BRANCHES ================= */}
      <group>
        {/* RCA Main Trunk */}
        <mesh
          geometry={rcaGeo}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel(selectedVessel === 'RCA' ? null : 'RCA');
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredVessel('RCA');
          }}
          onPointerMove={(e) => trackAnatomy('Right coronary artery (RCA)', 'Courses in the right atrioventricular groove and commonly supplies the inferior myocardium.', e.point)}
          onPointerOut={() => {
            setHoveredVessel(null);
            setHoveredPart(null);
          }}
        >
          <meshStandardMaterial
            color={rcaStyle.color}
            emissive={rcaStyle.emissive}
            emissiveIntensity={rcaStyle.emissiveIntensity}
            roughness={0.18}
            metalness={0.65}
          />
        </mesh>

        {/* Acute Marginal Branch (AM) */}
        <mesh geometry={rcaAMGeo}>
          <meshStandardMaterial
            color={rcaStyle.color}
            emissive={rcaStyle.emissive}
            emissiveIntensity={rcaStyle.emissiveIntensity * 0.8}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>

        {/* Posterior Descending Artery (PDA) */}
        <mesh geometry={rcaPDAGeo}>
          <meshStandardMaterial
            color={rcaStyle.color}
            emissive={rcaStyle.emissive}
            emissiveIntensity={rcaStyle.emissiveIntensity * 0.8}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>

        {/* CORA Plaque Lesion Model (Mid RCA: [-0.82, 0.12, 0.22]) */}
        {vessels.RCA.stenosis_percentage >= 25 && (
          <group position={[-0.82, 0.12, 0.22]}>
            <mesh scale={[1.3, 1.7, 1.2]}>
              <sphereGeometry args={[0.075, 18, 18]} />
              <meshStandardMaterial
                color={viewMode === 'calcium' ? '#f8fafc' : '#ca8a04'}
                emissive={viewMode === 'calcium' ? '#fbbf24' : '#a16207'}
                emissiveIntensity={viewMode === 'calcium' ? 1.0 : 0.4}
                roughness={0.3}
                metalness={viewMode === 'calcium' ? 0.8 : 0.2}
              />
            </mesh>
          </group>
        )}

        {/* RCA Stent Mesh (Simulated Drug-Eluting Stent) */}
        {stentedVessels?.RCA && (
          <group position={[-0.82, 0.12, 0.22]} rotation={[0.5, -0.3, -0.2]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.055, 0.22, 16, 6, true]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.85}
                metalness={0.95}
                roughness={0.1}
                wireframe
              />
            </mesh>
          </group>
        )}

        {/* RCA Interactive Landmark Node */}
        <mesh
          position={[-0.84, 0.16, 0.22]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVessel('RCA');
          }}
          onPointerOver={() => setHoveredVessel('RCA')}
          onPointerOut={() => setHoveredVessel(null)}
        >
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial
            color={rcaStyle.color}
            emissive={rcaStyle.emissive}
            emissiveIntensity={1.0}
          />

          {(hoveredVessel === 'RCA' || selectedVessel === 'RCA') && (
            <Html position={[0, 0.18, 0]}>
              <div className="bg-slate-900/95 border border-slate-700 shadow-2xl p-3 rounded-xl text-xs w-56 backdrop-blur-md pointer-events-auto transform -translate-x-1/2">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-white">RCA (Right Coronary)</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{ backgroundColor: `${vessels.RCA.color}33`, color: vessels.RCA.color }}
                  >
                    {vessels.RCA.risk_category} Risk
                  </span>
                </div>
                <div className="text-slate-300">
                  Stenosis: <span className="font-semibold text-white">{vessels.RCA.stenosis_percentage}%</span>
                </div>
                {vessels.RCA.plaque_metrics && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>MLA: {vessels.RCA.plaque_metrics.minimal_lumen_area_mm2} mm²</span>
                    <span>FFR: {vessels.RCA.plaque_metrics.hemodynamic_ffr_estimate}</span>
                  </div>
                )}
                {onInspectLesion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectLesion('RCA');
                    }}
                    className="mt-2 w-full py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold text-center transition"
                  >
                    🔬 Inspect Plaque Cutaway
                  </button>
                )}
              </div>
            </Html>
          )}
        </mesh>

        {/* Pulsing warning halo if RCA is High Risk */}
        {vessels.RCA.stenotic && (
          <mesh position={[-0.84, 0.16, 0.22]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={vessels.RCA.color} wireframe transparent opacity={0.65} />
          </mesh>
        )}
      </group>

      {hoveredPart && (
        <Html
          position={[hoveredPart.position[0] + 0.12, hoveredPart.position[1] + 0.12, hoveredPart.position[2]]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="anatomy-tooltip">
            <span className="anatomy-tooltip-label">ANATOMICAL STRUCTURE</span>
            <strong>{hoveredPart.name}</strong>
            <span>{hoveredPart.description}</span>
          </div>
        </Html>
      )}

      {/* ================= HEMODYNAMIC FLOW PARTICLES ================= */}
      {viewMode === 'flow' && (
        <group ref={flowGroupRef}>
          {/* LAD Flow particles */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`lad-flow-${i}`} position={[0.2, 0.4 - i * 0.28, 0.72]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          ))}
          {/* RCA Flow particles */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`rca-flow-${i}`} position={[-0.7, 0.5 - i * 0.28, 0.35]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
