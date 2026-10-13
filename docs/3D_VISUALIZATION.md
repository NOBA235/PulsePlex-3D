# PulsePlex: 3D WebGL Visualization & Biomechanical Rendering

This document details the client-side graphics engine, procedural spline geometry, dynamic Wiggers cardiac cycle simulation, multi-spectral CT windowing modes, and virtual stent deployment in **PulsePlex**.

---

## 1. WebGL & Rendering Architecture Overview

Traditional medical digital twin systems either require heavy server-side GPU instances streaming video frames or display static, pre-rendered 3D assets. **PulsePlex** executes a high-performance, client-side WebGL pipeline engineered with:

* **Three.js (r128+)** — Core WebGL scene graph, custom geometries, standard materials, and matrix transforms.
* **React Three Fiber (`@react-three/fiber`)** — Declarative React reconciler managing Three.js lifecycles, props reactivity, and state bindings.
* **`@react-three/drei`** — Camera control rigging, HTML-in-WebGL overlay anchoring, and environment illumination.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PULSEPLEX 3D RENDERING PIPELINE                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

 [ React State: API Prediction Vector ]
   ├── LAD: { probability: 0.88, color: '#ef4444', plaque_metrics: {...} }
   ├── LCX: { probability: 0.22, color: '#22c55e', plaque_metrics: {...} }
   └── RCA: { probability: 0.64, color: '#f59e0b', plaque_metrics: {...} }
               │
               ▼
 [ React Three Fiber <Canvas> (60 FPS WebGL RequestAnimationFrame) ]
   ├── Perspective Camera (FOV: 42°, Target: [0, 0, 0])
   ├── Dynamic Lighting Rig:
   │     ├── Ambient Light (Intensity: 0.75, Cold Blue Tint)
   │     ├── Key Directional Light ([5, 8, 5], Intensity: 1.25)
   │     ├── Fill Rim Light ([-5, -4, -4], Intensity: 0.45)
   │     └── Point Light ([0, 0, 3], Decay: 2)
   │
   ├── <HeartMesh>
   │     ├── Ventricular Myocardium (LatheGeometry with 48 radial subdivisions)
   │     ├── Great Vessels (Ascending Aorta, Pulmonary Trunk, SVC)
   │     ├── Procedural Coronary Tree (3D Catmull-Rom Splines & Extruded TubeGeometry)
   │     │     ├── LMCA Trunk (Left Sinus of Valsalva -> Bifurcation)
   │     │     ├── LAD Artery + Diagonal Branches (D1, D2)
   │     │     ├── LCX Artery + Obtuse Marginal Branch (OM1)
   │     │     └── RCA Artery + Acute Marginal (AM) + Posterior Descending (PDA)
   │     ├── Plaque Atheroma Nodules (Spherical calcification blobs with high HU emission)
   │     └── Virtual Drug-Eluting Stents (Parametric open wireframe cylinder meshes)
   │
   └── <OrbitControls> (Smooth Damping: 0.08, RAO Cranial / LAO Spider Presets)
```

---

## 2. Procedural Vascular Network: Catmull-Rom Splines

Rather than importing static CAD meshes with pre-baked textures, coronary arteries are generated procedurally as **3D Catmull-Rom Cubic Splines** (`THREE.CatmullRomCurve3`) extruded via `THREE.TubeGeometry`.

This procedural approach enables:
1. Dynamic diameter modulation along the vessel length.
2. Independent branch takeoff angles without polygon tearing.
3. Real-time shader color-coding reflecting ML probability distributions.

### Anatomical Coordinates & Spline Trajectories

#### 1. Left Main Coronary Artery (LMCA)
Originates from the Left Aortic Sinus of Valsalva and bifurcates into the LAD and LCX:
```typescript
const lmcaCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.08, 0.98, 0.32),  // Left Sinus of Valsalva
  new THREE.Vector3(0.14, 0.92, 0.42),
  new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation Point
]);
const lmcaGeo = new THREE.TubeGeometry(lmcaCurve, 24, 0.052, 12, false);
```

#### 2. Left Anterior Descending (LAD) & Diagonal Branches (D1, D2)
Traverses the anterior interventricular sulcus down to the cardiac apex:
```typescript
const ladCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation
  new THREE.Vector3(0.24, 0.58, 0.66),  // Proximal LAD (critical stenosis site)
  new THREE.Vector3(0.21, 0.12, 0.80),  // Mid LAD
  new THREE.Vector3(0.13, -0.42, 0.76), // Distal LAD
  new THREE.Vector3(0.05, -0.96, 0.52), // Cardiac Apex
]);
const ladGeo = new THREE.TubeGeometry(ladCurve, 64, 0.046, 12, false);

