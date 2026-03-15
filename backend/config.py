"""
config.py — Aammii Shop configuration
Replace TEST keys with LIVE keys before going live.
"""
import os

# ── Flask ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY", "aammii-secret-change-in-prod-2024")
DEBUG       = os.environ.get("DEBUG", "false").lower() == "true"

# ── Database ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH  = os.path.join(BASE_DIR, "aammii.db")

# ── Razorpay ───────────────────────────────────────────────────────────────
# Sign up at https://razorpay.com → Settings → API Keys
# Replace below with your LIVE key_id and key_secret
RAZORPAY_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID",     "rzp_test_REPLACE_ME")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "REPLACE_ME_SECRET")
RAZORPAY_CURRENCY   = "INR"

# ── Business ───────────────────────────────────────────────────────────────
BUSINESS_NAME    = "Aammii Tharcharbu Santhai Pvt. Ltd."
BUSINESS_WEBSITE = "https://www.aammii.com"
BUSINESS_PHONE   = "+91 95006 55548"
BUSINESS_EMAIL   = "aammiisanthai@gmail.com"
BUSINESS_ADDRESS = "No.49, Thirupathy Nagar, Near Perumal Temple, Kovaipudur, Coimbatore – 641 042. TN."

# ── Upload / images ────────────────────────────────────────────────────────
UPLOAD_DIR  = os.path.join(BASE_DIR, "uploads")
IMAGES_DIR  = os.path.join(BASE_DIR, "generated_images")
ORDERS_DIR  = os.path.join(BASE_DIR, "orders")