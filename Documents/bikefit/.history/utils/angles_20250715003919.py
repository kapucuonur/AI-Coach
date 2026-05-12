import math

def calculate_angle(a, b, c):
    # 3 nokta arasındaki açıyı derece cinsinden hesapla
    a = tuple(a)
    b = tuple(b)
    c = tuple(c)

    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    cosine_angle = (ba[0]*bc[0] + ba[1]*bc[1]) / (math.sqrt(ba[0]**2 + ba[1]**2) * math.sqrt(bc[0]**2 + bc[1]**2))
    angle = math.acos(max(min(cosine_angle, 1), -1))
    return math.degrees(angle)
