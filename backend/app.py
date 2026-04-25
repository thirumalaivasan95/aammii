"""
app.py — Aammii Tharcharbu Santhai Backend
E-commerce backend: products, PDF catalogue upload, orders, PDF invoices.

Endpoints:
  GET   /                       → frontend index.html
  GET   /<file>                 → frontend static
  GET   /api/products           → list of products
  PATCH /api/products/<id>      → update product fields (admin: image_url, hsn, gst_rate, …)
  POST  /api/upload             → PDF catalogue parser
  POST  /api/mark-new           → mark products as newly added
  POST  /api/order              → place order · returns PDF invoice
  GET   /api/orders             → list all orders (most recent first)
  GET   /api/orders/<id>        → single order detail
"""

# ═══════════════════════════════════════════════════════════════
# 1. STARTUP / UTF-8 SAFETY (critical for Tamil text on Windows)
# ═══════════════════════════════════════════════════════════════
import sys, os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ═══════════════════════════════════════════════════════════════
# 2. IMPORTS & PATHS
# ═══════════════════════════════════════════════════════════════
import json, random, string, datetime, io
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT = os.path.join(BASE, "frontend")
UPL   = os.path.join(BASE, "uploads")
ORD   = os.path.join(BASE, "orders")
PJSON = os.path.join(UPL, "products.json")
OJSON = os.path.join(ORD, "orders.json")

for d in [UPL, ORD]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, static_folder=FRONT)
CORS(app, resources={r"/api/*": {"origins": "*"}})

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# Optional: reportlab for PDF invoices
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    print("  [pdf] reportlab not available — installing it enables PDF invoices", flush=True)

# ═══════════════════════════════════════════════════════════════
# 3. COMPANY DETAILS (used on invoice)
# ═══════════════════════════════════════════════════════════════
COMPANY = {
    "name":    "Aammii Tharcharbu Santhai Private Limited",
    "address": ("Door No.5/177, Arumuga kavundanur, Thanneer thotti stop, "
                "Roja street, perur chettipalayam(po), kovaipudhur main road, "
                "Coimbatore - 641010. Tamilnadu. India."),
    "gstin":   "33AAZCA4586H1Z3",
    "website": "www.aammii.com",
    "fssai":   "12419003001497",
    "phone":   "9500655548",
}

# Default category → HSN code (used when a product has no `hsn` set).
CAT_HSN = {
    "Millets & Grains":     "10082990",
    "Pulses & Dals":        "07139090",
    "Sweeteners":           "17029090",
    "Honey":                "04090000",
    "Beverages":            "21069099",
    "Spices":               "09109990",
    "Oils & Ghee":          "15159040",
    "Pickles":              "20019000",
    "Salt":                 "25010020",
    "Dry Fruits & Nuts":    "08029900",
    "Health Mix":           "21069099",
    "Healthcare":           "30049099",
    "Personal Care":        "33049990",
    "Soap":                 "34011190",
    "Herbal Powder":        "30039011",
    "Noodles & Vermicelli": "19023010",
    "Vadagam & Appalam":    "19059040",
    "Readymade Mix":        "21069099",
    "Face Pack":            "33049990",
    "Seeds":                "12099990",
    "Divine Products":      "33074900",
    "Copper Products":      "74181090",
    "Wellness Tools":       "90189099",
    "Books & DVDs":         "49019900",
    "Home Care":            "34022010",
}

# Categories that default to 18% GST (otherwise 5%).
HIGH_GST_CATS = {"Home Care", "Soap", "Personal Care", "Face Pack",
                 "Copper Products", "Wellness Tools", "Books & DVDs"}

