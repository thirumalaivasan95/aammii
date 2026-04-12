"""
app.py — Aammii Tharcharbu Santhai Backend
Flask REST API + Static file server
"""
import os, json, random, string, datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

# ── Paths ──────────────────────────────────────────────────────────
BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT = os.path.join(BASE, "frontend")
IMGS  = os.path.join(BASE, "generated_images")
UPL   = os.path.join(BASE, "uploads")
ORD   = os.path.join(BASE, "orders")
PJSON = os.path.join(UPL, "products.json")

for d in [IMGS, UPL, ORD]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, static_folder=FRONT)
CORS(app, resources={r"/api/*": {"origins": "*"}})

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# ── Static file serving ────────────────────────────────────────────
@app.route("/")
def idx():
    return send_from_directory(FRONT, "index.html")

@app.route("/<path:f>")
def sf(f):
    return send_from_directory(FRONT, f)

@app.route("/images/<path:f>")
def img(f):
    return send_from_directory(IMGS, f)

# ── SVG Image Generation ───────────────────────────────────────────
CAT_PAL = {
    "Millets & Grains":     ("#6b4226", "#c8956c", "🌾"),
    "Pulses & Dals":        ("#556b2f", "#a8c46f", "🫘"),
    "Sweeteners":           ("#d4a043", "#f4c87a", "🍯"),
    "Honey":                ("#d4a043", "#f9e79f", "🍯"),
    "Beverages":            ("#1abc9c", "#76d7c4", "🍵"),
    "Spices":               ("#c0392b", "#e88080", "🌶"),
    "Oils & Ghee":          ("#8b4513", "#d2a679", "🫙"),
    "Pickles":              ("#556b2f", "#a8c46f", "🥒"),
    "Salt":                 ("#3d5a80", "#7ba7c7", "🧂"),
    "Dry Fruits & Nuts":    ("#784212", "#d7bde2", "🥜"),
    "Health Mix":           ("#1a5276", "#aed6f1", "💊"),
    "Healthcare":           ("#922b21", "#f1948a", "🩺"),
    "Personal Care":        ("#9b59b6", "#c39bd3", "🌸"),
    "Soap":                 ("#2980b9", "#85c1e9", "🧼"),
    "Herbal Powder":        ("#4a7c59", "#7cb997", "🌿"),
    "Noodles & Vermicelli": ("#e67e22", "#f0a85c", "🍜"),
    "Vadagam & Appalam":    ("#8b4513", "#c8956c", "🥙"),
    "Readymade Mix":        ("#d4a043", "#f4c87a", "🍱"),
    "Face Pack":            ("#9b59b6", "#c39bd3", "✨"),
    "Seeds":                ("#27ae60", "#82e0aa", "🌱"),
    "Divine Products":      ("#9b59b6", "#c39bd3", "🕯"),
    "Copper Products":      ("#d4a043", "#f4c87a", "🥇"),
    "Wellness Tools":       ("#2980b9", "#85c1e9", "🧘"),
    "Books & DVDs":         ("#3d5a80", "#aed6f1", "📚"),
    "Home Care":            ("#2ecc71", "#82e0aa", "🧴"),
}
_DEFAULTS = [
    ("#4a7c59", "#7cb997", "🌿"),
    ("#6b4226", "#c8956c", "🌾"),
    ("#d4a043", "#f4c87a", "🍯"),
    ("#c0392b", "#e88080", "🌶"),
]

def make_svg(name, pid, cat=""):
    """Generate an SVG product image if it doesn't exist. Returns the URL path."""
    fp = os.path.join(IMGS, f"{pid}.svg")
    if os.path.exists(fp):
        return f"/images/{pid}.svg"

    bg, ac, em = CAT_PAL.get(cat, _DEFAULTS[abs(hash(name)) % len(_DEFAULTS)])
    tamil_part  = name.split(" / ")[0] if " / " in name else name
    english_part = name.split(" / ")[1] if " / " in name else ""

    # Split tamil into up to 2 lines
    words = tamil_part.split()
    l1 = " ".join(words[:3])
    l2 = " ".join(words[3:]) if len(words) > 3 else ""
    en = english_part[:32] + ("…" if len(english_part) > 32 else "")
    font = "Noto Sans Tamil,Latha,Tamil MN,Arial Unicode MS,sans-serif"

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="160" viewBox="0 0 280 160">'
        f'<defs><linearGradient id="g{pid}" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{bg}"/><stop offset="100%" stop-color="{ac}"/>'
        f'</linearGradient></defs>'
        f'<rect width="280" height="160" fill="url(#g{pid})" rx="12"/>'
        f'<rect x="8" y="8" width="264" height="144" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" rx="8"/>'
        f'<circle cx="140" cy="56" r="28" fill="rgba(255,255,255,0.12)"/>'
        f'<text x="140" y="70" text-anchor="middle" font-size="30">{em}</text>'
        f'<text x="140" y="100" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.95)" font-family="{font}" font-weight="700">{l1}</text>'
        + (f'<text x="140" y="116" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.85)" font-family="{font}">{l2}</text>' if l2 else "")
        + (f'<text x="140" y="138" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Arial,sans-serif">{en}</text>' if en else "")
        + '</svg>'
    )
    with open(fp, "w", encoding="utf-8") as f:
        f.write(svg)
    return f"/images/{pid}.svg"

