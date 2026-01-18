from fastapi import FastAPI, UploadFile, File
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
import io

IMG_SIZE = 224

app = FastAPI()
model = load_model("damage_model.h5")

def preprocess(img: Image.Image):
    img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr

@app.post("/predict-damage")
async def predict_damage(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read()))
    score = float(model.predict(preprocess(img))[0][0])

    # ✅ decision logic
    if score >= 0.65:
        status = "damaged"
        confidence = score
   
    else:
        status = "clean"
        confidence = 1 - score

    return {
        "status": status,
        "score": score,
        "confidence": confidence
    }