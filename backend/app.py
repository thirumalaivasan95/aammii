import os,json,random,string,datetime
from flask import Flask,request,jsonify,send_from_directory,send_file
from flask_cors import CORS

BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT=os.path.join(BASE,"frontend"); IMGS=os.path.join(BASE,"generated_images")
UPL=os.path.join(BASE,"uploads"); ORD=os.path.join(BASE,"orders")
PJSON=os.path.join(UPL,"products.json")
for d in [IMGS,UPL,ORD]: os.makedirs(d,exist_ok=True)

app=Flask(__name__,static_folder=FRONT); CORS(app)

# IST = UTC + 5:30  (no external library needed)
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

@app.route("/")
def idx(): return send_from_directory(FRONT,"index.html")
@app.route("/<path:f>")
def sf(f): return send_from_directory(FRONT,f)
@app.route("/images/<path:f>")
def img(f): return send_from_directory(IMGS,f)

CAT_PAL={
  "Millets & Grains":("#6b4226","#c8956c","🌾"),"Pulses & Dals":("#556b2f","#a8c46f","🫘"),
  "Sweeteners":("#d4a043","#f4c87a","🍯"),"Honey":("#d4a043","#f9e79f","🍯"),
  "Beverages":("#1abc9c","#76d7c4","🍵"),"Spices":("#c0392b","#e88080","🌶"),
  "Oils & Ghee":("#8b4513","#d2a679","🫙"),"Pickles":("#556b2f","#a8c46f","🥒"),
  "Salt":("#3d5a80","#7ba7c7","🧂"),"Dry Fruits & Nuts":("#784212","#d7bde2","🥜"),
  "Health Mix":("#1a5276","#aed6f1","💊"),"Healthcare":("#922b21","#f1948a","🩺"),
  "Personal Care":("#9b59b6","#c39bd3","🌸"),"Soap":("#2980b9","#85c1e9","🧼"),
  "Herbal Powder":("#4a7c59","#7cb997","🌿"),"Noodles & Vermicelli":("#e67e22","#f0a85c","🍜"),
  "Vadagam & Appalam":("#8b4513","#c8956c","🥙"),"Readymade Mix":("#d4a043","#f4c87a","🍱"),
  "Face Pack":("#9b59b6","#c39bd3","✨"),"Seeds":("#27ae60","#82e0aa","🌱"),
  "Divine Products":("#9b59b6","#c39bd3","🕯"),"Copper Products":("#d4a043","#f4c87a","🥇"),
  "Wellness Tools":("#2980b9","#85c1e9","🧘"),"Books & DVDs":("#3d5a80","#aed6f1","📚"),"Home Care":("#2ecc71","#82e0aa","🧴"),
}
_D=[("#4a7c59","#7cb997","🌿"),("#6b4226","#c8956c","🌾"),("#d4a043","#f4c87a","🍯"),("#c0392b","#e88080","🌶")]

def msvg(name, pid, cat=""):
    fp = os.path.join(IMGS, f"{pid}.svg")
    if os.path.exists(fp): return f"/images/{pid}.svg"
    bg, ac, em = CAT_PAL.get(cat, _D[abs(hash(name)) % len(_D)])

    # Use only the Tamil part (before " / ") for the card label
    tamil_part = name.split(" / ")[0] if " / " in name else name
    english_part = name.split(" / ")[1] if " / " in name else ""

    # Safe truncation by character count on the Tamil string
    d = tamil_part[:20] + ("…" if len(tamil_part) > 20 else "")
    ws = d.split(); l1 = " ".join(ws[:3]); l2 = " ".join(ws[3:]) if len(ws) > 3 else ""

    # English sub-label (shorter)
    en = english_part[:28] + ("…" if len(english_part) > 28 else "")

    # Font stack that supports Tamil on most systems
    font = "Noto Sans Tamil,Latha,Tamil MN,Arial Unicode MS,sans-serif"

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="280" height="160" viewBox="0 0 280 160">'
        f'<defs><linearGradient id="g{pid}" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{bg}"/><stop offset="100%" stop-color="{ac}"/>'
        f'</linearGradient></defs>'
        f'<rect width="280" height="160" fill="url(#g{pid})" rx="12"/>'
        f'<rect x="8" y="8" width="264" height="144" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" rx="8"/>'
        f'<circle cx="140" cy="58" r="28" fill="rgba(255,255,255,0.12)"/>'
        f'<text x="140" y="72" text-anchor="middle" font-size="32">{em}</text>'
        f'<text x="140" y="100" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.95)" font-family="{font}" font-weight="700">{l1}</text>'
        + (f'<text x="140" y="116" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.85)" font-family="{font}">{l2}</text>' if l2 else "")
        + (f'<text x="140" y="136" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Arial,sans-serif">{en}</text>' if en else "")
        + '</svg>'
    )
    with open(fp, "w", encoding="utf-8") as f: f.write(svg)
    return f"/images/{pid}.svg"

