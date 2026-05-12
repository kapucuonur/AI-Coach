# utils/score.py

def score_angle(measured, target, tolerance=5):
    """
    Skoru 100 üzerinden verir. Tolerans içindeyse 100, uzaklaştıkça düşer.
    """
    diff = abs(measured - target)

    if diff <= tolerance:
        return 100
    elif diff <= tolerance * 2:
        return 70
    elif diff <= tolerance * 3:
        return 50
    else:
        return 20
