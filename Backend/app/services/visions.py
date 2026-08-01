import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
from langchain.tools import tool

# Set absolute path relative to this exact file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "celestic_v2_model.keras")

# Load model globally so it only boots up once when the server starts
try:
    print(f"Loading Vision Model from: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH)
except Exception as e:
    print(f"CRITICAL: Error loading model: {e}")
    model = None

CLASS_NAMES = [
    "CanisMajor",
    "Cassiopeia",
    "Crux",
    "Leo",
    "Orion",
    "Scorpius",
    "UrsaMajor",
    "UrsaMinor",
]

@tool
def predict_constellation(image_path: str) -> dict:
    """
    Analyzes an image and returns confidence scores for ALL constellations.
    """
    if model is None:
        return {"error": "Vision Model not loaded."}

    try:
        if not os.path.exists(image_path):
            return {"error": f"File not found at {image_path}"}

        # Preprocessing
        img = image.load_img(image_path, target_size=(256, 256))
        img_array = image.img_to_array(img)
        img_batch = np.expand_dims(img_array, axis=0)

        # Predict
        predictions = model.predict(img_batch)
        scores = predictions[0]

        # Return Dictionary of scores
        results = {}
        for i, name in enumerate(CLASS_NAMES):
            results[name] = float(scores[i] * 100)

        return results

    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}