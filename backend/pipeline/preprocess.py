"""
Data Preprocessing Pipeline for Z-Alizadeh Sani Extended Dataset.
Strictly eliminates target leakage (LAD, LCX, RCA, Cath excluded from input features).
"""

import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "z_alizadeh_sani_extended.csv")

# Categorical column definitions
YN_COLUMNS = [
    'Obesity', 'CRF', 'CVA', 'Airway disease', 'Thyroid Disease', 'CHF', 'DLP',
    'Weak Peripheral Pulse', 'Lung rales', 'Systolic Murmur', 'Diastolic Murmur',
    'Dyspnea', 'Atypical', 'Nonanginal', 'Exertional CP', 'LowTH Ang', 'LVH', 'Poor R Progression'
]

MULTI_CAT_COLUMNS = ['BBB', 'VHD']

NUMERIC_COLUMNS = [
    'Age', 'Weight', 'Length', 'BMI', 'BP', 'PR', 'Function Class',
    'FBS', 'CR', 'TG', 'LDL', 'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na',
    'WBC', 'Lymph', 'Neut', 'PLT', 'EF-TTE', 'Region RWMA'
]

BINARY_INT_COLUMNS = [
    'DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH', 'Edema',
    'Typical Chest Pain', 'Q Wave', 'St Elevation', 'St Depression', 'Tinversion'
]

TARGET_COLUMNS = ['Cath', 'LAD', 'LCX', 'RCA']


class ClinicalDataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.fitted = False
        self.reference_medians = {}
        self.bbb_categories = ['N', 'LBBB', 'RBBB']
        self.vhd_categories = ['N', 'mild', 'Moderate', 'Severe']

    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()

        # Clean string whitespace
        for col in clean_df.select_dtypes(include=['object', 'string']).columns:
            clean_df[col] = clean_df[col].astype(str).str.strip()

        # Sex encoding: Male -> 1, Female/Fmale -> 0
        if 'Sex' in clean_df.columns:
            clean_df['Sex'] = clean_df['Sex'].apply(
                lambda x: 1 if str(x).strip().lower().startswith('m') else 0
            )

        # Binary Y/N conversion -> 1/0
        for col in YN_COLUMNS:
            if col in clean_df.columns:
                clean_df[col] = clean_df[col].apply(
                    lambda x: 1 if str(x).strip().upper() == 'Y' or str(x) == '1' else 0
                )

        # Binary int columns
        for col in BINARY_INT_COLUMNS:
            if col in clean_df.columns:
                clean_df[col] = pd.to_numeric(clean_df[col], errors='coerce').fillna(0).astype(int)

        # Multi-category one-hot encoding for BBB and VHD
        for cat in self.bbb_categories:
            col_name = f"BBB_{cat}"
            if 'BBB' in clean_df.columns:
                clean_df[col_name] = (clean_df['BBB'] == cat).astype(int)
            else:
                clean_df[col_name] = 0

        for cat in self.vhd_categories:
            col_name = f"VHD_{cat}"
            if 'VHD' in clean_df.columns:
                clean_df[col_name] = (clean_df['VHD'] == cat).astype(int)
            else:
                clean_df[col_name] = 0

        # Drop original raw categorical columns
        for col in ['BBB', 'VHD']:
            if col in clean_df.columns:
                clean_df.drop(columns=[col], inplace=True)

        return clean_df

    def fit(self, df: pd.DataFrame):
        # Exclude targets to prevent any data leakage
        feature_df = df.drop(columns=[c for c in TARGET_COLUMNS if c in df.columns], errors='ignore')
        cleaned_df = self._clean_dataframe(feature_df)

        self.feature_columns = [c for c in cleaned_df.columns if c not in TARGET_COLUMNS]

        # Calculate medians for missing value fallback
        for col in self.feature_columns:
            self.reference_medians[col] = float(cleaned_df[col].median())

        self.scaler.fit(cleaned_df[self.feature_columns])
        self.fitted = True
        return self

    def transform(self, df: pd.DataFrame, scale: bool = False) -> pd.DataFrame:
        if not self.fitted:
            raise RuntimeError("Preprocessor must be fitted before transform")

        feature_df = df.drop(columns=[c for c in TARGET_COLUMNS if c in df.columns], errors='ignore')
        cleaned_df = self._clean_dataframe(feature_df)

        # Ensure all expected feature columns exist
        for col in self.feature_columns:
            if col not in cleaned_df.columns:
                cleaned_df[col] = self.reference_medians.get(col, 0.0)

        aligned_df = cleaned_df[self.feature_columns].copy()

        # Handle any remaining NaNs
        for col in self.feature_columns:
            aligned_df[col] = aligned_df[col].fillna(self.reference_medians.get(col, 0.0))

        if scale:
            scaled_array = self.scaler.transform(aligned_df)
            return pd.DataFrame(scaled_array, columns=self.feature_columns, index=aligned_df.index)

        return aligned_df

    def fit_transform(self, df: pd.DataFrame, scale: bool = False) -> pd.DataFrame:
        self.fit(df)
        return self.transform(df, scale=scale)


def load_and_preprocess_data(csv_path: str = DATA_PATH):
    """
    Loads dataset, isolates target variables, strictly excludes target leakage columns,
    and returns preprocessed X and dictionary of targets y.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    raw_df = pd.read_csv(csv_path)

    # Validate leakage exclusion
    print(f"[Preprocessing] Loaded {len(raw_df)} records with {raw_df.shape[1]} columns.")

    # Target isolation
    # 1. Overall CAD: 1 if Cath == 'CAD' else 0
    y_cad = (raw_df['Cath'].astype(str).str.strip() == 'CAD').astype(int)

    # 2. LAD Stenosis: 1 if LAD == 'Stenotic' else 0
    y_lad = (raw_df['LAD'].astype(str).str.strip().str.capitalize() == 'Stenotic').astype(int)

    # 3. LCX Stenosis: 1 if LCX == 'Stenotic' else 0
    y_lcx = (raw_df['LCX'].astype(str).str.strip().str.capitalize() == 'Stenotic').astype(int)

    # 4. RCA Stenosis: 1 if RCA == 'Stenotic' else 0
    y_rca = (raw_df['RCA'].astype(str).str.strip().str.capitalize() == 'Stenotic').astype(int)

    y_dict = {
        'CAD': y_cad,
        'LAD': y_lad,
        'LCX': y_lcx,
        'RCA': y_rca
    }

    preprocessor = ClinicalDataPreprocessor()
    X = preprocessor.fit_transform(raw_df, scale=False)

    print(f"[Preprocessing] Input features shape: {X.shape}. Targets excluded: {TARGET_COLUMNS}")
    print(f"[Preprocessing] Positive target counts -> CAD: {y_cad.sum()}, LAD: {y_lad.sum()}, LCX: {y_lcx.sum()}, RCA: {y_rca.sum()}")

    return X, y_dict, preprocessor, raw_df


if __name__ == "__main__":
    X, y_dict, preprocessor, _ = load_and_preprocess_data()
    print("Features:", X.columns.tolist()[:10], "... total:", len(X.columns))

