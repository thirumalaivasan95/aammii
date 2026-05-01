"""
config.py — Aammii Shop configuration (single source of truth).
Reads from environment variables; loads `.env` if present.
"""
import os
from pathlib import Path

# ── Load .env if available ──
try:
    from dotenv import load_dotenv
    _ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
    if _ENV_FILE.exists():
        load_dotenv(_ENV_FILE)
except ImportError:
    pass  # python-dotenv optional in dev

def _bool(v: str, default: bool = False) -> bool:
    if v is None:
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")

def _csv(v: str) -> list[str]:
    return [x.strip() for x in (v or "").split(",") if x.strip()]

# ── Paths ──
BASE_DIR    = Path(__file__).resolve().parent.parent
FRONTEND    = BASE_DIR / "frontend"
UPLOAD_DIR  = BASE_DIR / "uploads"
IMAGES_DIR  = BASE_DIR / "generated_images"
ORDERS_DIR  = BASE_DIR / "orders"
LOGS_DIR    = BASE_DIR / "logs"
DB_PATH     = str(BASE_DIR / "aammii.db")

for d in (UPLOAD_DIR, IMAGES_DIR, ORDERS_DIR, LOGS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Path strings used by older modules
UPLOAD_DIR  = str(UPLOAD_DIR)
IMAGES_DIR  = str(IMAGES_DIR)
ORDERS_DIR  = str(ORDERS_DIR)

# ── Flask ──
SECRET_KEY = os.environ.get("SECRET_KEY", "aammii-dev-secret-change-me")
DEBUG      = _bool(os.environ.get("DEBUG"), default=False)
HOST       = os.environ.get("HOST", "0.0.0.0")
PORT       = int(os.environ.get("PORT", "5000"))

# ── Security ──
ADMIN_TOKEN  = os.environ.get("ADMIN_TOKEN", "")  # empty = auth disabled (dev only)
CORS_ORIGINS = _csv(os.environ.get("CORS_ORIGINS", "*"))

# ── Logging ──
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_FILE  = os.environ.get("LOG_FILE",  str(Path(LOGS_DIR if isinstance(LOGS_DIR, str) else str(LOGS_DIR)) / "aammii.log"))

# ── Razorpay (optional) ──
RAZORPAY_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID",     "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_CURRENCY   = "INR"

# ── Business (used on invoice / SEO) ──
BUSINESS_NAME    = os.environ.get("BUSINESS_NAME",    "Aammii Tharcharbu Santhai Private Limited")
BUSINESS_WEBSITE = os.environ.get("BUSINESS_WEBSITE", "https://www.aammii.com")
BUSINESS_PHONE   = os.environ.get("BUSINESS_PHONE",   "+91 95006 55548")
BUSINESS_EMAIL   = os.environ.get("BUSINESS_EMAIL",   "aammiisanthai@gmail.com")
BUSINESS_ADDRESS = os.environ.get(
    "BUSINESS_ADDRESS",
    "Door No.5/177, Arumuga kavundanur, Thanneer thotti stop, "
    "Roja street, perur chettipalayam(po), kovaipudhur main road, "
    "Coimbatore - 641010. Tamilnadu. India."
)
BUSINESS_GSTIN   = os.environ.get("BUSINESS_GSTIN", "33AAZCA4586H1Z3")
BUSINESS_FSSAI   = os.environ.get("BUSINESS_FSSAI", "12419003001497")