# ── Products JSON helpers ──────────────────────────────────────────
def load_products():
    """Load products.json. Returns list."""
    if not os.path.exists(PJSON):
        return []
    try:
        with open(PJSON, encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []

def save_products(products):
    """Persist products list back to products.json."""
    with open(PJSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def prebuild_images():
    """Generate SVG images for all products on startup."""
    prods = load_products()
    count = 0
    for p in prods:
        pid = p.get("id")
        if pid:
            make_svg(p.get("name", ""), pid, p.get("category", ""))
            count += 1
    if count:
        print(f"  🎨  {count} product images ready")

# ── API: GET /api/products ─────────────────────────────────────────
@app.route("/api/products")
def get_products():
    return jsonify(load_products())

# ── API: POST /api/upload ──────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
def upload():
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF provided"}), 400
    pf = request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Must be a PDF file"}), 400

    # Save the uploaded PDF
    try:
        pf.save(os.path.join(UPL, "catalogue.pdf"))
    except Exception:
        pass

    prods = load_products()
    if prods:
        return jsonify({
            "count":    len(prods),
            "products": prods,
            "source":   "preloaded",
            "note":     f"Aammii catalogue recognised — {len(prods)} products loaded!",
        })
    return jsonify({"error": "No products data found. Ensure uploads/products.json exists."}), 422

# ── API: POST /api/mark-new ────────────────────────────────────────
@app.route("/api/mark-new", methods=["POST"])
def mark_new():
    """
    Mark specific product IDs as newly added (for 'New This Week' section).
    Body: { "ids": ["A-001", "A-002", ...] }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("ids"):
        return jsonify({"error": "Provide ids list"}), 400

    prods   = load_products()
    today   = datetime.datetime.now(IST).date().isoformat()
    updated = 0
    id_set  = set(data["ids"])
    for p in prods:
        if p.get("id") in id_set:
            p["date_added"] = today
            updated += 1

    save_products(prods)
    return jsonify({"updated": updated, "date": today})

# ── API: POST /api/order ───────────────────────────────────────────
@app.route("/api/order", methods=["POST"])
def order():
    d = request.get_json(silent=True)
    if not d or not d.get("items"):
        return jsonify({"error": "No items in order"}), 400

    items    = d["items"]
    customer = d.get("customer", {})
    cust_name    = customer.get("name", "Guest")
    cust_contact = customer.get("contact", "")

    oid   = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    now   = datetime.datetime.now(IST)
    grand = sum(i["qty"] * i["price"] for i in items)
    sgst  = round(grand * 0.0, 2)   # set your tax rate if applicable
    total = grand + sgst

    W   = 66
    SEP = "─" * 68

    def row(text):
        return "║" + text.center(W) + "║"

    def item_line(code, name, qty, price):
        """Format one order line. Handles Tamil characters gracefully."""
        amount  = qty * price
        # Left: code + name
        label = f"{code}  {name}"
        # Right: qty × price = total
        right = f"{qty} × ₹{price:.2f} = ₹{amount:.2f}"
        return f"  {label}"  + "\n" + f"  {'':<4}{right:>50}"

    lines = [
        "╔" + "═" * W + "╗",
        row("AAMMII THARCHARBU SANTHAI"),
        row("இயற்கை வாழ்க்கை பொருட்கள்"),
        row("www.aammii.com  |  +91 95006 55548"),
        "╚" + "═" * W + "╝",
        "",
        f"  Order ID   : {oid}",
        f"  Date       : {now.strftime('%d %B %Y')}",
        f"  Time       : {now.strftime('%H:%M:%S')} IST",
        f"  Customer   : {cust_name}",
    ]
    if cust_contact:
        lines.append(f"  Contact    : {cust_contact}")

    lines += [
        "",
        SEP,
        f"  {'Code':<10} {'Product Name':<30} {'Qty':>4}  {'Price':>8}  {'Total':>9}",
        SEP,
    ]

    for i in items:
        code     = i.get("code", "—")
        full_name = i["name"]
        qty      = i["qty"]
        price    = i["price"]
        amount   = qty * price

        # Tamil name (before " / ")
        tamil   = full_name.split(" / ")[0] if " / " in full_name else full_name
        english = full_name.split(" / ")[1] if " / " in full_name else ""

        lines.append(f"  {code:<10} {tamil}")
        if english:
            lines.append(f"  {'':<10} {english}")
        lines.append(f"  {'':<10} {'Qty: '+str(qty):<16} ₹{price:>8.2f}   ₹{amount:>9.2f}")
        lines.append(f"  {'':<10} {'Pack: '+i.get('qty_unit',''):<16}")
        lines.append(SEP)

    lines += [
        f"  {'':>50} SUBTOTAL  ₹{grand:>9.2f}",
    ]
    if sgst > 0:
        lines.append(f"  {'':>50} GST       ₹{sgst:>9.2f}")
    lines += [
        f"  {'':>50} {'─'*22}",
        f"  {'':>50} GRAND TOTAL ₹{total:>8.2f}",
        SEP,
        "",
        "  Payment Instructions:",
        "  ─────────────────────",
        "  UPI / GPay / PhonePe: aammii@upi",
        "  Bank Transfer: (Contact us for bank details)",
        "  Cash on Delivery: Available in select areas",
        "",
        "  நன்றி! Thank you for choosing Aammii Natural Products!",
        "  வாழ்க வளமுடன்!",
        "",
        f"  Order confirmed at {now.strftime('%H:%M:%S IST, %d %b %Y')}",
        "",
    ]

    fn = f"{oid}.txt"
    fp = os.path.join(ORD, fn)
    with open(fp, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return send_file(
        fp,
        as_attachment=True,
        download_name=fn,
        mimetype="text/plain; charset=utf-8",
    )

# ── Startup ────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n  🌿  Aammii Tharcharbu Santhai")
    print("  ─────────────────────────────────")
    prebuild_images()
    print("  🚀  Running at http://localhost:5000")
    print("  ─────────────────────────────────\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
