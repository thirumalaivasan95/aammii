# 🌿 Aammii Shop — Mini Amazon Ordering System

A full-stack web app built for Aammii Tharcharbu Santhai Pvt. Ltd.
Upload any product catalogue PDF and get an interactive e-commerce shop instantly.

---

## ✨ Features

| Feature | Details |
|---|---|
| **PDF Upload** | Upload any product catalogue PDF |
| **Auto Extraction** | pdfplumber (text PDFs) + OCR fallback (scanned PDFs) |
| **Product Grid** | Amazon-style cards with generated SVG images |
| **Category Filter** | 20 product categories, chip-based filtering |
| **Search** | Real-time search across name, code, category |
| **Sort** | Price ↑/↓, Name A–Z |
| **Cart** | Add / remove / qty controls, live totals |
| **Order Invoice** | Auto-downloads `.txt` invoice on order placement |
| **Preloaded Data** | 160 Aammii products loaded on first run |

---

## 🚀 Quick Start

### 1. Install Python dependencies

```bash
pip install flask pdfplumber pillow pdf2image pytesseract
```

> Also install Tesseract OCR binary (for scanned PDFs):
> - **Ubuntu/Debian**: `sudo apt install tesseract-ocr`
> - **macOS**: `brew install tesseract`
> - **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki

### 2. Run the server

```bash
# Option A: use the startup script
bash run.sh

# Option B: run directly
cd backend
python3 app.py
```

### 3. Open in browser

```
http://localhost:5000
```

The shop loads with **160 pre-extracted Aammii products** immediately.

---

## 📁 Project Structure

```
project/
├── run.sh                    # Quick-start script
├── backend/
│   ├── app.py                # Flask server + REST API
│   └── pdf_parser.py         # PDF → JSON extractor (table + OCR)
├── frontend/
│   ├── index.html            # Single-page shop UI
│   ├── style.css             # Warm earthy design system
│   └── app.js                # Cart, search, filter, order logic
├── generated_images/         # Auto-generated SVG product images
├── uploads/
│   ├── catalogue.pdf         # Last uploaded PDF (auto-saved)
│   └── products.json         # Cached product list
└── orders/
    └── ORD-XXXXXX.txt        # Generated order invoices
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /` | GET | Serves the frontend |
| `POST /api/upload` | POST | Accepts PDF, returns `{count, products[]}` |
| `GET /api/products` | GET | Returns cached product list |
| `GET /images/<file>` | GET | Serves SVG product images |
| `POST /api/order` | POST | Accepts cart items, returns `.txt` invoice |

### Upload PDF
```bash
curl -F "pdf=@catalogue.pdf" http://localhost:5000/api/upload
```

### Place Order
```bash
curl -X POST http://localhost:5000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Foxtail Millet","qty":2,"price":195.0}]}'
```

---

## 📄 Expected PDF Format

The parser handles:

```
Code    | Product Name         | Qty   | Price
--------|----------------------|-------|-------
A-033   | Foxtail Millet       | 1kg   | 195.00
G-049   | Hill Honey           | 500gm | 399.00
```

Both **text-based** (pdfplumber) and **scanned/image** PDFs (OCR via Tesseract) are supported.

---

## 📋 Sample Invoice Output

```
╔══════════════════════════════════════════════════════╗
║          AAMMII THARCHARBU SANTHAI                   ║
║              Natural Lifestyle Products              ║
╚══════════════════════════════════════════════════════╝

  Order ID  : ORD-A3F9C2
  Date      : 2026-03-12
  Time      : 14:32:07

────────────────────────────────────────────────────────
  Product                          Qty    Price    Total
────────────────────────────────────────────────────────
  Foxtail Millet                     2   ₹195.00  ₹390.00
  Hill Honey                         1   ₹399.00  ₹399.00
  Natural Jaggery                    3    ₹95.00  ₹285.00
────────────────────────────────────────────────────────
  GRAND TOTAL                              ₹1074.00
────────────────────────────────────────────────────────

  Thank you for shopping with Aammii!
  www.aammii.com  |  +91 95006 55548
```

---

## 🎨 Design

- **Aesthetic**: Warm earthy organic marketplace
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Palette**: Deep brown, forest green, warm gold
- **Layout**: Responsive grid, floating cart panel, sticky header

---

*Built for Aammii Tharcharbu Santhai Pvt. Ltd. — Natural Lifestyle Products*