// Diagonal Branch 1 (D1)
const ladD1Curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.23, 0.42, 0.72),  // D1 Takeoff
  new THREE.Vector3(0.42, 0.22, 0.68),
  new THREE.Vector3(0.55, -0.15, 0.52), // Anterolateral LV wall
]);
```

#### 3. Left Circumflex (LCX) & Obtuse Marginal (OM1)
Winds around the left atrioventricular groove to supply the lateral and posterior left ventricle:
```typescript
const lcxCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.18, 0.88, 0.46),  // LMCA Bifurcation
  new THREE.Vector3(0.48, 0.76, 0.36),  // Proximal LCX (Left AV Groove)
  new THREE.Vector3(0.78, 0.45, 0.08),  // Mid LCX (Obtuse Margin)
  new THREE.Vector3(0.82, -0.05, -0.28),// Distal LCX
  new THREE.Vector3(0.52, -0.48, -0.52),// Posterior LV wall
]);
const lcxGeo = new THREE.TubeGeometry(lcxCurve, 64, 0.042, 12, false);
```

#### 4. Right Coronary Artery (RCA), Acute Marginal (AM), & PDA
Descends through the right atrioventricular groove to the crux cordis:
```typescript
const rcaCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.28, 0.92, 0.36), // Right Sinus of Valsalva
  new THREE.Vector3(-0.62, 0.62, 0.44), // Proximal RCA
  new THREE.Vector3(-0.84, 0.16, 0.22), // Mid RCA (Acute Margin)
  new THREE.Vector3(-0.76, -0.36, -0.08),// Distal RCA
  new THREE.Vector3(-0.35, -0.74, -0.32),// Crux Cordis
]);
const rcaGeo = new THREE.TubeGeometry(rcaCurve, 64, 0.045, 12, false);
```

---

## 3. Dynamic Wiggers Cardiac Cycle Biomechanics

Rather than using generic sinusoidal scaling, PulsePlex implements a **biphasic Wiggers contraction model** within the React Three Fiber `useFrame` hook.

### Mathematical Formulation of Ventricular Pumping

The cardiac cycle consists of rapid ventricular systole (isovolumetric contraction and rapid ejection) followed by isovolumetric relaxation and diastole:

$$\text{Scale}(t) = 1.0 + \Delta_{\text{systole}}(t) + \Delta_{\text{diastole}}(t)$$

$$\Delta_{\text{systole}}(t) = \left[\sin(3.4 \cdot t)\right]^{18} \times 0.055$$

$$\Delta_{\text{diastole}}(t) = \left[\sin(3.4 \cdot t - 0.38)\right]^{16} \times 0.025$$

The large exponents ($18$ and $16$) create the sharp, rapid mechanical snap characteristic of human myocardial contraction:

```typescript
useFrame((state) => {
  const t = state.clock.getElapsedTime();

  if (heartGroupRef.current && isBeating) {
    const sys = Math.pow(Math.sin(t * 3.4), 18) * 0.055;
    const dia = Math.pow(Math.sin(t * 3.4 - 0.38), 16) * 0.025;
    const s = 1 + sys + dia;

    // Anisotropic contraction (LV apex twists and shortens vertically)
    heartGroupRef.current.scale.set(s, s * 1.025, s * 0.98);
  }
});
```

---

## 4. Multi-Spectral CT Windowing Shaders

PulsePlex includes four switchable diagnostic viewing modes modeled after clinical imaging protocols (Computed Tomography Coronary Angiography and catheterization lab fluoroscopy):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           CT WINDOWING SHADER MODES                              │
├─────────────────┬──────────────────────────────────┬─────────────────────────────┤
│ View Mode       │ Myocardial Appearance            │ Coronary Arterial Shading   │
├─────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ 1. Anatomical   │ Warm biological red (#842226),   │ ML Risk Palette (Green,     │
│                 │ semi-translucent (roughness 0.5) │ Amber, Red) with 0.25 emiss.│
├─────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ 2. Angio        │ Deep fluoroscopic dark (#0f172a),│ High-emission iodine lumen  │
│    (Fluoroscopy)│ high specular attenuation        │ glow (#38bdf8 / #ef4444)    │
├─────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ 3. Calcium      │ Ghosted dark slate (#090d16),    │ Agatston dense calcification│
│    Scoring      │ translucent outline (opacity 0.4)│ speckles (HU 900+ gold/white│
├─────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ 4. Flow         │ Translucent deep navy,           │ Animated hemodynamic        │
│    Dynamics     │ structural chamber guide         │ perfusion velocity pulses   │
└─────────────────┴──────────────────────────────────┴─────────────────────────────┘
```

