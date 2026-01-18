# Cooked vs Not-Cooked Food Detection Model

This project uses **TensorFlow/Keras** and a pre-trained **ResNet50** model to classify food images as either **COOKED** or **NOT COOKED**.

## Project Overview

- **Dataset**: 274 labeled food images (cooked/notcooked folders)
- **Architecture**: Pre-trained ResNet50 + custom dense layers
- **Framework**: TensorFlow/Keras
- **Input Size**: 224x224 RGB images
- **Output**: Binary classification (Cooked=1, Not-Cooked=0)

## Features

✅ Transfer learning with ResNet50  
✅ Data augmentation (rotation, flip, zoom, brightness)  
✅ Early stopping to prevent overfitting  
✅ Model checkpointing (saves best weights)  
✅ Comprehensive metrics (Accuracy, Precision, Recall)  
✅ Training history visualization  
✅ Batch prediction capability  

## Installation

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Dataset structure** (should already exist):
```
dataset/
├── cooked/
│   ├── 102854.jpg
│   ├── 104294.jpg
│   └── ...
└── notcooked/
    ├── image1.jpg
    ├── image2.jpg
    └── ...
```

## Training

Run the training script:
```bash
python model.py
```

**Output files**:
- `cooked_detection_model.h5` - Final trained model
- `best_cooked_detection_model.h5` - Best model weights (from validation)
- `training_history_cooked.png` - Training/validation graphs

**Training parameters**:
- **Batch size**: 32
- **Epochs**: 15 (with early stopping)
- **Learning rate**: 1e-4 (Adam optimizer)
- **Validation split**: 20%

## Prediction

### Single Image Prediction:
```bash
python predict.py path/to/image.jpg
```

### Using Python:
```python
from model import CookedDetectionModel

detector = CookedDetectionModel()
detector.load_trained_model("cooked_detection_model.h5")

result = detector.predict("image.jpg")
print(result)
# Output: {'label': 'COOKED', 'confidence': 0.95, 'raw_score': 0.95}
```

## Model Architecture

```
Pre-trained ResNet50
    ↓
GlobalAveragePooling2D
    ↓
Dense(256, relu) + Dropout(0.5)
    ↓
Dense(128, relu) + Dropout(0.3)
    ↓
Dense(1, sigmoid) → Binary Output
```

## Data Augmentation

Applied during training to increase robustness:
- Random horizontal flips
- Random rotations (±10°)
- Random zoom (±10%)
- Random brightness adjustment (±10%)

## Performance Metrics

The model tracks:
- **Accuracy**: Overall correctness
- **Precision**: True positives / All predicted positives
- **Recall**: True positives / All actual positives
- **Loss**: Binary crossentropy

## Configuration

Edit these in `model.py`:
- `IMAGE_SIZE`: Input image dimensions (default: 224x224)
- `BATCH_SIZE`: Images per batch (default: 32)
- `EPOCHS`: Training epochs (default: 15)
- `VALIDATION_SPLIT`: Train/val split ratio (default: 0.2)

## For Graduation Project

**What to submit**:
1. Trained model (`cooked_detection_model.h5`)
2. This `model.py` script
3. Training history plot
4. Test results on new images
5. This README with explanation

**Tips for success**:
- Document your methodology
- Show before/after transfer learning
- Test on images outside your dataset
- Include confusion matrix
- Explain why ResNet50 works well

## Requirements

- Python 3.7+
- TensorFlow 2.13+
- NumPy, Matplotlib, Pillow
- 2GB+ RAM recommended
- GPU optional (CPU training works)

## Troubleshooting

**Out of memory?**
- Reduce `BATCH_SIZE` to 16 or 8
- Reduce image size to 180x180

**Model not improving?**
- Increase `EPOCHS`
- Adjust learning rate
- Check dataset quality (remove corrupted images)

**Low accuracy?**
- More training epochs
- Better data augmentation
- Check dataset consistency

## Author
AI Model for Graduation Project - Cooked/Not-Cooked Detection
