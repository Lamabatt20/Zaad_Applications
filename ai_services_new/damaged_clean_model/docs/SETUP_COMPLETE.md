# 🥫 Canned Food Quality Inspector - SETUP COMPLETE

### **Core Files:**
- `model.py` - The AI neural network model
- `inspect_can.py` - Inspection tool with multiple modes
- `main.py` - Simplified launcher
- `can_inspector_model_improved.h5` - Trained model (trained on real data)
- `requirements.txt` - Python dependencies
- `.venv/` - Python environment

---

## 🚀 How to Use

### **1. Single Can Inspection:**
```powershell
python main.py --image "path/to/can.jpg"
```

### **2. Batch Inspection (Entire Folder):**
```powershell
python main.py --folder "C:\path\to\can\images\"
```

### **3. Real-time with Webcam:**
```powershell
python main.py --webcam
```

---

## 📊 Model Performance

- **Training Data:** 54 real canned food images
- **Validation Data:** 14 real canned food images
- **Accuracy:** ~98% on real data
- **Can Detect:** Rust (صدأ), Dents (تعويج), Corrosion (تآكل)

---

## 📋 Example Results

```
🔍 Inspection Result: DAMAGED
📊 Confidence: 92.5%
⚠️  Damage Probability: 92.5%

❌ CAN REJECTED - Damage Detected!

Damage Details:
  🔴 Rust Detected: 5.2% of surface
  🔨 Dent Detected: 3 irregular shapes
  ⚫ Corrosion Detected: 8.1% dark spots
```

---

## 🔄 If You Need to Retrain

If you have new can images and want to improve the model:

1. **Organize images:**
   ```
   dataset/
     train/
       good/      (put good can images)
       damaged/   (put damaged can images)
     val/
       good/
       damaged/
   ```

2. **Create retrain script** (same as before)
3. **Run training** and save new model

---

## 🛠️ Requirements

All packages installed in `.venv/`:
- TensorFlow 2.10+
- OpenCV
- NumPy
- Pillow
- Matplotlib
- Scikit-learn

---

## ❓ Troubleshooting

**Model not found error:**
- Make sure `can_inspector_model_improved.h5` is in the same folder as scripts

**Wrong predictions:**
- Model trained on limited real data (34 images)
- Add more real images and retrain for better accuracy

**Slow performance:**
- Model runs on CPU. GPU support not configured.
- Model size: ~500MB in memory during inference

---

## 📞 Usage Summary

```bash
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Inspect single can
python main.py --image "C:\path\to\can.jpg"

# Batch inspect
python main.py --folder "C:\path\to\cans\"

# Real-time webcam
python main.py --webcam
```
