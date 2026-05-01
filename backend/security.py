"""
security.py — admin token auth + payload validation helpers.
"""
import re
from functools import wraps
from typing import Any
from flask import request, jsonify

import config
from app_logger import get_logger

log = get_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Admin auth
# ─────────────────────────────────────────────────────────────────────────────
def require_admin(fn):
    """Decorator: rejects requests without the correct X-Admin-Token header.
    If ADMIN_TOKEN is empty (dev mode), the decorator is a no-op but logs a warning.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = config.ADMIN_TOKEN
        if not token:
            log.warning("ADMIN_TOKEN is not configured — admin endpoint %s is OPEN.", fn.__name__)
            return fn(*args, **kwargs)
        provided = (request.headers.get("X-Admin-Token") or
                    request.args.get("admin_token") or "").strip()
        if provided != token:
            log.info("Rejected admin request to %s from %s", fn.__name__, request.remote_addr)
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────────────────────────
# Order payload validation
# ─────────────────────────────────────────────────────────────────────────────
PHONE_RE   = re.compile(r"^[0-9+\-\s()]{7,20}$")
PINCODE_RE = re.compile(r"^[0-9]{4,10}$")
EMAIL_RE   = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class ValidationError(ValueError):
    pass

def _str(v: Any, max_len: int = 500) -> str:
    if v is None:
        return ""
    return str(v).strip()[:max_len]

def validate_order_payload(d: dict) -> dict:
    """Returns a sanitised copy of the order payload or raises ValidationError."""
    if not isinstance(d, dict):
        raise ValidationError("Payload must be a JSON object")

    items = d.get("items") or []
    if not isinstance(items, list) or not items:
        raise ValidationError("`items` must be a non-empty list")
    if len(items) > 100:
        raise ValidationError("Too many items (max 100)")

    cust = d.get("customer") or {}
    if not isinstance(cust, dict):
        raise ValidationError("`customer` must be an object")

    name  = _str(cust.get("name"), 120)
    phone = _str(cust.get("phone"), 20)
    email = _str(cust.get("email"), 120)
    addr  = _str(cust.get("address"), 600)

    if not name:
        raise ValidationError("Customer name is required")
    if not phone or not PHONE_RE.match(phone):
        raise ValidationError("Customer phone is invalid")
    if email and not EMAIL_RE.match(email):
        raise ValidationError("Customer email is invalid")
    if not addr:
        raise ValidationError("Customer address is required")

    clean_items = []
    for raw in items:
        if not isinstance(raw, dict):
            raise ValidationError("Each item must be an object")
        try:
            qty_raw = raw.get("qty", raw.get("quantity", 1))
            qty   = int(qty_raw if qty_raw not in (None, "") else 1)
            price = float(raw.get("price") if raw.get("price") not in (None, "") else 0)
        except (TypeError, ValueError):
            raise ValidationError("Item qty/price must be numeric")
        if qty < 1 or qty > 999:
            raise ValidationError("Item qty must be 1..999")
        if price < 0 or price > 1_000_000:
            raise ValidationError("Item price out of range")
        clean_items.append({
            "code":     _str(raw.get("code") or raw.get("id"), 60),
            "id":       _str(raw.get("id") or raw.get("code"), 60),
            "name":     _str(raw.get("name"), 200),
            "qty":      qty,
            "price":    price,
            "qty_unit": _str(raw.get("qty_unit"), 40),
            "category": _str(raw.get("category"), 80),
            "hsn":      _str(raw.get("hsn"), 20),
            "gst_rate": raw.get("gst_rate"),
        })

    payment = _str(d.get("payment"), 30) or "cod"
    if payment.lower() not in ("cod", "online", "upi", "razorpay", "direct"):
        raise ValidationError("Unsupported payment method")

    totals = d.get("totals") or {}
    if not isinstance(totals, dict):
        totals = {}

    return {
        "customer": {"name": name, "phone": phone, "email": email, "address": addr,
                     "notes": _str(cust.get("notes"), 500)},
        "items":    clean_items,
        "payment":  payment,
        "totals":   totals,
    }
