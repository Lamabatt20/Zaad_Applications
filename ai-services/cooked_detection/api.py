from fastapi import FastAPI, UploadFile, File
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
import io

IMG_SIZE = 224

app = FastAPI()
model = load_model("packaged_vs_cooked.h5")

def preprocess(img: Image.Image):
    img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr

@app.post("/predict-packaged-cooked")
async def predict(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read()))
    score = float(model.predict(preprocess(img))[0][0])

    # assuming: packaged = 1, cooked = 0
    if score >= 0.7:
        status = "packaged"
        confidence = score
    else:
        status = "cooked"
        confidence = 1 - score

    return {
        "status": status,
        "score": score,
        "confidence": confidence
    }