---

## 5. Virtual Percutaneous Coronary Intervention (PCI) Stenting

When an artery exhibits significant stenosis ($\ge 50\%$), clinicians can open the **Plaque Cutaway Inspector** and simulate catheter deployment of a **Drug-Eluting Stent (DES)**.

```
       PRE-INTERVENTION STENOSIS                      POST-PCI STENT EXPANSION
       
        ╭───────────────╮                              ╭───────────────╮
       │   Atheroma Plaque│                            │  Stent Struts  │
      │  ┌─────────────┐   │                          │  ┌─────────────┐ │
      │  │ Lipid Core  │   │                          │  │ Restored    │ │
      │  └─────────────┘   │       DEPLOY DES         │  │ Lumen Area  │ │
      │       Lumen        │     ══════════════►      │  │  3.3 mm²    │ │
      │      0.8 mm²       │                          │  └─────────────┘ │
       │ (MLA 1.2 mm)  │                               │ (MLA 3.3 mm)  │
        ╰───────────────╯                              ╰───────────────╯
       Stenosis: 78% | FFR: 0.61                      Stenosis: 8% | FFR: 0.96
```

### 1. 3D WebGL Stent Wireframe Mesh
Upon stent deployment, a 3D metallic stent lattice appears over the target lesion in the WebGL scene:
```typescript
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
```

### 2. Restored Hemodynamic Parameters
* **Minimal Lumen Diameter (MLD):** Restores to $92\%$ of reference vessel diameter.
* **Minimal Lumen Area (MLA):** Expands from $\sim 0.8\text{ mm}^2$ to $> 3.3\text{ mm}^2$.
* **FFR Normalization:** Fractional Flow Reserve increases from an ischemic $0.61$ to a patent $0.96$.
* **Real-time 3D Scene Recalibration:** Target artery color immediately shifts from ischemic red (`#ef4444`) to patent emerald (`#10b981`).

---

## 6. Clinical C-Arm Fluoroscopy Presets

To match catheterization laboratory workflows, camera navigation buttons snap the Three.js viewport into standard fluoroscopic gantry angles:

1. **RAO Cranial (Right Anterior Oblique Cranial):** Positioned at `[0.2, 0.1, 3.8]`, optimal for visualizing the Left Anterior Descending (LAD) and diagonal branches.
2. **LAO Caudal "Spider View" (Left Anterior Oblique Caudal):** Positioned at `[3.4, 0.6, 1.2]`, optimal for inspecting the Left Circumflex (LCX) and obtuse marginal bifurcation.
3. **LAO Cranial (Left Anterior Oblique Cranial):** Positioned at `[-3.2, -0.6, 1.8]`, optimal for examining the Right Coronary Artery (RCA) and posterior descending branch.

