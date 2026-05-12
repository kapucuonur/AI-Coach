from sklearn.linear_model import LinearRegression
import numpy as np
import joblib
import os

X = np.array([
    [180, 90, 65],
    [170, 85, 60],
    [175, 88, 62],
    [160, 78, 55]
])
y = np.array([
    [110, 145],
    [108, 140],
    [112, 148],
    [105, 138]
])

model = LinearRegression()
model.fit(X, y)

# Model dosyasını model klasörüne kaydet
model_path = os.path.join(os.path.dirname(__file__), "fit_model.pkl")
joblib.dump(model, model_path)
print(f"Model trained and saved at {model_path}")