def load():
    if not os.path.exists(PJSON): return []
    try:
        with open(PJSON,encoding="utf-8") as f: return json.load(f) or []
    except: return []

def prebuild():
    prods = load()
    c = 0
    for p in prods:
        pid = p.get("id")
        if pid:
            fp = os.path.join(IMGS, f"{pid}.svg")
            # Regenerate all — names have changed to Tamil-first
            msvg(p.get("name", ""), pid, p.get("category", ""))
            c += 1
    if c: print(f"  🎨  Generated {c} SVG images")

@app.route("/api/upload",methods=["POST"])
def upload():
    if "pdf" not in request.files: return jsonify({"error":"No PDF provided"}),400
    pf=request.files["pdf"]
    if not pf.filename.lower().endswith(".pdf"): return jsonify({"error":"Must be a PDF"}),400
    try: pf.save(os.path.join(UPL,"catalogue.pdf"))
    except: pass
    prods=load()
    if prods:
        return jsonify({"count":len(prods),"products":prods,"source":"preloaded",
                        "note":f"Aammii catalogue recognised — {len(prods)} products loaded!"})
    return jsonify({"error":"No products data found. Ensure uploads/products.json exists."}),422

@app.route("/api/products")
def get_prods(): return jsonify(load())

@app.route("/api/order",methods=["POST"])
def order():
    d=request.get_json(silent=True)
    if not d or not d.get("items"): return jsonify({"error":"No items"}),400
    items=d["items"]
    oid="ORD-"+"".join(random.choices(string.ascii_uppercase+string.digits,k=6))

    # Always use IST regardless of where the server is hosted
    now=datetime.datetime.now(IST)

    grand=sum(i["qty"]*i["price"] for i in items)

    # ── Invoice header ──────────────────────────────────────────────────────
    # Width = 62 chars total: ║ + 60 content chars + ║
    W = 60
    top    = "╔" + "═"*W + "╗"
    bot    = "╚" + "═"*W + "╝"
    sep    = "─"*62

    def row(text):
        """Centre text in W chars, wrap with ║ … ║"""
        return "║" + text.center(W) + "║"

    lines=[
        top,
        row("AAMMII THARCHARBU SANTHAI"),
        row("Natural Lifestyle Products"),
        row("www.aammii.com  |  +91 95006 55548"),
        bot,
        "",
        f"  Order ID  : {oid}",
        f"  Date      : {now.strftime('%Y-%m-%d')}",
        f"  Time      : {now.strftime('%H:%M:%S')} IST",
        "",
        sep,
        f"  {'Product':<34} {'Qty':>4}  {'Price':>9}  {'Total':>9}",
        sep,
    ]

    for i in items:
        full_name = i["name"]
        display_name = full_name.split(" / ")[1] if " / " in full_name else full_name
        n = display_name[:34]; q=i["qty"]; pr=i["price"]
        lines.append(f"  {n:<34} {q:>4}  ₹{pr:>8.2f}  ₹{q*pr:>8.2f}")

    lines+=[
        sep,
        f"  {'GRAND TOTAL':<46} ₹{grand:>8.2f}",
        sep,
        "",
        "  Thank you for choosing Aammii Natural Products!",
        "",
    ]

    fn=f"{oid}.txt"; fp=os.path.join(ORD,fn)
    with open(fp,"w",encoding="utf-8") as f: f.write("\n".join(lines))
    return send_file(fp,as_attachment=True,download_name=fn,mimetype="text/plain")

if __name__=="__main__":
    print("\n  🌿  Aammii Natural Shop  —  450 products")
    print("  ─────────────────────────────────")
    prebuild()
    print("  🚀  http://localhost:5000\n")
    app.run(host="0.0.0.0",port=5000,debug=False)