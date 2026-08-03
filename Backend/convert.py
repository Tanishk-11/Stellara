import tensorflow as tf

# Load the model
model = tf.keras.models.load_model("c:/Users/BIT/OneDrive/Orion world/OrionWorld/Stellara_Project/Stellara/Backend/app/services/celestic_v2_model.keras")

# Convert the model
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Save the model
with open("c:/Users/BIT/OneDrive/Orion world/OrionWorld/Stellara_Project/Stellara/Backend/app/services/celestic_v2_model.tflite", "wb") as f:
    f.write(tflite_model)

print("Successfully converted to TFLite!")
