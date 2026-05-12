from sklearn.linear_model import LinearRegression
import numpy as np
import joblib

# Örnek veri: input = boy, bacak uzunluğu, gövde uzunluğu
# output = ideal kalça ve diz açıları

X = np.array([
    [180, 90, 65],
    [170, 85, 60],
    [175, 88, 62],
    [160, 78, 55]
])
y = np.array([
    [110, 145],  # [hip_angle, knee_angle]
    [108, 140],
    [112, 148],
    [105, 138]
])

model = LinearRegression()
model.fit(X, y)
joblib.dump(model, 'fit_model.pkl')