# ═══════════════════════════════════════════════════════════════
# 4. PRODUCTS I/O
# ═══════════════════════════════════════════════════════════════
def load_products() -> list:
    if not os.path.exists(PJSON):
        return []
    try:
        with open(PJSON, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def save_products(products: list) -> None:
    with open(PJSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def migrate_products() -> None:
    """Strip legacy SVG image references — frontend now renders fallbacks inline.
    Product images live as full URLs (https://...) on the `image` field."""
    prods = load_products()
    if not prods:
        return
    changed = False
    for p in prods:
        img = (p.get("image") or "").strip()
        if img.startswith("/images/") or img.startswith("data:image"):
            p["image"] = ""
            changed = True
    if changed:
        save_products(prods)
        print(f"  [migrate] cleaned legacy image refs on {len(prods)} products", flush=True)

def gst_rate_for(p: dict) -> float:
    """Per-product GST rate (decimal). Fallbacks: product.gst_rate → category default → 5%."""
    try:
        r = float(p.get("gst_rate"))
        if r > 1: r = r / 100  # tolerate "18" → 0.18
        return r
    except (TypeError, ValueError):
        pass
    return 0.18 if p.get("category") in HIGH_GST_CATS else 0.05

def hsn_for(p: dict) -> str:
    return str(p.get("hsn") or CAT_HSN.get(p.get("category", ""), "")).strip()

# ═══════════════════════════════════════════════════════════════
# 5. ORDERS I/O
# ═══════════════════════════════════════════════════════════════
def load_orders() -> list:
    if not os.path.exists(OJSON):
        return []
    try:
        with open(OJSON, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []

def save_orders(orders: list) -> None:
    with open(OJSON, "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

def append_order(order: dict) -> None:
    orders = load_orders()
    orders.insert(0, order)
    orders = orders[:500]  # cap at 500 most recent
    save_orders(orders)

def next_invoice_no() -> str:
    """Sequential invoice numbers — start at INV-11000, increment from highest used."""
    orders = load_orders()
    nums = []
    for o in orders:
        n = str(o.get("invoice_no", "")).replace("INV-", "").strip()
        if n.isdigit(): nums.append(int(n))
    return f"INV-{(max(nums) if nums else 11000) + 1}"

# ═══════════════════════════════════════════════════════════════
# 6. STATIC ROUTES
# ═══════════════════════════════════════════════════════════════
@app.route("/")
def idx():
    return send_from_directory(FRONT, "index.html")

@app.route("/<path:f>")
def sf(f):
    return send_from_directory(FRONT, f)

# ═══════════════════════════════════════════════════════════════
# 7. API: PRODUCTS
# ═══════════════════════════════════════════════════════════════
@app.route("/api/products")
def api_products():
    prods = load_products()
    # Enrich with computed fields the invoice / frontend may want.
    for p in prods:
        p["hsn"] = hsn_for(p)
        p["gst_rate"] = gst_rate_for(p)
    return jsonify(prods)

@app.route("/api/products/<pid>", methods=["PATCH", "PUT"])
def api_product_update(pid):
    """Update a product's editable fields (image URL, HSN, GST rate, name, qty, price)."""
    data = request.get_json(silent=True) or {}
    allowed = {"image", "hsn", "gst_rate", "name", "qty", "price", "category"}
    patch = {k: v for k, v in data.items() if k in allowed}
    if not patch:
        return jsonify({"error": "Nothing to update"}), 400

    prods = load_products()
    for p in prods:
        if str(p.get("id")) == pid or str(p.get("code")) == pid:
            for k, v in patch.items():
                if k == "image":
                    img = (v or "").strip()
                    # Only accept full URLs or empty (clear)
                    if img and not (img.startswith("http://") or img.startswith("https://")):
                        return jsonify({"error": "Image must be a full URL (http/https)"}), 400
                    p["image"] = img
                elif k == "gst_rate":
                    try:
                        r = float(v)
                        if r > 1: r = r / 100
                        p["gst_rate"] = r
                    except (TypeError, ValueError):
                        return jsonify({"error": "gst_rate must be a number"}), 400
                else:
                    p[k] = v
            save_products(prods)
            return jsonify({"ok": True, "product": p})
    return jsonify({"error": "Product not found"}), 404

@app.route("/api/upload", methods=["POST"])
def api_upload():
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF provided"}), 400
    pf = request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Must be a .pdf file"}), 400

    pdf_path = os.path.join(UPL, "catalogue.pdf")
    try:
        pf.save(pdf_path)
    except Exception as e:
        return jsonify({"error": f"Could not save PDF: {e}"}), 500

    parsed = []
    try:
        from pdf_parser import parse_pdf
        parsed = parse_pdf(pdf_path) or []
    except ImportError:
        print("  [pdf] pdf_parser module not available", flush=True)
    except Exception as e:
        print(f"  [pdf] parse error: {e}", flush=True)

    if parsed:
        for i, p in enumerate(parsed):
            code = str(p.get("code") or f"PDF-{i+1:03d}").strip()
            p["code"] = code
            p["id"]   = code
            p.setdefault("date_added", datetime.datetime.now(IST).date().isoformat())
            p.setdefault("image", "")  # empty = use frontend fallback
        save_products(parsed)
        print(f"  [pdf] Parsed {len(parsed)} products from PDF", flush=True)
        return jsonify({
            "count": len(parsed), "products": parsed, "source": "pdf",
            "note": f"Extracted {len(parsed)} products from uploaded PDF"
        })

    prods = load_products()
    if prods:
        return jsonify({
            "count": len(prods), "products": prods, "source": "preloaded",
            "note": f"PDF unparseable — showing {len(prods)} existing products"
        })
    return jsonify({"error": "No products data found."}), 422

@app.route("/api/mark-new", methods=["POST"])
def api_mark_new():
    data    = request.get_json(silent=True) or {}
    ids     = data.get("ids", [])
    if not ids:
        return jsonify({"error": "Provide ids list"}), 400
    prods   = load_products()
    today   = datetime.datetime.now(IST).date().isoformat()
    id_set  = set(str(i) for i in ids)
    updated = 0
    for p in prods:
        if str(p.get("id") or p.get("code")) in id_set:
            p["date_added"] = today
            updated += 1
    save_products(prods)
    return jsonify({"updated": updated, "date": today})

# ═══════════════════════════════════════════════════════════════
# 8. PDF INVOICE — matches the Aammii invoice format
# ═══════════════════════════════════════════════════════════════
def find_tamil_font():
    """Return (path, name) of first system Tamil-capable font, or (None, None)."""
    candidates = [
        (r"C:\Windows\Fonts\NirmalaUI.ttf",                        "NirmalaUI"),
        (r"C:\Windows\Fonts\Nirmala.ttf",                          "Nirmala"),
        (r"C:\Windows\Fonts\latha.ttf",                            "Latha"),
        (r"C:\Windows\Fonts\Latha.ttf",                            "Latha"),
        ("/System/Library/Fonts/Supplemental/Tamil MN.ttc",        "TamilMN"),
        ("/Library/Fonts/NotoSansTamil-Regular.ttf",               "NotoTamil"),
        ("/usr/share/fonts/truetype/noto/NotoSansTamil-Regular.ttf","NotoTamil"),
        ("/usr/share/fonts/noto/NotoSansTamil-Regular.ttf",        "NotoTamil"),
        ("/usr/share/fonts/TTF/NotoSansTamil-Regular.ttf",         "NotoTamil"),
    ]
    for path, name in candidates:
        if os.path.exists(path):
            return path, name
    return None, None

_TAMIL_FONT_NAME = None
def ensure_tamil_font():
    global _TAMIL_FONT_NAME
    if _TAMIL_FONT_NAME is not None:
        return _TAMIL_FONT_NAME or None
    if not REPORTLAB_OK:
        _TAMIL_FONT_NAME = ""
        return None
    path, name = find_tamil_font()
    if path:
        try:
            pdfmetrics.registerFont(TTFont(name, path))
            _TAMIL_FONT_NAME = name
            print(f"  [pdf] Tamil font registered: {name} ({path})", flush=True)
            return name
        except Exception as e:
            print(f"  [pdf] Font register failed: {e}", flush=True)
    _TAMIL_FONT_NAME = ""
    return None


def safe_text(s) -> str:
    if s is None: return ""
    return str(s).replace("\x00", "").strip()

def wrap_text(s: str, width: int) -> list:
    words = (s or "").split(); lines = []; cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur: lines.append(cur)
    return lines


def compute_invoice_rows(items: list) -> tuple:
    """For each item compute MRP/Qty/Sales/CGST/SGST/Total. Returns (rows, totals)."""
    rows = []
    sub = c_sum = s_sum = total = 0.0
    for it in items:
        mrp     = float(it.get("price", 0))
        qty     = int(it.get("qty", 1))
        rate    = float(it.get("gst_rate") or (0.18 if it.get("category") in HIGH_GST_CATS else 0.05))
        if rate > 1: rate = rate / 100
        cgst_pct = sgst_pct = rate / 2
        gross   = mrp * qty
        sales   = gross / (1 + rate) if rate > 0 else gross
        cgst    = sales * cgst_pct
        sgst    = sales * sgst_pct
        line_t  = gross
        rows.append({
            "code": str(it.get("code") or it.get("id") or ""),
            "hsn":  str(it.get("hsn") or CAT_HSN.get(it.get("category", ""), "")),
            "name": safe_text(it.get("name", "")),
            "mrp":  mrp,
            "qty":  qty,
            "discount_pct": 0.0,
            "discount":     0.0,
            "sales":        round(sales, 2),
            "cgst_pct":     round(cgst_pct * 100, 2),
            "sgst_pct":     round(sgst_pct * 100, 2),
            "cgst":         round(cgst, 2),
            "sgst":         round(sgst, 2),
            "total":        round(line_t, 2),
        })
        sub += sales; c_sum += cgst; s_sum += sgst; total += line_t
    return rows, {
        "subtotal": round(sub, 2),
        "cgst":     round(c_sum, 2),
        "sgst":     round(s_sum, 2),
        "grand":    round(total, 2),
    }


def build_pdf_invoice(order: dict) -> bytes:
    """Generate an A4 PDF invoice matching the Aammii reference layout."""
    if not REPORTLAB_OK:
        return build_text_invoice(order).encode("utf-8")

    tamil_font = ensure_tamil_font()
    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    M    = 12 * mm  # margin

    BLACK  = colors.HexColor("#000000")
    DARK   = colors.HexColor("#222222")
    BORDER = colors.HexColor("#444444")
    LIGHT  = colors.HexColor("#F5F5F5")
    AMBER  = colors.HexColor("#D97706")
    GREEN  = colors.HexColor("#14532D")

    def set_font(size, bold=False, tamil=False):
        if tamil and tamil_font:
            c.setFont(tamil_font, size)
        elif bold:
            c.setFont("Helvetica-Bold", size)
        else:
            c.setFont("Helvetica", size)

    # ── Logo ──
    cx, cy = W / 2, H - 18 * mm
    c.setFillColor(AMBER)
    c.circle(cx, cy, 5.5 * mm, stroke=0, fill=1)
    c.setFillColor(GREEN)
    c.circle(cx + 1.8 * mm, cy + 0.6 * mm, 1.6 * mm, stroke=0, fill=1)

    # ── Company header (centered) ──
    y = H - 26 * mm
    set_font(13, bold=True); c.setFillColor(BLACK)
    c.drawCentredString(W / 2, y, COMPANY["name"])
    set_font(8); c.setFillColor(DARK)
    addr_lines = wrap_text(COMPANY["address"], 95)
    for i, ln in enumerate(addr_lines[:2]):
        c.drawCentredString(W / 2, y - (5 + i * 4) * mm, ln)

    set_font(8, bold=True)
    c.drawString(M,         y - 18 * mm, f"GSTIN: {COMPANY['gstin']}")
    c.drawCentredString(W/2, y - 18 * mm, f"Website: {COMPANY['website']}")
    c.drawRightString(W - M, y - 18 * mm, f"FSSAI: {COMPANY['fssai']}")
    set_font(8)
    c.drawRightString(W - M, y - 22 * mm, f"Ph: {COMPANY['phone']}")

    # ── "Invoice" title ──
    set_font(16, bold=True); c.setFillColor(BLACK)
    c.drawCentredString(W / 2, y - 32 * mm, "Invoice")

    # ── Meta block (Invoice No, Order ID, etc.) ──
    meta_y = y - 40 * mm
    inv_no = order.get("invoice_no", "")
    oid    = order.get("id", "")
    pay    = order.get("payment", "Direct").title()
    dt = datetime.datetime.fromtimestamp(order.get("created", 0) / 1000, IST) \
        if isinstance(order.get("created"), (int, float)) and order.get("created") else datetime.datetime.now(IST)
    date_str = dt.strftime("%d-%m-%y")

    set_font(9, bold=True); c.setFillColor(BLACK)
    c.drawString(M, meta_y,             f"Invoice No: ")
    c.drawString(M, meta_y - 5 * mm,    f"Order ID: ")
    c.drawString(M, meta_y - 10 * mm,   f"Payment Method: ")
    set_font(9)
    c.drawString(M + 22 * mm, meta_y,           safe_text(inv_no))
    c.drawString(M + 22 * mm, meta_y - 5 * mm,  safe_text(oid))
    c.drawString(M + 32 * mm, meta_y - 10 * mm, safe_text(pay))

    set_font(9, bold=True)
    c.drawRightString(W - M - 22 * mm, meta_y,            "Invoice Date: ")
    c.drawRightString(W - M - 22 * mm, meta_y - 5 * mm,   "Order Date: ")
    set_font(9)
    c.drawRightString(W - M, meta_y,           date_str)
    c.drawRightString(W - M, meta_y - 5 * mm,  date_str)

    # ── Customer / Shipping boxes ──
    box_y = meta_y - 18 * mm
    box_h = 28 * mm
    half  = (W - 2 * M) / 2

    # Header rows
    c.setFillColor(LIGHT)
    c.rect(M,        box_y - 6 * mm, half, 6 * mm, fill=1, stroke=0)
    c.rect(M + half, box_y - 6 * mm, half, 6 * mm, fill=1, stroke=0)
    c.setStrokeColor(BORDER); c.setLineWidth(0.5)
    c.rect(M,        box_y - box_h, half, box_h, fill=0, stroke=1)
    c.rect(M + half, box_y - box_h, half, box_h, fill=0, stroke=1)

    set_font(9, bold=True); c.setFillColor(BLACK)
    c.drawCentredString(M + half / 2,           box_y - 4 * mm, "Customer Details")
    c.drawCentredString(M + half + half / 2,    box_y - 4 * mm, "Shipping Address")

    cust = order.get("customer", {})
    set_font(9); c.setFillColor(DARK)
    c.drawString(M + 3 * mm, box_y - 11 * mm, safe_text(cust.get("name", "Guest")))
    c.drawString(M + 3 * mm, box_y - 16 * mm, f"Contact: {safe_text(cust.get('phone', ''))}")
    if cust.get("email"):
        c.drawString(M + 3 * mm, box_y - 21 * mm, safe_text(cust.get("email", "")))

    # Shipping address (multi-line wrap)
    ship_addr = safe_text(cust.get("address", "") or cust.get("name", ""))
    ship_lines = []
    if cust.get("name"):
        ship_lines.append(safe_text(cust.get("name")) + ",")
    for ln in wrap_text(ship_addr, 38)[:4]:
        ship_lines.append(ln)
    ship_lines.append(f"Contact: {safe_text(cust.get('phone', ''))}")

    for i, ln in enumerate(ship_lines[:5]):
        c.drawString(M + half + 3 * mm, box_y - (10 + i * 4) * mm, ln)

    # ── Items table ──
    rows, totals = compute_invoice_rows(order.get("items", []))

    table_y = box_y - box_h - 5 * mm

    # Column widths (in mm) — sum equals usable width (W - 2M) = 186mm.
    col_widths_mm = [13, 14, 50, 13, 7, 11, 12, 13, 9, 9, 12, 12, 11]
    # Multi-line headers — each entry is a list of text lines.
    headers = [
        ["Bar", "Code"],
        ["HSN", "Code"],
        ["Product"],
        ["MRP", "(INR)"],
        ["Qty"],
        ["Discount", "(%)"],
        ["Discount", "(INR)"],
        ["Sales", "(INR)"],
        ["CGST", "%"],
        ["SGST", "%"],
        ["CGST", "(INR)"],
        ["SGST", "(INR)"],
        ["Total", "(INR)"],
    ]
    aligns = ["L", "L", "L", "R", "C", "R", "R", "R", "C", "C", "R", "R", "R"]

    col_x = [M]
    for w in col_widths_mm:
        col_x.append(col_x[-1] + w * mm)

    def draw_cell(text, col_idx, y_top, height, font_size=7, bold=False, fill=None,
                  tamil=False, override_align=None):
        x0 = col_x[col_idx]
        x1 = col_x[col_idx + 1]
        if fill is not None:
            c.setFillColor(fill)
            c.rect(x0, y_top - height, x1 - x0, height, fill=1, stroke=0)
        c.setStrokeColor(BORDER); c.setLineWidth(0.4)
        c.rect(x0, y_top - height, x1 - x0, height, fill=0, stroke=1)
        c.setFillColor(BLACK)
        set_font(font_size, bold=bold, tamil=tamil)
        align = override_align or aligns[col_idx]
        tx = (x0 + x1) / 2 if align == "C" else (x0 + 1.5 * mm) if align == "L" else (x1 - 1.5 * mm)
        ty = y_top - height + (height - font_size * 0.35) / 2
        if align == "C":
            c.drawCentredString(tx, ty, str(text))
        elif align == "L":
            c.drawString(tx, ty, str(text))
        else:
            c.drawRightString(tx, ty, str(text))

    def draw_header(y_top):
        header_h = 9 * mm
        font_size = 6.8
        # Background + border per column
        for i in range(len(col_widths_mm)):
            x0 = col_x[i]; x1 = col_x[i + 1]
            c.setFillColor(LIGHT)
            c.rect(x0, y_top - header_h, x1 - x0, header_h, fill=1, stroke=0)
            c.setStrokeColor(BORDER); c.setLineWidth(0.4)
            c.rect(x0, y_top - header_h, x1 - x0, header_h, fill=0, stroke=1)
        # Multi-line text, vertically centered
        for i, lines in enumerate(headers):
            x0 = col_x[i]; x1 = col_x[i + 1]
            cx = (x0 + x1) / 2
            # vertical centering
            total_h = font_size * 1.15 * len(lines)
            top_pad = (header_h - total_h) / 2 + font_size * 0.7
            for j, ln in enumerate(lines):
                set_font(font_size, bold=True); c.setFillColor(BLACK)
                c.drawCentredString(cx, y_top - top_pad - j * font_size * 1.15, ln)
        return header_h

    # Header
    header_h = draw_header(table_y)
    row_y = table_y - header_h

    # Rows
    for row in rows:
        tam, eng = (row["name"].split(" / ", 1) + [""])[:2]
        # Row height grows if both tamil + eng present
        row_h = 11 * mm if eng else 8 * mm
        # Page break
        if row_y - row_h < 60 * mm:
            c.showPage()
            row_y = H - 25 * mm
            row_y -= draw_header(row_y)

        # Draw outer borders for this row
        for i, w in enumerate(col_widths_mm):
            x0 = col_x[i]; x1 = col_x[i + 1]
            c.setStrokeColor(BORDER); c.setLineWidth(0.4)
            c.rect(x0, row_y - row_h, x1 - x0, row_h, fill=0, stroke=1)

        # Plain numeric cells
        cells = [
            row["code"], row["hsn"], None,                              # product handled separately
            f'{row["mrp"]:.2f}', str(row["qty"]),
            f'{row["discount_pct"]:.2f}', f'{row["discount"]:.2f}',
            f'{row["sales"]:.2f}', f'{row["cgst_pct"]:.2f}', f'{row["sgst_pct"]:.2f}',
            f'{row["cgst"]:.2f}', f'{row["sgst"]:.2f}', f'{row["total"]:.2f}',
        ]
        for i, val in enumerate(cells):
            if val is None: continue
            draw_cell(val, i, row_y, row_h, font_size=7)

        # Product cell (col 2): tamil top, english bottom
        x0 = col_x[2]; x1 = col_x[3]
        max_chars = 36
        set_font(7.5, tamil=True, bold=True); c.setFillColor(BLACK)
        c.drawString(x0 + 1.5 * mm, row_y - 4 * mm, tam[:max_chars])
        if eng:
            set_font(6.5); c.setFillColor(DARK)
            c.drawString(x0 + 1.5 * mm, row_y - 8.5 * mm, eng[:max_chars])

        row_y -= row_h

    # ── Totals (right-aligned, no box, like reference) ──
    totals_y = row_y - 6 * mm
    label_x = W - M - 50 * mm
    val_x   = W - M

    set_font(9); c.setFillColor(BLACK)
    c.drawString(label_x,  totals_y,            "Subtotal (INR)")
    c.drawRightString(val_x, totals_y,          f"{totals['subtotal']:,.2f}")

    c.drawString(label_x,  totals_y - 5 * mm,   "Total CGST (INR)")
    c.drawRightString(val_x, totals_y - 5 * mm, f"{totals['cgst']:,.2f}")

    c.drawString(label_x,  totals_y - 10 * mm,  "Total SGST (INR)")
    c.drawRightString(val_x, totals_y - 10 * mm,f"{totals['sgst']:,.2f}")

    c.setStrokeColor(BORDER); c.setLineWidth(0.5)
    c.line(label_x, totals_y - 13 * mm, val_x, totals_y - 13 * mm)

    set_font(11, bold=True)
    c.drawString(label_x,  totals_y - 19 * mm,  "Grand Total (INR)")
    c.drawRightString(val_x, totals_y - 19 * mm,f"{totals['grand']:,.2f}")

    set_font(7); c.setFillColor(DARK)
    c.drawRightString(val_x, totals_y - 23 * mm, "(inclusive of all taxes)")

    c.showPage(); c.save()
    buf.seek(0)
    return buf.read()


def build_text_invoice(order: dict) -> str:
    """Fallback plain-text invoice when reportlab is not available."""
    rows, totals = compute_invoice_rows(order.get("items", []))
    lines = ["=" * 70,
             f"  {COMPANY['name']}".center(70),
             f"  GSTIN: {COMPANY['gstin']} · {COMPANY['website']}".center(70),
             "=" * 70,
             f"  Invoice No : {order.get('invoice_no','')}",
             f"  Order ID   : {order.get('id','')}",
             f"  Date       : {datetime.datetime.now(IST).strftime('%d-%m-%y')}",
             f"  Customer   : {order.get('customer',{}).get('name','Guest')}",
             f"  Phone      : {order.get('customer',{}).get('phone','')}",
             f"  Address    : {order.get('customer',{}).get('address','')}",
             f"  Payment    : {order.get('payment','Direct')}",
             "-" * 70,
             f"  {'CODE':<10} {'NAME':<32} {'QTY':>4} {'MRP':>8} {'TOTAL':>10}",
             "-" * 70]
    for r in rows:
        nm = r["name"][:32]
        lines.append(f"  {r['code']:<10} {nm:<32} {r['qty']:>4} {r['mrp']:>8.2f} {r['total']:>10.2f}")
    lines += ["-" * 70,
              f"  {'Subtotal':>56}  {totals['subtotal']:>10.2f}",
              f"  {'Total CGST':>56}  {totals['cgst']:>10.2f}",
              f"  {'Total SGST':>56}  {totals['sgst']:>10.2f}",
              f"  {'GRAND TOTAL':>56}  {totals['grand']:>10.2f}",
              "=" * 70,
              "  (inclusive of all taxes)",
              "",
              f"  Thank you! {COMPANY['phone']} · {COMPANY['website']}"]
    return "\n".join(lines)

# ═══════════════════════════════════════════════════════════════
# 9. API: ORDERS
# ═══════════════════════════════════════════════════════════════
@app.route("/api/order", methods=["POST"])
def api_order():
    try:
        d = request.get_json(silent=True) or {}
        items = d.get("items", [])
        if not items:
            return jsonify({"error": "No items in order"}), 400

        # Enrich items with HSN and gst_rate from products.json so the invoice
        # has accurate tax details even if frontend didn't send them.
        prods   = {str(p.get("id")): p for p in load_products()}
        for it in items:
            pid = str(it.get("code") or it.get("id") or "")
            p   = prods.get(pid)
            if p:
                it.setdefault("hsn", hsn_for(p))
                it.setdefault("gst_rate", gst_rate_for(p))
                it.setdefault("category", p.get("category", ""))

        oid = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        inv = next_invoice_no()
        now_ts = int(datetime.datetime.now(IST).timestamp() * 1000)

        order = {
            "id":          oid,
            "invoice_no":  inv,
            "created":     now_ts,
            "date":        datetime.datetime.now(IST).isoformat(),
            "customer":    d.get("customer", {}),
            "payment":     d.get("payment", "Direct"),
            "items":       items,
            "totals":      d.get("totals", {}),
            "status":      "confirmed",
        }

        append_order(order)

        pdf_bytes = build_pdf_invoice(order)
        is_pdf = REPORTLAB_OK
        filename = f"{inv}.pdf" if is_pdf else f"{inv}.txt"

        # Save a copy for admin reference
        try:
            with open(os.path.join(ORD, filename), "wb") as f:
                f.write(pdf_bytes)
        except Exception as e:
            print(f"  [order] Could not save invoice file: {e}", flush=True)

        mimetype = "application/pdf" if is_pdf else "text/plain; charset=utf-8"
        return Response(
            pdf_bytes, status=200, mimetype=mimetype,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Order-Id":   oid,
                "X-Invoice-No": inv,
                "Access-Control-Expose-Headers": "X-Order-Id, X-Invoice-No, Content-Disposition",
            }
        )
    except Exception as e:
        print(f"  [order] Error: {e}", flush=True)
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/orders")
def api_orders():
    return jsonify(load_orders())

@app.route("/api/orders/<oid>")
def api_order_detail(oid):
    orders = load_orders()
    for o in orders:
        if o.get("id") == oid or o.get("invoice_no") == oid:
            return jsonify(o)
    return jsonify({"error": "Order not found"}), 404

# ═══════════════════════════════════════════════════════════════
# 10. SERVER ENTRY
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n  ╔══════════════════════════════════════════╗")
    print("  ║   Aammii Tharcharbu Santhai              ║")
    print("  ║   Natural Lifestyle Products             ║")
    print("  ╚══════════════════════════════════════════╝\n")
    migrate_products()
    ensure_tamil_font()
    if not REPORTLAB_OK:
        print("  [!] reportlab not installed — text invoices will be used.")
        print("      Run: pip install reportlab")
    print("  [*] Open in browser → http://localhost:5000")
    print("  [*] Admin panel     → http://localhost:5000/#/admin")
    print("  [*] Product images: paste an image URL via Admin → Manage Images\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
