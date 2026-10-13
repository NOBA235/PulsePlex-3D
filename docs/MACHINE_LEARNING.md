# PulsePlex: Machine Learning Pipeline & Clinical AI

This document provides a comprehensive technical overview of the machine learning architecture, anti-leakage data protocol, hyperparameter optimization, empirical validation benchmarks, and game-theoretic explainability engine powering **PulsePlex**.

---

## 1. Executive Summary & Clinical Problem Framing

Coronary Artery Disease (CAD) remains the primary contributor to global cardiovascular mortality. The gold standard for definitive diagnosis and therapeutic revascularization planning is **Invasive Coronary Angiography (ICA)**. However, invasive catheterization entails procedural risks (arterial dissection, contrast-induced nephropathy, stroke, bleeding) and substantial financial costs.

In outpatient and emergency triage settings, clinicians must synthesize high-dimensional, heterogeneous non-invasive data:
1. Patient demographics and physical vitals.
2. Comorbidities and cardiovascular history.
3. Symptom phenomenology (anginal characteristics, functional classification).
4. Standard 12-lead Electrocardiography (ECG) morphological waveforms.
5. Serum laboratory biomarkers.
6. Transthoracic Echocardiography (TTE) hemodynamics.

**PulsePlex** delivers a multi-task ensemble of four independent Gradient-Boosted Decision Tree (XGBoost) models that predict **overall CAD status** and **vessel-specific stenosis ($\ge 50\%$)** across the three primary coronary arteries:
* **LAD** (*Left Anterior Descending* — "The Widowmaker")
* **LCX** (*Left Circumflex*)
* **RCA** (*Right Coronary Artery*)

---

## 2. Dataset Architecture: UCI Z-Alizadeh Sani Cohort

PulsePlex is trained and validated on the peer-reviewed **UCI Extension of the Z-Alizadeh Sani Cardiovascular Cohort** ($n = 303$ clinical records, $59$ distinct attributes).

### Diagnostic Breakdown ($n = 303$)

| Target Endpoint | Negative (Normal / Non-significant) | Positive ($\ge 50\%$ Luminal Stenosis) | Positive Prevalence ($\%$) |
| :--- | :--- | :--- | :--- |
| **Overall CAD** | 87 patients | 216 patients | **71.29%** |
| **LAD Stenosis** | 126 patients | 177 patients | **58.42%** |
| **LCX Stenosis** | 184 patients | 119 patients | **39.27%** |
| **RCA Stenosis** | 189 patients | 114 patients | **37.62%** |

### Input Modality Taxonomy (55 Raw Features Pre-Encoding)

```
                            ┌──────────────────────────────────────────────┐
                            │      UCI Z-ALIZADEH SANI INPUT FEATURES      │
                            └──────────────────────┬───────────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         ▼                   ▼                     ▼                     ▼                   ▼
   Demographics &      Comorbidities &       Clinical Exam &       12-Lead ECG         Lab Tests &
   Vitals (7)          Risk History (12)     Symptoms (11)         Waveforms (7)       Echocardiogram (18)
   • Age               • Diabetes (DM)       • Typical Chest Pain  • ST-Elevation      • Fasting Glucose
   • Sex (M/F)         • Hypertension (HTN)  • Atypical Angina     • ST-Depression     • Creatinine / BUN
   • Weight (kg)       • Current Smoker      • Non-anginal Pain    • T-Wave Inversion  • Triglycerides
   • Height (cm)       • Ex-Smoker           • Exertional Dyspnea  • Pathological Q    • LDL & HDL Chol.
   • BMI ($kg/m^2$)    • Family History      • LowTH Angina        • LVH Voltages      • Platelets / WBC
   • Systolic BP       • Dyslipidemia (DLP)  • Functional Class    • Poor R Progression• EF-TTE (%)
   • Pulse Rate (bpm)  • Chronic Renal Fail. • Lung Rales / Edema  • Bundle Branch Blk • Region RWMA
                       • CHF / CVA / Airway  • Heart Murmurs       (LBBB / RBBB / N)   • Valvular Disease
```

---

## 3. Strict Anti-Leakage Protocol

### The Catheterization Leakage Trap

In cardiovascular machine learning literature, naive feature sets often inadvertently include post-procedure labels or catheterization measurements that would never be available at the time of non-invasive triage.

Specifically, the Z-Alizadeh Sani dataset records:
* `Cath`: Definitive diagnostic outcome from catheterization (`CAD` vs. `Normal`).
* `LAD`: Catheterization finding for LAD stenosis (`Stenotic` vs. `Normal`).
* `LCX`: Catheterization finding for LCX stenosis (`Stenotic` vs. `Normal`).
* `RCA`: Catheterization finding for RCA stenosis (`Stenotic` vs. `Normal`).

> [!CAUTION]
> If `LAD` is left in the feature vector when training an overall `CAD` model, or if `Cath` is available to vessel models, the classifier achieves trivial $>98\%$ accuracy by memorizing the catheterization outcome. This produces a clinically useless, catastrophically leaking system.

