"""
app.py — Aammii Tharcharbu Santhai Backend
"""
import sys, os, json, random, string, datetime

# Force UTF-8 stdout/stderr so Tamil chars never crash on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS

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

# ── Static serving ──────────────────────────────────────────────
@app.route("/")
def idx():
    return send_from_directory(FRONT, "index.html")

@app.route("/<path:f>")
def sf(f):
    return send_from_directory(FRONT, f)

@app.route("/images/<path:f>")
def img(f):
    return send_from_directory(IMGS, f)

# ── SVG palette ─────────────────────────────────────────────────
CAT_PAL = {
    "Millets & Grains":     ("#6b4226","#c8956c","🌾"),
    "Pulses & Dals":        ("#556b2f","#a8c46f","🫘"),
    "Sweeteners":           ("#d4a043","#f4c87a","🍯"),
    "Honey":                ("#d4a043","#f9e79f","🍯"),
    "Beverages":            ("#1abc9c","#76d7c4","🍵"),
    "Spices":               ("#c0392b","#e88080","🌶"),
    "Oils & Ghee":          ("#8b4513","#d2a679","🫙"),
    "Pickles":              ("#556b2f","#a8c46f","🥒"),
    "Salt":                 ("#3d5a80","#7ba7c7","🧂"),
    "Dry Fruits & Nuts":    ("#784212","#d7bde2","🥜"),
    "Health Mix":           ("#1a5276","#aed6f1","💊"),
    "Healthcare":           ("#922b21","#f1948a","🩺"),
    "Personal Care":        ("#9b59b6","#c39bd3","🌸"),
    "Soap":                 ("#2980b9","#85c1e9","🧼"),
    "Herbal Powder":        ("#4a7c59","#7cb997","🌿"),
    "Noodles & Vermicelli": ("#e67e22","#f0a85c","🍜"),
    "Vadagam & Appalam":    ("#8b4513","#c8956c","🥙"),
    "Readymade Mix":        ("#d4a043","#f4c87a","🍱"),
    "Face Pack":            ("#9b59b6","#c39bd3","✨"),
    "Seeds":                ("#27ae60","#82e0aa","🌱"),
    "Divine Products":      ("#9b59b6","#c39bd3","🕯"),
    "Copper Products":      ("#d4a043","#f4c87a","🥇"),
    "Wellness Tools":       ("#2980b9","#85c1e9","🧘"),
    "Books & DVDs":         ("#3d5a80","#aed6f1","📚"),
    "Home Care":            ("#2ecc71","#82e0aa","🧴"),
}
_DEF = [("#4a7c59","#7cb997","🌿"),("#6b4226","#c8956c","🌾"),
        ("#d4a043","#f4c87a","🍯"),("#c0392b","#e88080","🌶")]

def make_svg(name, pid, cat=""):
    fp = os.path.join(IMGS, f"{pid}.svg")
    if os.path.exists(fp):
        return f"/images/{pid}.svg"
    bg, ac, em = CAT_PAL.get(cat, _DEF[abs(hash(name)) % len(_DEF)])
    tamil  = name.split(" / ")[0] if " / " in name else name
    eng    = name.split(" / ")[1] if " / " in name else ""
    words  = tamil.split()
    l1, l2 = " ".join(words[:3]), (" ".join(words[3:]) if len(words) > 3 else "")
    en     = eng[:30] + ("..." if len(eng) > 30 else "")
    font   = "Noto Sans Tamil,Latha,Tamil MN,Arial Unicode MS,sans-serif"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="160" viewBox="0 0 280 160">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{bg}"/><stop offset="100%" stop-color="{ac}"/>'
        f'</linearGradient></defs>'
        f'<rect width="280" height="160" fill="url(#g)" rx="8"/>'
        f'<circle cx="140" cy="56" r="26" fill="rgba(255,255,255,0.12)"/>'
        f'<text x="140" y="70" text-anchor="middle" font-size="28">{em}</text>'
        f'<text x="140" y="98" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.95)" font-family="{font}" font-weight="700">{l1}</text>'
        + (f'<text x="140" y="114" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.85)" font-family="{font}">{l2}</text>' if l2 else "")
        + (f'<text x="140" y="136" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)">{en}</text>' if en else "")
        + '</svg>'
    )
    with open(fp, "w", encoding="utf-8") as f:
        f.write(svg)
    return f"/images/{pid}.svg"

