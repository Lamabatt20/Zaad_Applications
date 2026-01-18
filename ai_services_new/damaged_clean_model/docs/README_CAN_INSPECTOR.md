# 🥫 Canned Food Quality Inspector - AI Model

An AI-powered system to automatically detect damaged canned food by identifying **rust** (صدأ), **dents** (تعويج), and **corrosion** (تآكل).

## 🎯 Features

- **Deep Learning Model**: Uses CNN with transfer learning (MobileNetV2)
- **Multiple Damage Types**: Detects rust, dents, and corrosion
- **High Accuracy**: Binary classification with confidence scores
- **Damage Analysis**: Provides detailed damage type breakdown
- **Real-time Inspection**: Supports webcam integration
- **Batch Processing**: Inspect multiple cans at once

## 📋 Requirements

Install dependencies:

```bash
pip install -r requirements.txt
```

Required packages:
- TensorFlow 2.10+
- OpenCV
- NumPy
- Pillow
- Matplotlib

## 🚀 Quick Start

### 1. Prepare Your Dataset

Organize your images in this structure:

```
dataset/
  train/
    good/          # Images of good cans
      can001.jpg
      can002.jpg
      ...
    damaged/       # Images of damaged cans (rust, dents, corrosion)
      damaged001.jpg
      damaged002.jpg
      ...
  val/
    good/
      val001.jpg
      ...
    damaged/
      val001.jpg
      ...
```

### 2. Train the Model

```python
from model import CannedFoodInspector

# Initialize
inspector = CannedFoodInspector(img_size=(224, 224))

# Build model (transfer learning - recommended)
inspector.build_model()

# Train
history = inspector.train(
    train_dir='dataset/train',
    val_dir='dataset/val',
    epochs=50,
    batch_size=32
)

# Save model
inspector.save_model('can_inspector_model.h5')
```

### 3. Inspect Cans

#### Single Image Inspection

```bash
python inspect_can.py --image path/to/can.jpg
```

Or in Python:

```python
from model import CannedFoodInspector

inspector = CannedFoodInspector()
inspector.load_model('can_inspector_model.h5')

result = inspector.predict('can_image.jpg')
print(f"Result: {result['result']}")  # 'good' or 'damaged'
print(f"Confidence: {result['confidence']:.2%}")
print(f"Details: {result['details']}")
```

#### Batch Inspection

```bash
python inspect_can.py --folder path/to/images/
```

#### Real-time Webcam Inspection

```bash
python inspect_can.py --webcam
```

## 🔍 How It Works

### 1. **Deep Learning Classification**
- Uses MobileNetV2 pre-trained on ImageNet
- Fine-tuned for canned food damage detection
- Binary classification: good vs damaged

### 2. **Damage Type Analysis**
After detecting damage, the system analyzes:

- **Rust Detection**: 
  - Analyzes HSV color space
  - Identifies brownish/reddish discoloration
  - Calculates rust percentage

- **Dent Detection**:
  - Uses edge detection (Canny)
  - Analyzes contour irregularities
  - Counts deformations

- **Corrosion Detection**:
  - Identifies dark spots
  - Analyzes surface discoloration
  - Measures affected area

## 📊 Model Architecture

### Transfer Learning (Default)
```
MobileNetV2 (pre-trained) → GlobalAveragePooling → Dense Layers → Sigmoid
```

### Custom CNN (Alternative)
```
4 Conv Blocks → Flatten → Dense Layers → Sigmoid
- 32, 64, 128, 256 filters
- Batch normalization
- Dropout regularization
```

## 🎛️ Usage Examples

### Example 1: Production Line Integration

```python
from model import CannedFoodInspector
import os

inspector = CannedFoodInspector()
inspector.load_model('can_inspector_model.h5')

# Inspect each can
for can_image in os.listdir('production_line/'):
    result = inspector.predict(f'production_line/{can_image}')
    
    if result['result'] == 'damaged':
        print(f"❌ REJECT: {can_image}")
        # Move to reject bin
    else:
        print(f"✅ ACCEPT: {can_image}")
        # Continue processing
```

### Example 2: Quality Report

```python
results = []
for image in can_images:
    result = inspector.predict(image)
    results.append(result)

# Generate report
damaged = [r for r in results if r['result'] == 'damaged']
print(f"Rejection rate: {len(damaged)/len(results)*100:.1f}%")
```

## 🎨 Customization

### Adjust Detection Threshold

```python
# More strict (fewer false positives)
result = inspector.predict('can.jpg', threshold=0.7)

# More lenient (fewer false negatives)
result = inspector.predict('can.jpg', threshold=0.3)
```

### Use Custom CNN Instead of Transfer Learning

```python
inspector = CannedFoodInspector()
inspector.build_custom_cnn()  # Instead of build_model()
```

### Change Image Size

```python
inspector = CannedFoodInspector(img_size=(320, 320))
```

## 📈 Training Tips

1. **Balanced Dataset**: Equal number of good and damaged samples
2. **Variety**: Include different types of damage (rust, dents, corrosion)
3. **Data Augmentation**: Already built-in (rotation, flip, zoom)
4. **More Data**: Aim for at least 500-1000 images per class
5. **Validation Split**: Use 20% of data for validation

## 🔧 Troubleshooting

### Low Accuracy?
- Add more training data
- Increase training epochs
- Adjust learning rate
- Try custom CNN instead of transfer learning

### False Positives?
- Increase prediction threshold
- Add more "good" can examples
- Improve image quality

### False Negatives?
- Decrease prediction threshold
- Add more damaged can examples with subtle damage

## 📝 Output Format

```python
{
    'result': 'damaged',  # or 'good'
    'confidence': 0.85,   # 85% confidence
    'damage_probability': 0.85,
    'details': {
        'rust_detected': True,
        'rust_percentage': 5.2,
        'dent_detected': True,
        'irregular_shapes_count': 8,
        'corrosion_detected': False
    }
}
```

## 🌟 Advanced Features

- Early stopping to prevent overfitting
- Learning rate reduction on plateau
- Model checkpointing (saves best model)
- Real-time visualization
- Batch processing support

## 📄 License

This is an educational project for canned food quality inspection.

## 🤝 Contributing

To improve the model:
1. Add more training data
2. Experiment with different architectures
3. Fine-tune hyperparameters
4. Add new damage type detection

---

**Made with ❤️ for automated quality control**
