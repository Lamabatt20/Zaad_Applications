"""
Calculate Accuracy and Precision metrics for Cooked vs Packaged Model
"""

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import warnings
warnings.filterwarnings('ignore')

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing import image_dataset_from_directory
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt

# Configuration
DATASET_PATH = r"C:\Users\Loor Ibrahim\Desktop\Zaad\Zaad_Applications\ai-services\cooked_detection\dataset"
MODEL_PATH = "best_cooked_detection_model.h5"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16

print("=" * 80)
print("🔍 COOKED VS PACKAGED MODEL - ACCURACY & PRECISION CALCULATION")
print("=" * 80)

# Load validation dataset
print("\n📊 Loading validation dataset...")
try:
    val_ds = image_dataset_from_directory(
        DATASET_PATH,
        seed=123,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset="validation",
        label_mode="binary"
    )
    print("✅ Validation dataset loaded!")
except Exception as e:
    print(f"❌ Error loading dataset: {e}")
    exit(1)

# Normalize validation data
normalization_layer = keras.layers.Rescaling(1./255)
val_ds = val_ds.map(
    lambda x, y: (normalization_layer(x), y),
    num_parallel_calls=tf.data.AUTOTUNE
)
val_ds = val_ds.prefetch(tf.data.AUTOTUNE)

