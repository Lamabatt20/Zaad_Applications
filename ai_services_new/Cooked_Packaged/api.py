"""
Cooked vs Packaged Food Detection API Server
Runs on port 8004 - connects to backend server.js
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
import numpy as np
import cv2
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Initialize model
print("🍽️ Loading Cooked vs Packaged Detection Model...")
model_path = Path(__file__).parent / "best_cooked_detection_model.h5"

if not model_path.exists():
    model_path = Path(__file__).parent / "cooked_detection_model.h5"

if model_path.exists():
    model = keras.models.load_model(str(model_path))
    print(f"✅ Model loaded from: {model_path}")
else:
    print("⚠️ No model found! Please train the model first.")
    model = None

IMG_SIZE = (224, 224)
# Lower threshold to bias toward "packaged" for metal cans that were being misread as cooked
PACKAGED_THRESHOLD = 0.35

def preprocess_image(image_path):
    """Preprocess image for model input"""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, IMG_SIZE)
    img = img.astype('float32') / 255.0
    return img

@app.route('/predict-cooked', methods=['POST'])
def predict_cooked():
    """
    Predict if food is cooked or packaged
    Expected: multipart/form-data with 'file' field
    """
    try:
        if model is None:
            return jsonify({
                'error': 'Model not loaded'
            }), 500

        if 'file' not in request.files:
            return jsonify({
                'error': 'No file provided'
            }), 400

        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'error': 'Empty filename'
            }), 400

        # Save temporarily
        temp_path = f"temp_{file.filename}"
        file.save(temp_path)

        # Preprocess and predict
        img = preprocess_image(temp_path)
        img_batch = np.expand_dims(img, axis=0)
        
        prediction = model.predict(img_batch, verbose=0)[0][0]
        
        # Clean up
        os.remove(temp_path)

        # Interpret results
        # Model output: 0 = cooked, 1 = packaged
        is_packaged = prediction >= PACKAGED_THRESHOLD
        status = 'packaged' if is_packaged else 'cooked'
        confidence = prediction if is_packaged else (1 - prediction)

        response = {
            'status': status,
            'confidence': float(confidence),
            'raw_prediction': float(prediction)
        }

        return jsonify(response)

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Cooked vs Packaged Detection',
        'model_loaded': model is not None
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🍽️ COOKED vs PACKAGED FOOD DETECTION API SERVER")
    print("="*60)
    print("📡 Running on: http://localhost:8004")
    print("🔗 Endpoint: POST /predict-cooked")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8004, debug=False)
