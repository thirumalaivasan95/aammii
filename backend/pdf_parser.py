"""
pdf_parser.py — Extract product data from a PDF catalogue.

Strategy:
  1. Try pdfplumber to extract text-based tables & paragraphs.
  2. If no products found, fall back to OCR via pytesseract (for scanned PDFs).
  3. Use regex heuristics to find rows that look like:
       CODE  |  Product Name  |  Qty  |  Price

Expected PDF column order (flexible):
  Code   Product Name   Qty/Unit   Price
  A-033  Foxtail Millet  1 kg      195.00
"""

import re, os
from typing import List, Dict, Any

# ── Helpers ───────────────────────────────────────────────────────────────────

# Matches a rupee amount: 195 / 195.00 / 1,195.00
PRICE_RE = re.compile(r"(?:₹\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*$")

# Matches a product code like A-033 / G-049 / P123
CODE_RE  = re.compile(r"^([A-Z]{1,3}-?\d{1,4})\b")

# Quantity/unit patterns: 500gm, 1kg, 200ml, 1 litre, 250 g
QTY_RE   = re.compile(r"\b(\d+(?:\.\d+)?\s*(?:kg|gm|g|ml|l|litre|ltr|pcs?|nos?|pack|sachet|bottle|box|tin))\b",
                       re.IGNORECASE)

# Category keywords to assign categories from product names
CATEGORY_MAP = [
    (re.compile(r"millet|rice|wheat|ragi|barley|oats|grain|flour|rava|sooji|maida", re.I), "Millets & Grains"),
    (re.compile(r"honey|nectar",          re.I), "Honey"),
    (re.compile(r"jaggery|sugar|palm",    re.I), "Sweeteners"),
    (re.compile(r"oil|ghee|butter",       re.I), "Oils & Ghee"),
    (re.compile(r"dal|lentil|pulse|bean|peas", re.I), "Pulses & Dals"),
    (re.compile(r"spice|pepper|turmeric|cumin|coriander|masala|chilli|chili|cardamom|clove|cinnamon|ginger", re.I), "Spices"),
    (re.compile(r"tea|coffee|herbal|drink|juice|kadha", re.I), "Beverages"),
    (re.compile(r"soap|shampoo|hair|skin|lotion|cream|body|face|tooth|dental|hygiene", re.I), "Personal Care"),
    (re.compile(r"snack|biscuit|cookie|chip|namkeen|laddu|halwa|sweet|chocolate", re.I), "Snacks & Sweets"),
    (re.compile(r"salt|rock salt|himalayan",   re.I), "Salt"),
    (re.compile(r"dry fruit|almond|cashew|raisin|fig|date|walnut|pistachio|peanut", re.I), "Dry Fruits & Nuts"),
    (re.compile(r"sauce|chutney|pickle|jam|spread|paste",  re.I), "Condiments"),
    (re.compile(r"seed|flax|chia|sunflower|pumpkin|sesame|ajwain|methi", re.I), "Seeds"),
    (re.compile(r"herb|moringa|tulsi|neem|amla|triphala|ashwagandha|giloy|brahmi", re.I), "Herbs & Supplements"),
    (re.compile(r"soap|detergent|cleaner|wash|dishwash",   re.I), "Home Care"),
    (re.compile(r"mask|incense|agarbatti|camphor|dhoop",   re.I), "Pooja & Wellness"),
]

def _guess_category(name: str) -> str:
    for pattern, cat in CATEGORY_MAP:
        if pattern.search(name):
            return cat
    return "General"

def _clean_price(raw: str) -> float | None:
    raw = raw.replace(",", "").replace("₹", "").strip()
    try:
        return float(raw)
    except ValueError:
        return None

def _parse_line(line: str) -> Dict[str, Any] | None:
    """Try to extract a product from a single line of text."""
    line = line.strip()
    if len(line) < 5:
        return None

    # Skip obvious headers
    low = line.lower()
    if any(h in low for h in ["product", "price", "code", "qty", "sl.no", "s.no", "sr.no",
                                "item", "rate", "amount", "description", "-----", "====="]):
        return None

    # Must end with a price-like number
    m = PRICE_RE.search(line)
    if not m:
        return None
    price_val = _clean_price(m.group(1))
    if price_val is None or price_val <= 0 or price_val > 100000:
        return None

    # Strip the price from the end
    remainder = line[:m.start()].strip().rstrip("|").rstrip()

    # Try to pull out a leading product code
    code = None
    cm = CODE_RE.match(remainder)
    if cm:
        code = cm.group(1)
        remainder = remainder[cm.end():].strip()

    # Try to pull out a trailing quantity unit
    qty_str = ""
    qm = QTY_RE.search(remainder)
    if qm:
        qty_str = qm.group(0).strip()
        remainder = (remainder[:qm.start()] + remainder[qm.end():]).strip()

    # What's left should be the product name
    name = re.sub(r"[|:]+", " ", remainder).strip()
    name = re.sub(r"\s{2,}", " ", name)
    if len(name) < 3:
        return None

    return {
        "name":     name,
        "code":     code or "",
        "qty":      qty_str,
        "price":    price_val,
        "category": _guess_category(name),
    }

# ── pdfplumber extraction ─────────────────────────────────────────────────────

def _extract_with_pdfplumber(pdf_path: str) -> List[str]:
    """Return a flat list of text lines from the PDF."""
    import pdfplumber
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Try tables first
            for table in page.extract_tables():
                for row in table:
                    if row:
                        clean_row = [str(c).strip() if c else "" for c in row]
                        lines.append("  ".join(clean_row))
            # Then raw text
            text = page.extract_text()
            if text:
                lines.extend(text.splitlines())
    return lines

# ── OCR fallback ──────────────────────────────────────────────────────────────

def _extract_with_ocr(pdf_path: str) -> List[str]:
    """Convert each page to an image then OCR it."""
    import pytesseract
    from pdf2image import convert_from_path

    lines = []
    try:
        images = convert_from_path(pdf_path, dpi=200)
    except Exception as e:
        raise RuntimeError(f"pdf2image failed: {e}")

    for img in images:
        text = pytesseract.image_to_string(img, config="--psm 6")
        lines.extend(text.splitlines())
    return lines

# ── Main public function ──────────────────────────────────────────────────────

def parse_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Parse a product catalogue PDF and return a list of product dicts.
    Raises RuntimeError if no products are found.
    """
    lines = []

    # Step 1: pdfplumber
    try:
        lines = _extract_with_pdfplumber(pdf_path)
    except ImportError:
        pass  # pdfplumber not installed → try OCR
    except Exception as e:
        print(f"[pdf_parser] pdfplumber error: {e}")

    products = _lines_to_products(lines)

    # Step 2: OCR fallback
    if not products:
        print("[pdf_parser] Trying OCR fallback…")
        try:
            lines = _extract_with_ocr(pdf_path)
            products = _lines_to_products(lines)
        except ImportError:
            print("[pdf_parser] pytesseract/pdf2image not available.")
        except Exception as e:
            print(f"[pdf_parser] OCR error: {e}")

    # Deduplicate by name
    seen  = set()
    dedup = []
    for p in products:
        key = p["name"].lower()
        if key not in seen:
            seen.add(key)
            dedup.append(p)

    return dedup

def _lines_to_products(lines: List[str]) -> List[Dict[str, Any]]:
    products = []
    for line in lines:
        p = _parse_line(line)
        if p:
            products.append(p)
    return products