# Load model
print("\n🤖 Loading model...")
try:
    model = keras.models.load_model(MODEL_PATH)
    print(f"✅ Model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit(1)

# Get all true labels and predictions
print("\n🔄 Evaluating on validation set...")
all_true_labels = []
all_predictions = []
all_raw_scores = []

for images, labels in val_ds:
    # Get predictions
    predictions = model.predict(images, verbose=0)
    
    # Store results
    all_true_labels.extend(labels.numpy().astype(int))
    all_raw_scores.extend(predictions.flatten())
    
    # Convert to binary (0 or 1) using threshold 0.5 (standard)
    binary_preds = (predictions.flatten() >= 0.5).astype(int)
    all_predictions.extend(binary_preds)

all_true_labels = np.array(all_true_labels)
all_predictions = np.array(all_predictions)
all_raw_scores = np.array(all_raw_scores)

print("✅ Evaluation complete!")

# Calculate metrics with threshold 0.5
print("\n" + "=" * 80)
print("📈 METRICS WITH STANDARD THRESHOLD (0.5)")
print("=" * 80)

accuracy_05 = accuracy_score(all_true_labels, all_predictions)
precision_05 = precision_score(all_true_labels, all_predictions, zero_division=0)
recall_05 = recall_score(all_true_labels, all_predictions, zero_division=0)
f1_05 = f1_score(all_true_labels, all_predictions, zero_division=0)

print(f"\n📊 Classification Metrics (Threshold = 0.5):")
print(f"   • Accuracy:  {accuracy_05:.4f} ({accuracy_05*100:.2f}%)")
print(f"   • Precision: {precision_05:.4f} ({precision_05*100:.2f}%)")
print(f"   • Recall:    {recall_05:.4f} ({recall_05*100:.2f}%)")
print(f"   • F1-Score:  {f1_05:.4f}")

# Confusion Matrix for 0.5 threshold
cm_05 = confusion_matrix(all_true_labels, all_predictions)
print(f"\n🔄 Confusion Matrix (Threshold = 0.5):")
print(f"   True Negatives:  {cm_05[0,0]:3d} | False Positives: {cm_05[0,1]:3d}")
print(f"   False Negatives: {cm_05[1,0]:3d} | True Positives:  {cm_05[1,1]:3d}")

# Calculate metrics with optimized threshold (0.30 - from API)
print("\n" + "=" * 80)
print("📈 METRICS WITH OPTIMIZED THRESHOLD (0.30 - Used in API)")
print("=" * 80)

predictions_030 = (all_raw_scores >= 0.30).astype(int)
accuracy_030 = accuracy_score(all_true_labels, predictions_030)
precision_030 = precision_score(all_true_labels, predictions_030, zero_division=0)
recall_030 = recall_score(all_true_labels, predictions_030, zero_division=0)
f1_030 = f1_score(all_true_labels, predictions_030, zero_division=0)

print(f"\n📊 Classification Metrics (Threshold = 0.30):")
print(f"   • Accuracy:  {accuracy_030:.4f} ({accuracy_030*100:.2f}%)")
print(f"   • Precision: {precision_030:.4f} ({precision_030*100:.2f}%)")
print(f"   • Recall:    {recall_030:.4f} ({recall_030*100:.2f}%)")
print(f"   • F1-Score:  {f1_030:.4f}")

# Confusion Matrix for 0.30 threshold
cm_030 = confusion_matrix(all_true_labels, predictions_030)
print(f"\n🔄 Confusion Matrix (Threshold = 0.30):")
print(f"   True Negatives:  {cm_030[0,0]:3d} | False Positives: {cm_030[0,1]:3d}")
print(f"   False Negatives: {cm_030[1,0]:3d} | True Positives:  {cm_030[1,1]:3d}")

# Classification Report
print("\n" + "=" * 80)
print("📋 DETAILED CLASSIFICATION REPORT (Threshold = 0.30)")
print("=" * 80)
print(classification_report(all_true_labels, predictions_030, 
                          target_names=["Cooked (0)", "Packaged (1)"],
                          digits=4))

# Statistics
print("\n" + "=" * 80)
print("📊 PREDICTION SCORE STATISTICS")
print("=" * 80)

print(f"\nScore Distribution:")
print(f"   • Min Score:     {all_raw_scores.min():.4f}")
print(f"   • Max Score:     {all_raw_scores.max():.4f}")
print(f"   • Mean Score:    {all_raw_scores.mean():.4f}")
print(f"   • Std Dev:       {all_raw_scores.std():.4f}")
print(f"   • Median Score:  {np.median(all_raw_scores):.4f}")

# Count predictions
cooked_preds_030 = np.sum(predictions_030 == 0)
packaged_preds_030 = np.sum(predictions_030 == 1)

print(f"\nPrediction Distribution (Threshold = 0.30):")
print(f"   • Predicted Cooked:    {cooked_preds_030:3d} ({cooked_preds_030/len(predictions_030)*100:.1f}%)")
print(f"   • Predicted Packaged:  {packaged_preds_030:3d} ({packaged_preds_030/len(predictions_030)*100:.1f}%)")

# True labels distribution
cooked_true = np.sum(all_true_labels == 0)
packaged_true = np.sum(all_true_labels == 1)

print(f"\nActual Distribution:")
print(f"   • Actually Cooked:    {cooked_true:3d} ({cooked_true/len(all_true_labels)*100:.1f}%)")
print(f"   • Actually Packaged:  {packaged_true:3d} ({packaged_true/len(all_true_labels)*100:.1f}%)")

# Sensitivity and Specificity
tn, fp, fn, tp = cm_030.ravel()
sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

print(f"\n" + "=" * 80)
print("🎯 ADDITIONAL METRICS (Threshold = 0.30)")
print("=" * 80)
print(f"   • Sensitivity (TPR): {sensitivity:.4f} ({sensitivity*100:.2f}%)")
print(f"   • Specificity (TNR): {specificity:.4f} ({specificity*100:.2f}%)")
print(f"   • False Positive Rate: {1-specificity:.4f} ({(1-specificity)*100:.2f}%)")
print(f"   • False Negative Rate: {1-sensitivity:.4f} ({(1-sensitivity)*100:.2f}%)")

# Summary
print("\n" + "=" * 80)
print("✅ SUMMARY")
print("=" * 80)
print(f"\nDataset: {len(all_true_labels)} validation images")
print(f"Model: best_cooked_detection_model.h5")
print(f"\n🎯 FINAL RESULTS (Using Optimized Threshold = 0.30):")
print(f"   ✨ Accuracy:  {accuracy_030*100:.2f}%")
print(f"   ✨ Precision: {precision_030*100:.2f}%")
print(f"   ✨ Recall:    {recall_030*100:.2f}%")
print(f"   ✨ F1-Score:  {f1_030:.4f}")

print("\n" + "=" * 80)

# Save results to file
results_text = f"""
COOKED VS PACKAGED MODEL - METRICS REPORT
Generated: {pd.Timestamp.now()}

VALIDATION SET: {len(all_true_labels)} images

THRESHOLD 0.30 (Used in API):
- Accuracy:  {accuracy_030*100:.2f}%
- Precision: {precision_030*100:.2f}%
- Recall:    {recall_030*100:.2f}%
- F1-Score:  {f1_030:.4f}

THRESHOLD 0.50 (Standard):
- Accuracy:  {accuracy_05*100:.2f}%
- Precision: {precision_05*100:.2f}%
- Recall:    {recall_05*100:.2f}%
- F1-Score:  {f1_05:.4f}

CONFUSION MATRIX (0.30):
True Negatives:  {cm_030[0,0]}
False Positives: {cm_030[0,1]}
False Negatives: {cm_030[1,0]}
True Positives:  {cm_030[1,1]}
"""

try:
    import pandas as pd
except:
    pass

print("✅ Metrics calculation complete!")
