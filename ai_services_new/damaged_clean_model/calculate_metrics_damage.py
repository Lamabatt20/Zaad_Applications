#!/usr/bin/env python3
import os
import numpy as np
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import warnings
warnings.filterwarnings('ignore')

import tensorflow as tf
from tensorflow import keras
import cv2
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

os.chdir(r'C:\Users\Loor Ibrahim\Desktop\Zaad\Zaad_Applications\ai_services_new\damaged_clean_model')

DATASET_PATH = r'C:\Users\Loor Ibrahim\Desktop\Zaad\Zaad_Applications\ai-services\damage_detection\dataset'
clean_dir = os.path.join(DATASET_PATH, 'clean')
damaged_dir = os.path.join(DATASET_PATH, 'damaged')

clean_files = [f for f in os.listdir(clean_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
damaged_files = [f for f in os.listdir(damaged_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]

np.random.seed(123)
np.random.shuffle(clean_files)
np.random.shuffle(damaged_files)

val_split = 0.2
val_clean = clean_files[:int(len(clean_files)*val_split)]
val_damaged = damaged_files[:int(len(damaged_files)*val_split)]

print("="*80)
print("DAMAGED VS CLEAN MODEL - CALCULATING METRICS")
print("="*80)
print(f"\nLoading model...")
model = keras.models.load_model('models/best_can_inspector_model.h5')

all_true = []
all_scores = []

print(f"Processing validation set ({len(val_clean) + len(val_damaged)} images)...")

# Process clean images (label 0)
for fname in val_clean:
    try:
        img = cv2.imread(os.path.join(clean_dir, fname))
        if img is not None:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224))
            img = img.astype('float32') / 255.0
            score = model.predict(np.expand_dims(img, 0), verbose=0)[0][0]
            all_true.append(0)
            all_scores.append(float(score))
    except:
        pass

# Process damaged images (label 1)
for fname in val_damaged:
    try:
        img = cv2.imread(os.path.join(damaged_dir, fname))
        if img is not None:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224))
            img = img.astype('float32') / 255.0
            score = model.predict(np.expand_dims(img, 0), verbose=0)[0][0]
            all_true.append(1)
            all_scores.append(float(score))
    except:
        pass

all_true = np.array(all_true)
all_scores = np.array(all_scores)

print(f"\nTotal validation samples evaluated: {len(all_true)}")

# Threshold 0.5
pred_05 = (all_scores >= 0.5).astype(int)
acc_05 = accuracy_score(all_true, pred_05)
prec_05 = precision_score(all_true, pred_05, zero_division=0)
rec_05 = recall_score(all_true, pred_05, zero_division=0)
f1_05 = f1_score(all_true, pred_05, zero_division=0)
cm_05 = confusion_matrix(all_true, pred_05)

print("\n" + "="*80)
print("METRICS WITH THRESHOLD 0.5 (STANDARD)")
print("="*80)
print(f"Accuracy:  {acc_05:.4f} ({acc_05*100:.2f}%)")
print(f"Precision: {prec_05:.4f} ({prec_05*100:.2f}%)")
print(f"Recall:    {rec_05:.4f} ({rec_05*100:.2f}%)")
print(f"F1-Score:  {f1_05:.4f}")
print(f"\nConfusion Matrix (0.5):")
print(f"TN: {cm_05[0,0]} | FP: {cm_05[0,1]}")
print(f"FN: {cm_05[1,0]} | TP: {cm_05[1,1]}")

# Threshold 0.35
pred_035 = (all_scores >= 0.35).astype(int)
acc_035 = accuracy_score(all_true, pred_035)
prec_035 = precision_score(all_true, pred_035, zero_division=0)
rec_035 = recall_score(all_true, pred_035, zero_division=0)
f1_035 = f1_score(all_true, pred_035, zero_division=0)
cm_035 = confusion_matrix(all_true, pred_035)

print("\n" + "="*80)
print("METRICS WITH THRESHOLD 0.35 (API OPTIMIZED)")
print("="*80)
print(f"Accuracy:  {acc_035:.4f} ({acc_035*100:.2f}%)")
print(f"Precision: {prec_035:.4f} ({prec_035*100:.2f}%)")
print(f"Recall:    {rec_035:.4f} ({rec_035*100:.2f}%)")
print(f"F1-Score:  {f1_035:.4f}")
print(f"\nConfusion Matrix (0.35):")
print(f"TN: {cm_035[0,0]} | FP: {cm_035[0,1]}")
print(f"FN: {cm_035[1,0]} | TP: {cm_035[1,1]}")

# Additional metrics
tn, fp, fn, tp = cm_035.ravel()
sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

print(f"\n" + "="*80)
print("ADDITIONAL METRICS (0.35 Threshold)")
print("="*80)
print(f"Sensitivity (TPR): {sensitivity:.4f} ({sensitivity*100:.2f}%)")
print(f"Specificity (TNR): {specificity:.4f} ({specificity*100:.2f}%)")

print(f"\n" + "="*80)
print("PREDICTION SCORE STATISTICS")
print("="*80)
print(f"Min Score:     {all_scores.min():.4f}")
print(f"Max Score:     {all_scores.max():.4f}")
print(f"Mean Score:    {all_scores.mean():.4f}")
print(f"Std Dev:       {all_scores.std():.4f}")
print(f"Median Score:  {np.median(all_scores):.4f}")

clean_preds = np.sum(pred_035 == 0)
damaged_preds = np.sum(pred_035 == 1)

print(f"\nPrediction Distribution (0.35):")
print(f"Predicted Clean:   {clean_preds} ({clean_preds/len(pred_035)*100:.1f}%)")
print(f"Predicted Damaged: {damaged_preds} ({damaged_preds/len(pred_035)*100:.1f}%)")

print("\n" + "="*80)
