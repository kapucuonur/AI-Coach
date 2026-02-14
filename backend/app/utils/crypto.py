
from cryptography.fernet import Fernet
from app.config import SECRET_KEY
import base64
import logging

# Ensure SECRET_KEY is 32 url-safe base64-encoded bytes. 
# If not, we derive a key or pad it. 
# For simplicity in this project, we'll hash the SECRET_KEY to get 32 bytes val.

def _get_start_key():
    # Pad or truncate SECRET_KEY to 32 bytes for Fernet
    # This is a simple derivation for dev/mvp purposes.
    key = SECRET_KEY.encode()[:32]
    if len(key) < 32:
        key = key.ljust(32, b'=')
    return base64.urlsafe_b64encode(key)

cipher_suite = Fernet(_get_start_key())

def encrypt_password(password: str) -> str:
    if not password:
        return None
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return None
    try:
        return cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception as e:
        logging.error(f"Decryption failed: {e}")
        return None