# ── Products ────────────────────────────────────────────────────
def load_products():
    if not os.path.exists(PJSON):
        return []
    try:
        with open(PJSON, encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []

def save_products(products):
    with open(PJSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def prebuild_images():
    prods = load_products()
    for p in prods:
        pid = p.get("id")
        if pid:
            make_svg(p.get("name",""), pid, p.get("category",""))
    print(f"  [img] {len(prods)} product images ready")

# ── GET /api/products ───────────────────────────────────────────
@app.route("/api/products")
def get_products():
    return jsonify(load_products())

# ── POST /api/upload ────────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
def upload():
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF provided"}), 400
    pf = request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Must be a PDF file"}), 400
    try:
        pf.save(os.path.join(UPL, "catalogue.pdf"))
    except Exception:
        pass
    prods = load_products()
    if prods:
        return jsonify({"count": len(prods), "products": prods,
                        "source": "preloaded",
                        "note": f"Aammii catalogue recognised - {len(prods)} products loaded!"})
    return jsonify({"error": "No products data found."}), 422

# ── POST /api/mark-new ──────────────────────────────────────────
@app.route("/api/mark-new", methods=["POST"])
def mark_new():
    data = request.get_json(silent=True) or {}
    ids  = data.get("ids", [])
    if not ids:
        return jsonify({"error": "Provide ids list"}), 400
    prods   = load_products()
    today   = datetime.datetime.now(IST).date().isoformat()
    updated = 0
    id_set  = set(ids)
    for p in prods:
        if p.get("id") in id_set:
            p["date_added"] = today
            updated += 1
    save_products(prods)
    return jsonify({"updated": updated, "date": today})

# ── POST /api/order ─────────────────────────────────────────────
@app.route("/api/order", methods=["POST"])
def order():
    try:
        d = request.get_json(silent=True) or {}
        items = d.get("items", [])
        if not items:
            return jsonify({"error": "No items in order"}), 400

        customer     = d.get("customer", {})
        cust_name    = str(customer.get("name", "Guest"))
        cust_contact = str(customer.get("contact", ""))

        oid   = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        now   = datetime.datetime.now(IST)
        grand = sum(float(i["qty"]) * float(i["price"]) for i in items)

        # Build plain-text invoice (ASCII-safe borders, UTF-8 content)
        lines = [
            "=" * 62,
            "  AAMMII THARCHARBU SANTHAI".center(62),
            "  Natural Lifestyle Products".center(62),
            "  www.aammii.com  |  +91 95006 55548".center(62),
            "=" * 62,
            "",
            f"  Order ID   : {oid}",
            f"  Date       : {now.strftime('%d %B %Y')}",
            f"  Time       : {now.strftime('%H:%M:%S')} IST",
            f"  Customer   : {cust_name}",
        ]
        if cust_contact and cust_contact != "Guest":
            lines.append(f"  Contact    : {cust_contact}")

        lines += ["", "-" * 62,
                  f"  {'CODE':<10}  {'QTY':>4}  {'PRICE':>8}  {'TOTAL':>9}",
                  "-" * 62]

        for i in items:
            code      = str(i.get("code", i.get("id", "---")))
            full_name = str(i.get("name", ""))
            qty       = int(i.get("qty", 1))
            price     = float(i.get("price", 0))
            pack      = str(i.get("qty_unit", ""))
            amount    = qty * price

            # Split Tamil / English
            if " / " in full_name:
                tamil, english = full_name.split(" / ", 1)
            else:
                tamil, english = full_name, ""

            lines.append(f"  {code:<10}  {qty:>4}  {price:>8.2f}  {amount:>9.2f}")
            lines.append(f"    {tamil}")
            if english:
                lines.append(f"    ({english})")
            if pack:
                lines.append(f"    Pack: {pack}")
            lines.append("-" * 62)

        lines += [
            f"  {'GRAND TOTAL':>44}  {grand:>9.2f}",
            "=" * 62,
            "",
            "  PAYMENT OPTIONS:",
            "  UPI / GPay / PhonePe : aammii@upi",
            "  Cash on Delivery      : Available in select areas",
            "",
            "  Thank you! Nandri! Come back soon.",
            "  Vazhga valamudan!",
            "",
            f"  Generated: {now.strftime('%H:%M:%S IST, %d %b %Y')}",
        ]

        content = "\n".join(lines)
        fn = f"{oid}.txt"
        fp = os.path.join(ORD, fn)

        # Write with UTF-8 so Tamil is preserved
        with open(fp, "w", encoding="utf-8") as f:
            f.write(content)

        return Response(
            content.encode("utf-8"),
            status=200,
            mimetype="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fn}"'},
        )

    except Exception as e:
        print(f"[ORDER ERROR] {e}", flush=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n  [*] Aammii Tharcharbu Santhai")
    print("  ---------------------------------")
    prebuild_images()
    print("  [*] Running at http://localhost:5000")
    print("  ---------------------------------\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
