"""
Can Damage Detection API Server
Runs on port 8005 - connects to backend server.js
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from model import CannedFoodInspector
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Initialize model
print("🥫 Loading Can Damage Detection Model...")
inspector = CannedFoodInspector()
model_path = Path(__file__).parent / "models" / "best_can_inspector_model.h5"

if not model_path.exists():
    # Try alternative model
    model_path = Path(__file__).parent / "models" / "can_inspector_zaad_model.h5"

if model_path.exists():
    inspector.load_model(str(model_path))
    print(f"✅ Model loaded from: {model_path}")
else:
    print("⚠️ No model found! Please train the model first.")
    inspector.build_model()

@app.route('/predict-can-damage', methods=['POST'])
def predict_can_damage():
    """
    Predict if a canned food is damaged
    Expected: multipart/form-data with 'file' field
    """
    try:
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

        # Predict with focus_can=True to reduce background interference
        result = inspector.predict(
            temp_path, 
            threshold=0.35,  # Lower threshold = more sensitive to damage
            focus_can=True
        )

        # Clean up
        os.remove(temp_path)

        # Map to backend expected format
        response = {
            'status': result['result'],  # 'good' or 'damaged'
            'confidence': result['confidence'],
            'details': result.get('details', {})
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
        'service': 'Can Damage Detection',
        'model_loaded': inspector.model is not None
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🥫 CAN DAMAGE DETECTION API SERVER")
    print("="*60)
    print("📡 Running on: http://localhost:8005")
    print("🔗 Endpoint: POST /predict-can-damage")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8005, debug=False)