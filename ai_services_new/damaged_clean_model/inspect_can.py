import sys
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow logs
import warnings
warnings.filterwarnings('ignore')  # Suppress all warnings
import logging
logging.getLogger('absl').setLevel(logging.ERROR)  # Suppress ABSL warnings

from model import CannedFoodInspector
import cv2
import matplotlib.pyplot as plt


def inspect_single_can(image_path, model_path='can_inspector_model.h5', threshold=0.35, focus_can=False):
    """
    Inspect a single can image
    """
    print(f"\n{'='*60}")
    print(f"Inspecting: {image_path}")
    print(f"{'='*60}\n")
    
    # Initialize inspector
    inspector = CannedFoodInspector()
    
    try:
        # Load trained model
        inspector.load_model(model_path)
        
        # Predict
        result = inspector.predict(image_path, threshold=threshold, focus_can=focus_can)
        
        # Display results
        print(f"🔍 Inspection Result: {result['result'].upper()}")
        print(f"📊 Confidence: {result['confidence']:.2%}")
        print(f"⚠️  Damage Probability: {result['damage_probability']:.2%}")
        
        if result['result'] == 'damaged':
            print(f"\n❌ CAN REJECTED - Damage Detected!")
            print(f"\nDamage Details:")
            details = result['details']
            
            if details.get('rust_detected'):
                print(f"  🔴 Rust Detected: {details.get('rust_percentage', 0):.1f}% of surface")
            
            if details.get('dent_detected'):
                print(f"  🔨 Dent Detected: {details.get('irregular_shapes_count', 0)} irregular shapes")
            
            if details.get('corrosion_detected'):
                print(f"  ⚫ Corrosion Detected: {details.get('dark_spots_percentage', 0):.1f}% dark spots")
        else:
            print(f"\n✅ CAN APPROVED - No Damage Detected")
        
        # Show image
        img = cv2.imread(image_path)
        if img is not None:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            plt.figure(figsize=(8, 6))
            plt.imshow(img_rgb)
            plt.title(f"Result: {result['result'].upper()} (Confidence: {result['confidence']:.1%})", 
                     fontsize=14, fontweight='bold',
                     color='red' if result['result'] == 'damaged' else 'green')
            plt.axis('off')
            plt.tight_layout()
            plt.show()
        
        return result
        
    except FileNotFoundError:
        print(f"❌ Error: Model file '{model_path}' not found!")
        print(f"\nPlease train the model first:")
        print(f"  1. Prepare your dataset (good cans / damaged cans)")
        print(f"  2. Run the training script")
        print(f"  3. Save the model")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None


def inspect_batch(image_folder, model_path='can_inspector_model.h5', threshold=0.35, focus_can=False):
    """
    Inspect multiple cans in a folder
    """
    import os
    from pathlib import Path
    
    inspector = CannedFoodInspector()
    inspector.load_model(model_path)
    
    # Get all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(Path(image_folder).glob(f'*{ext}'))
        image_files.extend(Path(image_folder).glob(f'*{ext.upper()}'))
    
    if not image_files:
        print(f"No images found in {image_folder}")
        return
    
    print(f"\n{'='*60}")
    print(f"Batch Inspection: {len(image_files)} images")
    print(f"{'='*60}\n")
    
    results = []
    good_count = 0
    damaged_count = 0
    
    for img_path in image_files:
        result = inspector.predict(str(img_path), threshold=threshold, focus_can=focus_can)
        results.append({
            'file': img_path.name,
            'result': result['result'],
            'confidence': result['confidence']
        })
        
        if result['result'] == 'good':
            good_count += 1
            status = "✅"
        else:
            damaged_count += 1
            status = "❌"
        
        print(f"{status} {img_path.name}: {result['result'].upper()} ({result['confidence']:.1%})")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total inspected: {len(image_files)}")
    print(f"  ✅ Good cans: {good_count} ({good_count/len(image_files)*100:.1f}%)")
    print(f"  ❌ Damaged cans: {damaged_count} ({damaged_count/len(image_files)*100:.1f}%)")
    print(f"{'='*60}\n")
    
    return results


def webcam_realtime_inspection(model_path='can_inspector_model.h5', threshold=0.5, focus_can=False):
    """
    Real-time inspection using webcam
    Press 'q' to quit, 's' to save snapshot
    """
    inspector = CannedFoodInspector()
    inspector.load_model(model_path)
    
    cap = cv2.VideoCapture(0)
    
    print("\n🎥 Real-time Can Inspection Started")
    print("Controls:")
    print("  - Press 'q' to quit")
    print("  - Press 's' to inspect current frame")
    print("  - Press 'c' to capture and save")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Display frame
        display_frame = frame.copy()
        cv2.putText(display_frame, "Press 's' to inspect", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow('Can Inspector', display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Inspect current frame
            result = inspector.predict(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), threshold=threshold, focus_can=focus_can)
            
            # Show result on frame
            result_frame = frame.copy()
            color = (0, 0, 255) if result['result'] == 'damaged' else (0, 255, 0)
            text = f"{result['result'].upper()} ({result['confidence']:.1%})"
            
            cv2.putText(result_frame, text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.imshow('Inspection Result', result_frame)
            
            print(f"\n{result['result'].upper()} - Confidence: {result['confidence']:.2%}")
            
        elif key == ord('c'):
            # Save snapshot
            filename = f"can_snapshot_{cv2.getTickCount()}.jpg"
            cv2.imwrite(filename, frame)
            print(f"Snapshot saved: {filename}")
    
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Inspect canned food for damage')
    parser.add_argument('--image', type=str, help='Path to single image')
    parser.add_argument('--folder', type=str, help='Path to folder with images')
    parser.add_argument('--webcam', action='store_true', help='Use webcam for real-time inspection')
    parser.add_argument('--model', type=str, default='can_inspector_model.h5', help='Path to model file')
    
    args = parser.parse_args()
    
    if args.image:
        inspect_single_can(args.image, args.model)
    elif args.folder:
        inspect_batch(args.folder, args.model)
    elif args.webcam:
        webcam_realtime_inspection(args.model)
    else:
        print("Please specify --image, --folder, or --webcam")
        print("\nExamples:")
        print("  python inspect_can.py --image path/to/can.jpg")
        print("  python inspect_can.py --folder path/to/images/")
        print("  python inspect_can.py --webcam")