### Enforcement Protocol

In `backend/pipeline/preprocess.py`:

```python
TARGET_COLUMNS = ['Cath', 'LAD', 'LCX', 'RCA']

# Strict programmatic exclusion
X = clean_df.drop(columns=[c for c in TARGET_COLUMNS if c in clean_df.columns])
```

The mathematical input feature space $\mathcal{X} \subset \mathbb{R}^{60}$ contains **exclusively pre-catheterization observations**:

$$\mathbf{x} \in \mathcal{X}_{\text{pre-cath}}, \quad \mathbf{y} = \begin{bmatrix} y_{\text{CAD}} \\ y_{\text{LAD}} \\ y_{\text{LCX}} \\ y_{\text{RCA}} \end{bmatrix} \in \{0, 1\}^4$$

---

## 4. Feature Engineering & Preprocessing Pipeline

To guarantee sub-80ms inference latency without external network dependencies, preprocessing is packaged into a self-contained pipeline object (`ClinicalDataPreprocessor`) serialized via `joblib`.

### Encoding Architecture

1. **Binary Yes/No Normalization ($18$ features):**
   * Features: `Obesity`, `CRF`, `CVA`, `Airway disease`, `Thyroid Disease`, `CHF`, `DLP`, `Weak Peripheral Pulse`, `Lung rales`, `Systolic Murmur`, `Diastolic Murmur`, `Dyspnea`, `Atypical`, `Nonanginal`, `Exertional CP`, `LowTH Ang`, `LVH`, `Poor R Progression`.
   * Mapped cleanly: $\text{`Y`} \to 1, \quad \text{`N`} \to 0$.

2. **Categorical Multi-Class One-Hot Expansion:**
   * Bundle Branch Block (`BBB`): Expanded into orthogonal binary indicators $\text{BBB\_N}$, $\text{BBB\_LBBB}$, $\text{BBB\_RBBB}$.
   * Valvular Heart Disease (`VHD`): Expanded into categorical columns $\text{VHD\_N}$, $\text{VHD\_mild}$, $\text{VHD\_Moderate}$, $\text{VHD\_Severe}$.

3. **Continuous Numeric Normalization ($23$ features):**
   * Features include `Age`, `BMI`, `BP`, `PR`, `FBS`, `CR`, `TG`, `LDL`, `HDL`, `EF-TTE`, etc.
   * Scaled with Scikit-Learn's `StandardScaler`:
     $$z = \frac{x - \mu_{\text{train}}}{\sigma_{\text{train}}}$$
   * Means ($\mu_{\text{train}}$) and variances ($\sigma_{\text{train}}^2$) are computed **strictly on the training partition** to prevent test distribution contamination. Missing values default to empirical training medians.

4. **Dimensionality:**
   * Total encoded features: **60 continuous and binary dimensions**.

---

## 5. Model Architecture & Training Strategy

### Why Gradient Boosted Decision Trees (XGBoost)?

Tabular medical diagnostic datasets possess distinct mathematical properties:
1. Heterogeneous scales (e.g., continuous blood pressure $[90, 190]$ alongside binary ECG flags $[0, 1]$).
2. Complex non-linear feature interactions (e.g., elevated LDL exacerbates risk exponentially in the presence of diabetes and smoking).
3. Sparse categorical indicators (e.g., rare murmurs or bundle branch blocks).

Tree ensembles routinely outperform deep multilayer perceptrons on tabular benchmarks while maintaining exact tree-level game-theoretic explainability.

### Hyperparameter Configurations

Hyperparameters were calibrated through cross-validation grid search to prevent overfitting on $n = 303$:

```python
MODEL_PARAMS = {
    'CAD': {
        'n_estimators': 120,
        'max_depth': 4,
        'learning_rate': 0.05,
        'subsample': 0.85,
        'colsample_bytree': 0.85,
        'eval_metric': 'logloss',
        'random_state': 42
    },
    'LAD': {
        'n_estimators': 110,
        'max_depth': 4,
        'learning_rate': 0.05,
        'subsample': 0.85,
        'colsample_bytree': 0.85,
        'eval_metric': 'logloss',
        'random_state': 42
    },
    'LCX': {
        'n_estimators': 110,
        'max_depth': 3,
        'learning_rate': 0.05,
        'subsample': 0.85,
        'colsample_bytree': 0.80,
        'eval_metric': 'logloss',
        'random_state': 42
    },
    'RCA': {
        'n_estimators': 110,
        'max_depth': 4,
        'learning_rate': 0.05,
        'subsample': 0.85,
        'colsample_bytree': 0.80,
        'eval_metric': 'logloss',
        'random_state': 42
    }
}
```

---

## 6. Empirical Validation & Benchmarks

Models were evaluated using an **80/20 Stratified Holdout Split** ($n_{\text{train}} = 242$, $n_{\text{test}} = 61$) and an independent **5-Fold Stratified Cross-Validation**:

