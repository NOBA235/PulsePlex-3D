"""
Model Training & Evaluation Pipeline for Cardiovascular Risk & Multi-Vessel Stenosis.
Trains models for CAD, LAD, LCX, and RCA, logs metrics to JSON, and serializes artifacts.
"""

import os
import json
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report
)
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier

from preprocess import load_and_preprocess_data

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def train_and_evaluate_models():
    X, y_dict, preprocessor, raw_df = load_and_preprocess_data()

    # Save preprocessor artifact
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "preprocessor.pkl"))
    print(f"[Training] Saved preprocessor to {MODELS_DIR}/preprocessor.pkl")

    metrics_summary = {}
    trained_models = {}

    targets = ['CAD', 'LAD', 'LCX', 'RCA']

    # Hyperparameters tuned for medical tabular classification with moderate sample size (n=303)
    model_params = {
        'CAD': {'n_estimators': 120, 'max_depth': 4, 'learning_rate': 0.05, 'subsample': 0.85, 'colsample_bytree': 0.85, 'random_state': 42},
        'LAD': {'n_estimators': 110, 'max_depth': 4, 'learning_rate': 0.05, 'subsample': 0.85, 'colsample_bytree': 0.85, 'random_state': 42},
        'LCX': {'n_estimators': 110, 'max_depth': 3, 'learning_rate': 0.05, 'subsample': 0.85, 'colsample_bytree': 0.80, 'random_state': 42},
        'RCA': {'n_estimators': 110, 'max_depth': 4, 'learning_rate': 0.05, 'subsample': 0.85, 'colsample_bytree': 0.80, 'random_state': 42},
    }

    for target_name in targets:
        print(f"\n==================== Training for: {target_name} ====================")
        y = y_dict[target_name]

        # Stratified Train/Test split for evaluation (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, stratify=y, random_state=42
        )

        params = model_params[target_name]
        eval_model = XGBClassifier(
            **params,
            eval_metric='logloss'
        )
        eval_model.fit(X_train, y_train)

        # Predictions
        y_pred = eval_model.predict(X_test)
        y_prob = eval_model.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        roc_auc = float(roc_auc_score(y_test, y_prob))

        # Cross-validation scores (5-fold stratified)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_rocs = []
        cv_accs = []
        for train_idx, val_idx in cv.split(X, y):
            cv_clf = XGBClassifier(**params, eval_metric='logloss')
            cv_clf.fit(X.iloc[train_idx], y.iloc[train_idx])
            cv_prob = cv_clf.predict_proba(X.iloc[val_idx])[:, 1]
            cv_pred = cv_clf.predict(X.iloc[val_idx])
            cv_rocs.append(roc_auc_score(y.iloc[val_idx], cv_prob))
            cv_accs.append(accuracy_score(y.iloc[val_idx], cv_pred))

        mean_cv_roc = float(np.mean(cv_rocs))
        mean_cv_acc = float(np.mean(cv_accs))

        print(f"[{target_name}] Test Set -> Acc: {acc:.4f}, Prec: {prec:.4f}, Rec: {rec:.4f}, F1: {f1:.4f}, ROC-AUC: {roc_auc:.4f}")
        print(f"[{target_name}] 5-Fold CV -> Mean Acc: {mean_cv_acc:.4f}, Mean ROC-AUC: {mean_cv_roc:.4f}")

        # Train final production model on full dataset
        final_model = XGBClassifier(**params, eval_metric='logloss')
        final_model.fit(X, y)

        # Save model artifact
        model_filename = f"{target_name.lower()}_model.pkl"
        model_filepath = os.path.join(MODELS_DIR, model_filename)
        joblib.dump(final_model, model_filepath)
        trained_models[target_name] = final_model

        # Store evaluation metrics
        metrics_summary[target_name] = {
            "target": target_name,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "cv_mean_accuracy": round(mean_cv_acc, 4),
            "cv_mean_roc_auc": round(mean_cv_roc, 4),
            "test_sample_size": len(y_test),
            "train_sample_size": len(y_train),
            "positive_class_ratio": round(float(y.mean()), 4)
        }

    # Save metrics JSON
    metrics_json_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_json_path, "w") as f:
        json.dump(metrics_summary, f, indent=2)

    print(f"\n[Training Completed] Metrics written to {metrics_json_path}")
    return trained_models, metrics_summary


if __name__ == "__main__":
    train_and_evaluate_models()

