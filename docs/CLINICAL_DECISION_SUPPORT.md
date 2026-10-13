# PulsePlex: Clinical Decision Support & Cardiology Intelligence

This document details the clinical decision-support architecture of **PulsePlex**, including the SCCT CAD-RADS™ 2.0 classification engine, What-If Guideline-Directed Medical Therapy (GDMT) counterfactual simulation, hemodynamic CT-FFR estimation, dynamic Lead II ECG morphology synchronization, and EHR consultation report generation.

---

## 1. Clinical Rationale & System Scope

While predictive machine learning models generate probabilities (e.g., $88\%$ CAD risk), raw numeric scores are rarely sufficient for clinical action in cardiovascular practice. Clinicians require:
1. **Standardized clinical staging** that maps directly to established medical society guidelines.
2. **Actionable counterfactual projections** showing how pharmaceutical and lifestyle interventions will reduce future risk.
3. **Hemodynamic and morphological context** (lesion length, minimal lumen area, fractional flow reserve, and ECG correlates).
4. **Structured documentation** ready for hospital Electronic Health Record (EHR) systems and multidisciplinary Heart Team review.

PulsePlex translates XGBoost multi-vessel predictions into standardized **ACC/AHA** and **SCCT** clinical protocols.

---

## 2. SCCT CAD-RADS™ 2.0 Classification Engine

PulsePlex integrates the official **Coronary Artery Disease - Reporting and Data System (CAD-RADS™ 2.0)** established by the Society of Cardiovascular Computed Tomography (SCCT), American College of Radiology (ACR), and North American Society for Cardiovascular Imaging (NASCI).

### Algorithmic Decision Flow

```
                      ┌──────────────────────────────────────┐
                      │  Max Vessel Luminal Stenosis (S_max) │
                      └──────────────────┬───────────────────┘
                                         │
        ┌──────────────┬─────────────────┼─────────────────┬─────────────────┐
        ▼              ▼                 ▼                 ▼                 ▼
   S_max < 1%     1% - 24%          25% - 49%         50% - 69%          ≥ 70%
   CAD-RADS 0    CAD-RADS 1        CAD-RADS 2        CAD-RADS 3              │
  (No Plaque)  (Minimal Non-Obs) (Mild Non-Obs)   (Moderate Obs)             ▼
                                                                     ┌───────────────┐
                                                                     │ Vessel Count  │
                                                                     └───┬───────┬───┘
                                                                1-2 Obs  │       │ 3 Obs or LMCA
                                                                         ▼       ▼
                                                                     CAD-RADS 4A CAD-RADS 4B
                                                                     (Single/Dbl) (Multi-vessel)
                                                                             │
                                                                   S_max = 100% ──► CAD-RADS 5
                                                                             │
                                                                   Vulnerable? ───► + Modifier "/V"
```

### Grade Specifications & Clinical Management Mappings

| CAD-RADS Grade | Stenosis Severity | Anatomical Definition | ACC/AHA Clinical Management Guideline |
| :--- | :--- | :--- | :--- |
| **CAD-RADS 0** | **0%** | Documented Absence of CAD | Reassurance; no further cardiovascular testing indicated. |
| **CAD-RADS 1** | **1% – 24%** | Minimal Non-Obstructive CAD | Primary prevention; lifestyle modification and risk factor counseling. |
| **CAD-RADS 2** | **25% – 49%** | Mild Non-Obstructive CAD | Preventive pharmacotherapy (Statin + Aspirin); target LDL $< 70\text{ mg/dL}$. |
| **CAD-RADS 3** | **50% – 69%** | Moderate Obstructive CAD | Guideline-Directed Medical Therapy (GDMT); consider functional stress testing or CT-FFR. |
| **CAD-RADS 4A** | **70% – 99%** | Severe Single- or Two-Vessel CAD | Cardiology consultation; consider Invasive Coronary Angiography (ICA) and revascularization. |
| **CAD-RADS 4B** | **$\ge 70\%$ Multi** | 3-Vessel Obstructive CAD or Left Main $\ge 50\%$ | Urgent cardiology referral; Heart Team evaluation for revascularization (CABG vs. PCI). |
| **CAD-RADS 5** | **100%** | Total Coronary Occlusion | Urgent invasive evaluation for chronic total occlusion (CTO) or acute coronary syndrome. |
| **Modifier /V** | Any ($\ge 25\%$) | High-Risk Plaque Features (Low Attenuation $<30\text{ HU}$, positive remodeling) | Aggressive plaque-stabilizing pharmacotherapy; close cardiological follow-up. |

---

## 3. What-If Guideline-Directed Medical Therapy (GDMT) Simulator

The **What-If Simulator** allows clinicians to test pharmaceutical and lifestyle interventions interactively, observing the immediate quantitative drop in CAD risk and seeing the 3D heart recolor in real time.

```
       PATIENT BASELINE                               WHAT-IF COUNTERFACTUAL
     ┌────────────────────────┐                     ┌────────────────────────┐
     │ CAD Probability: 91.2% │                     │ CAD Probability: 44.6% │
     │ CAD-RADS 4A (High Risk)│                     │ CAD-RADS 2 (Mild Risk) │
     │ LDL: 168 mg/dL         │   APPLY GDMT        │ LDL: 68 mg/dL          │
     │ SBP: 154 mmHg          │ ═════════════►      │ SBP: 118 mmHg          │
     │ Smoker: Yes            │                     │ Smoker: Cessation      │
     │ LAD: 78% Stenosis      │                     │ LAD: Restored Flow     │
     └────────────────────────┘                     └────────────────────────┘
          Absolute Risk Reduction: -46.6% | Number Needed to Treat (NNT): 3
```

