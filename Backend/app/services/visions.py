import os
import numpy as np
import tflite_runtime.interpreter as tflite
from PIL import Image
from langchain.tools import tool

# Set absolute path relative to this exact file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "celestic_v2_model.tflite")

# Load model globally so it only boots up once when the server starts
load_error = None
try:
    print(f"Loading Vision Model from: {MODEL_PATH}")
    interpreter = tflite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
except Exception as e:
    print(f"CRITICAL: Error loading model: {e}")
    load_error = str(e)
    interpreter = None

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
    if interpreter is None:
        return {"error": f"Vision Model failed to load: {load_error}"}

    try:
        if not os.path.exists(image_path):
            return {"error": f"File not found at {image_path}"}

        # Preprocessing without Keras
        img = Image.open(image_path).convert('RGB').resize((256, 256))
        img_array = np.array(img, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)

        # Predict using TFLite
        interpreter.set_tensor(input_details[0]['index'], img_batch)
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]['index'])
        scores = predictions[0]

        # Return Dictionary of scores
        results = {}
        for i, name in enumerate(CLASS_NAMES):
            results[name] = float(scores[i] * 100)

        return results

    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}