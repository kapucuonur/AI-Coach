import numpy as np

def calculate_angle(a, b, c):
    """
    a, b, c: 3 noktanın [x, y] koordinatları.
    b açının tepe noktası.
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

    return np.degrees(angle)
