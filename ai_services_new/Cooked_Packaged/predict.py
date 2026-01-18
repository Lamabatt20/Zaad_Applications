"""
Prediction script for Cooked/Not-Cooked Food Detection
"""
import sys
from model import CookedDetectionModel
from pathlib import Path

def predict_single_image(model_path, image_path):
    """Predict on a single image"""
    detector = CookedDetectionModel()
    detector.load_trained_model(model_path)
    
    result = detector.predict(image_path)
    
    print(f"\nPrediction Results:")
    print(f"Image: {image_path}")
    print(f"Label: {result['label']}")
    print(f"Confidence: {result['confidence']:.2%}")
    print(f"Raw Score: {result['raw_score']:.4f}")
    
    return result

def predict_batch(model_path, image_dir):
    """Predict on all images in a directory"""
    detector = CookedDetectionModel()
    detector.load_trained_model(model_path)
    
    image_dir = Path(image_dir)
    results = []
    
    for image_file in image_dir.glob("*.jpg"):
        result = detector.predict(str(image_file))
        result["image"] = image_file.name
        results.append(result)
        print(f"{image_file.name}: {result['label']} ({result['confidence']:.2%})")
    
    return results

if __name__ == "__main__":
    model_path = "cooked_detection_model.h5"
    
    if len(sys.argv) > 1:
        # Predict on single image
        image_path = sys.argv[1]
        predict_single_image(model_path, image_path)
    else:
        print("Usage: python predict.py <image_path>")
        print("Example: python predict.py path/to/image.jpg")
