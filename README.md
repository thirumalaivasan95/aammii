# 🌿 Aammii Natural Shop

A full-stack e-commerce web app built for **Aammii Tharcharbu Santhai Pvt. Ltd.** — upload any product catalogue PDF and get a fully interactive natural products store instantly.

---

## ✨ Features

- **486 preloaded products** across 24 categories, extracted from the official Aammii catalogue
- **PDF upload** — supports text-based, image-based, and scanned PDFs
- **Smart PDF detection** — recognises the Aammii catalogue and loads all products instantly
- **Full-page hero** with animated background orbs, floating category badges, and live stats counter
- **24-card category grid** with emoji icons and hover animations
- **Product grid** with auto-generated SVG images, category badges, and product codes
- **Real-time search** across product name, code, and category
- **Category filter chips** and price/name sorting
- **Shopping cart** with quantity controls, subtotals, and live grand total
- **Order invoice** — auto-downloads a formatted `.txt` invoice on checkout
- **Responsive design** — works on desktop, tablet, and mobile

---

## 🚀 Quick Start

### 1. Install Python dependencies

```bash
pip install flask flask-cors pdfplumber pillow pdf2image pytesseract
```

> For OCR support on scanned PDFs, also install Tesseract:
> - **Ubuntu/Debian:** `sudo apt install tesseract-ocr`
> - **macOS:** `brew install tesseract`
> - **Windows:** [Download from GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### 2. Start the server

```bash
bash run.sh
```

Or start manually:

```bash
cd backend
python3 app.py
```

### 3. Open in browser

```
http://localhost:5000
```

> ⚠️ Always open port **5000** — not 5500 (that's VS Code Live Server). Flask serves both the frontend and the API.

---

## 📁 Project Structure

```
project/
├── run.sh                        # One-command startup script
├── README.md                     # This file
│
├── backend/
│   ├── app.py                    # Flask server + REST API
│   └── pdf_parser.py             # PDF → JSON extractor (text + OCR fallback)
│
├── frontend/
│   ├── index.html                # Full-page shop UI
│   ├── style.css                 # Dark earthy design system
│   └── app.js                    # Cart, search, filter, order logic
│
├── uploads/
│   ├── products.json             # 486 preloaded Aammii products ← required
│   └── catalogue.pdf             # Last uploaded PDF (auto-saved)
│
├── generated_images/             # Auto-generated SVG product images
│
└── orders/
    └── ORD-XXXXXX.txt            # Downloaded order invoices
```

---

## 🗂️ Product Categories (24 total)

| Category | Products | Category | Products |
|---|---|---|---|
| 📚 Books & DVDs | 89 | 🌿 Herbal Powder | 75 |
| 🌸 Personal Care | 37 | 🩺 Healthcare | 34 |
| 🍜 Noodles & Vermicelli | 26 | 🌾 Millets & Grains | 24 |
| 🌱 Seeds | 23 | 🌶 Spices | 22 |
| 🍵 Beverages | 18 | 🧼 Soap | 16 |
| 💊 Health Mix | 14 | 🫙 Oils & Ghee | 14 |
| 🥙 Vadagam & Appalam | 14 | 🍱 Readymade Mix | 14 |
| 🫘 Pulses & Dals | 10 | 🥒 Pickles | 10 |
| ✨ Face Pack | 9 | 🥜 Dry Fruits & Nuts | 9 |
| 🕯 Divine Products | 7 | 🥇 Copper Products | 6 |
| 🍯 Sweeteners | 5 | 🍯 Honey | 4 |
| 🧂 Salt | 3 | 🧘 Wellness Tools | 3 |

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /` | GET | Serves the frontend |
| `POST /api/upload` | POST | Accepts PDF, returns product list |
| `GET /api/products` | GET | Returns cached/preloaded product list |
| `GET /images/<file>` | GET | Serves SVG product images |
| `POST /api/order` | POST | Accepts cart, returns `.txt` invoice |

### Upload a PDF

```bash
curl -F "pdf=@catalogue.pdf" http://localhost:5000/api/upload
```

**Response:**
```json
{
  "count": 486,
  "source": "preloaded",
  "note": "Aammii catalogue recognised — 486 products loaded!",
  "products": [...]
}
```

### Place an Order

```bash
curl -X POST http://localhost:5000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Foxtail Millet","qty":2,"price":195.0}]}'
```

---

## 📋 Sample Invoice

```
╔════════════════════════════════════════════════════════════╗
║                  AAMMII THARCHARBU SANTHAI                 ║
║                      Natural Lifestyle Products            ║
║              www.aammii.com  |  +91 95006 55548            ║
╚════════════════════════════════════════════════════════════╝

  Order ID  : ORD-A3F9C2
  Date      : 2026-03-14
  Time      : 14:32:07

────────────────────────────────────────────────────────────
  Product                            Qty     Price     Total
────────────────────────────────────────────────────────────
  Foxtail Millet                       2   ₹195.00   ₹390.00
  Hill Honey                           1   ₹399.00   ₹399.00
  Beetroot Malt                        1   ₹240.00   ₹240.00
────────────────────────────────────────────────────────────
  GRAND TOTAL                                       ₹1029.00
────────────────────────────────────────────────────────────

  Thank you for choosing Aammii Natural Products!
```

---

## 🎨 Design

- **Aesthetic:** Dark earthy organic marketplace with warm gold accents
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Palette:** Deep brown, forest green, warm gold, cream
- **Hero:** Full-viewport with animated gradient orbs, floating category pills, live product count
- **Cards:** Colour-coded SVG images per category, hover lift effects
- **Cart:** Slide-in panel with quantity controls and real-time totals

---

## 🛠️ How PDF Upload Works

The app uses a three-layer strategy:

1. **pdfplumber** — tries to extract structured text tables from the PDF
2. **OCR fallback** — if no text is found, converts pages to images and uses Tesseract
3. **Smart preload** — if the PDF is the Aammii catalogue (detected by keywords), the 486-product preloaded database is served instantly, bypassing parsing entirely

This means the app works reliably even with image-heavy or bilingual Tamil+English PDFs that standard parsers cannot read.

---

## 📞 Contact

**Aammii Tharcharbu Santhai Private Limited**
No.49, Thirupathy Nagar, Near Perumal Temple, Kovaipudur, Coimbatore – 641 042. Tamil Nadu. INDIA.

📞 +91 95006 55548 · 📧 aammiisanthai@gmail.com · 🌐 www.aammii.com

---

*Built with Flask · pdfplumber · Python · Vanilla JS*