```
                       EMPIRICAL BENCHMARK MATRIX (TEST & 5-FOLD CV)
```

| Target Endpoint | Test Accuracy | Test Precision | Test Recall | Test F1-Score | Holdout ROC-AUC | 5-Fold CV Mean Acc | 5-Fold CV Mean ROC-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CAD (Overall)** | **83.61%** | **85.11%** | **93.02%** | **0.8889** | **0.8488 (84.9%)** | **84.48%** | **0.9137 (91.4%)** |
| **LAD Stenosis** | **75.41%** | **78.38%** | **80.56%** | **0.7945** | **0.8289 (82.9%)** | **78.89%** | **0.8430 (84.3%)** |
| **LCX Stenosis** | **67.21%** | **61.11%** | **45.83%** | **0.5238** | **0.7568 (75.7%)** | **68.32%** | **0.7271 (72.7%)** |
| **RCA Stenosis** | **75.41%** | **78.57%** | **47.83%** | **0.5946** | **0.7666 (76.7%)** | **67.32%** | **0.7223 (72.2%)** |

### Clinical Performance Insights

1. **CAD Sensitivity / Recall of 93.02%:**
   In clinical screening, false negatives are catastrophic (a patient with undiagnosed severe CAD sent home can suffer acute myocardial infarction). An F1-score of 0.8889 and recall of 93.02% minimizes missed coronary disease.
2. **LAD Discrimination (ROC-AUC 84.3% in 5-Fold CV):**
   The Left Anterior Descending artery supplies $>50\%$ of the left ventricular myocardium. Reliable non-invasive detection of LAD stenosis provides critical early warning for high-risk revascularization candidates.
3. **LCX and RCA Anatomical Variance:**
   The LCX and RCA exhibit lower baseline positive prevalence (39.2% and 37.6%), as well as greater anatomical coronary dominance variability (right-dominant vs. left-dominant circulation). Despite lower sensitivity, holdout ROC-AUCs remain strong at 75.7% and 76.7%.

---

## 7. Game-Theoretic Explainability via SHAP TreeExplainer

In medical artificial intelligence, black-box predictions violate clinical trust. PulsePlex embeds **SHAP (SHapley Additive exPlanations)** directly into every `/predict` response.

### Mathematical Formulation

Shapley values originate from cooperative game theory, representing the unique additive attribution solution satisfying **Efficiency**, **Symmetry**, **Dummy player**, and **Additivity**.

For a single patient instance $\mathbf{x}$, the model output $f(\mathbf{x})$ in log-odds space is decomposed into the expected baseline value $\phi_0$ plus the sum of local feature attributions $\phi_i$:

$$f(\mathbf{x}) = \phi_0 + \sum_{i=1}^{M} \phi_i(\mathbf{x})$$

Where each feature attribution $\phi_i$ is computed over all possible feature subsets $S \subseteq F \setminus \{i\}$:

$$\phi_i(\mathbf{x}) = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f(S \cup \{i\}) - f(S) \right]$$

### TreeSHAP Algorithm Execution

While computing exact Shapley values across $M = 60$ features naively requires $2^{60} \approx 1.15 \times 10^{18}$ evaluations, PulsePlex runs **TreeSHAP** (Lundberg et al., *Nature Machine Intelligence* 2020). TreeSHAP optimizes tree path traversal to $O(T L D^2)$, where $T$ is the number of trees (120), $L$ is maximum leaves (16), and $D$ is maximum tree depth (4).

Execution runs in **under 15 milliseconds** per request on the FastAPI backend.

```
       SAMPLE SHAP PATIENT DECOMPOSITION (LOG-ODDS CONTRIBUTION)
Base Rate E[f(x)] = 0.912
├─ [+] Typical Anginal Chest Pain   (+1.42 log-odds) ────────► [RISK ESCALATOR]
├─ [+] ST-Segment Depression         (+0.98 log-odds) ────────► [RISK ESCALATOR]
├─ [+] Regional Wall Motion Abn.    (+0.76 log-odds) ────────► [RISK ESCALATOR]
├─ [+] Patient Age = 67             (+0.54 log-odds) ────────► [RISK ESCALATOR]
├─ [-] HDL Cholesterol = 58 mg/dL   (-0.84 log-odds) ────────► [PROTECTIVE ATTENUATOR]
└─ [-] Normal Ejection Fraction 55% (-0.62 log-odds) ────────► [PROTECTIVE ATTENUATOR]
Final Model Prediction: 94.2% Probability CAD
```

### Conversion to Patient-Facing Attributions

The backend converts raw log-odds $\phi_i$ into standardized patient-level attributions and extracts the **Top 8 Positive Contributors (Red)** and **Top 8 Protective Factors (Green)**:

```json
{
  "feature": "Typical Chest Pain",
  "label": "Typical Anginal Chest Pain",
  "value": 1,
  "importance": 0.428,
  "direction": "positive"
}
```

These values stream directly into the frontend Recharts waterfall chart and inform the **What-If GDMT Counterfactual Simulator**.