### Intervention Rules & Pharmacological Heuristics

1. **High-Intensity Statin Therapy (Atorvastatin 80 mg / Rosuvastatin 40 mg):**
   * Plaque stabilization heuristic: Reduces serum LDL by $50\%$ (capped at target $\le 68\text{ mg/dL}$).
   * Reduces serum triglycerides by $20\%$.
   * Resolves clinical dyslipidemia flag (`DLP` $\to$ `'N'`).
2. **Antihypertensive Optimization (Dual ACEi/ARB + CCB):**
   * Normalizes Systolic Blood Pressure to target $\le 118\text{ mmHg}$.
3. **Smoking Cessation Protocol:**
   * Transitions `Current Smoker` ($1 \to 0$) and updates `EX-Smoker` ($1$).
4. **Intensive Glycemic & Metabolic Control (SGLT2i / GLP-1 RA):**
   * Normalizes Fasting Blood Sugar to $\le 92\text{ mg/dL}$.
   * Reduces BMI and body weight by $10\%$ for overweight patients ($\text{BMI} > 24$).
5. **Cardioprotective Cardiac Rehabilitation & Exercise:**
   * Restores resting pulse rate to $\le 65\text{ bpm}$.
   * Elevates protective HDL cholesterol by $+15\%$.
   * Alleviates anginal symptoms: converts typical chest pain to atypical.

### Quantitative Counterfactual Metrics

* **Absolute Risk Reduction (ARR):**
  $$\text{ARR} = P_{\text{baseline}} - P_{\text{projected}}$$
* **Number Needed to Treat (NNT):**
  $$\text{NNT} = \left\lceil \frac{1}{\text{ARR}} \right\rceil$$

When previewed, the counterfactual feature vector is dispatched to `/predict`, updating the 3D heart colors and SHAP waterfall chart.

---

## 4. Hemodynamic CT-FFR Fluid Modeling

Fractional Flow Reserve (FFR) is the clinical gold standard for determining whether a coronary stenosis causes myocardial ischemia ($\text{FFR} \le 0.80$ is hemodynamically significant).

PulsePlex computes an empirical non-invasive FFR estimate using reference vessel diameter, minimal lumen diameter, and lesion length:

$$\text{FFR}_{\text{estimate}} = \max\left(0.45, \, 1.0 - \left(\frac{\%\text{stenosis}}{100}\right) \times 0.58\right)$$

* **Patent / Mild Lesions ($<50\%$ stenosis):** $\text{FFR} \ge 0.85$ (no flow limitation).
* **Significant Lesions ($50\% - 70\%$):** $\text{FFR} \in [0.75, 0.85]$ (borderline zone).
* **Severe Lesions ($>70\%$):** $\text{FFR} \le 0.60$ (severe translesional pressure gradient; revascularization indicated).

---

## 5. Dynamic Lead II ECG Waveform Synchronization

PulsePlex renders a continuous **60 FPS HTML5 Canvas oscilloscope** displaying a synthetic Lead II ECG rhythm. The waveform morphs in real time based on the active patient profile's diagnostic features:

```
           P            R
           /\          / \
          /  \        /   \                 T
         /    \      /     \   ST-Segment  / \
  ───────      ─────Q       \─────────────/   \───── Baseline
                             \           /
                              \         /
                               S───────
```

### Morphological Wave Deviations

1. **ST-Segment Elevation (`St Elevation = 1`):**
   * Displaces the ST-junction $+3.5\text{ mm}$ above baseline into an acute "tombstone" morphology (indicative of acute transmural infarction).
2. **ST-Segment Depression (`St Depression = 1`):**
   * Depresses the ST-junction $-2.5\text{ mm}$ below baseline with horizontal or downsloping contour (indicative of subendocardial ischemia).
3. **T-Wave Inversion (`Tinversion = 1`):**
   * Inverts the normally upright T-wave into a negative deflection (ischemic repolarization disturbance).
4. **Pathological Q-Wave (`Q Wave = 1`):**
   * Deepens the initial negative Q deflection to $>25\%$ of the ensuing R-wave peak (indicating established myocardial necrosis).

---

## 6. ACC/AHA Clinical Consultation Note & EHR Integration

The platform includes a dedicated **Clinical EHR Report** modal that aggregates multimodal diagnostic data into an **ACC/AHA Consultation Note** formatted for copy/export into hospital EHR systems (Epic, Cerner) or PDF printing.

### Note Structure

1. **Patient Demographics & Vitals:** Age, Sex, BMI, Blood Pressure, Resting Pulse Rate.
2. **Chief Complaint & Presentation:** Character of chest pain (typical anginal vs. atypical), functional NYHA class.
3. **Diagnostic Modalities:**
   * 12-Lead ECG findings (ST/T status, pathological Q waves, bundle branch blocks).
   * Laboratory biomarkers (Lipid panel, fasting glucose, renal biomarkers).
   * Transthoracic Echocardiogram (Left Ventricular Ejection Fraction, RWMA score).
4. **Predictive AI Assessment:**
   * Multi-vessel stenosis probabilities: LAD, LCX, RCA.
   * Official SCCT CAD-RADS™ 2.0 grade with risk modifiers.
   * Top SHAP game-theoretic risk drivers.
5. **Guideline-Directed Management Plan:**
   * Recommended pharmacotherapy adjustments (Statin, Antiplatelet, Antihypertensive).
   * Recommendation regarding Invasive Coronary Angiography vs. non-invasive stress imaging.
6. **Regulatory Disclaimer:** Explicit declaration of investigational decision support status in compliance with clinical safety protocols.

