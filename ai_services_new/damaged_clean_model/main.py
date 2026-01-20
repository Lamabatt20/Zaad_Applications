"""
Final Production-Ready Can Inspector Setup
Simplified and cleaned for production use
"""

import argparse
from model import CannedFoodInspector


def main():
    """
    Main function to inspect cans
    """
    print("\n" + "="*60)
    print("🥫 CANNED FOOD QUALITY INSPECTOR")
    print("="*60 + "\n")
    
    from inspect_can import inspect_single_can, inspect_batch, webcam_realtime_inspection

    parser = argparse.ArgumentParser(description="Canned food quality inspector")
    parser.add_argument('--image', type=str, help='Path to single image to inspect')
    parser.add_argument('--folder', type=str, help='Path to folder of images to batch inspect')
    parser.add_argument('--webcam', action='store_true', help='Use webcam for real-time inspection')
    parser.add_argument('--model', type=str, default='can_inspector_model_improved.h5', help='Path to model file (.h5 or .keras)')
    parser.add_argument('--threshold', type=float, default=0.5, help='Decision threshold (default 0.5). Lower = more damaged, higher = more good.')
    parser.add_argument('--focus-can', action='store_true', help='Focus analysis on detected can region to reduce background false positives')

    args = parser.parse_args()

    if args.image:
        inspect_single_can(args.image, args.model, threshold=args.threshold, focus_can=args.focus_can)
    elif args.folder:
        inspect_batch(args.folder, args.model, threshold=args.threshold, focus_can=args.focus_can)
    elif args.webcam:
        webcam_realtime_inspection(args.model, threshold=args.threshold, focus_can=args.focus_can)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()