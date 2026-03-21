# 🌿 Aammii Natural Shop — Production v5.0

**Full-stack e-commerce site for Aammii Tharcharbu Santhai Pvt. Ltd.**
Apple-quality design × Amazon structure × Heritage botanical aesthetic × Live payment portal.

---

## ✨ What's New in v5.0

- **486 preloaded products** across 24 categories, extracted from the official Aammii catalogue
- **PDF upload** — supports text-based, image-based, and scanned PDFs
- **Smart PDF detection** — recognises the Aammii catalogue and loads all products instantly
- **🌙 Dark mode** — one-click toggle in the header; respects your OS preference automatically; choice is remembered across sessions
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

```bash
# 1. Place your products.json in uploads/
cp path/to/products.json uploads/products.json

# 2. Set Razorpay keys (get from https://razorpay.com)
export RAZORPAY_KEY_ID="rzp_live_XXXXXXXXXXXXXXXX"
export RAZORPAY_KEY_SECRET="your_secret_here"

# 3. Run
bash run.sh
```

Open: **http://localhost:5000**

---

## 🌙 Dark Mode

Click the **🌙 / ☀️** button in the top-right of the header to switch between light and dark themes.

- **Auto-detect** — on first visit the theme matches your OS/system preference (`prefers-color-scheme`)
- **Persistent** — your choice is saved to `localStorage` and remembered across sessions
- **Instant** — theme is applied before the page renders to avoid a flash of the wrong mode
- The hero section is always dark by design; dark mode applies to the category grid, product cards, filter bar, and cart panel

---

## 📁 Project Structure

```
aammii-shop/
├── run.sh                    # One-command startup
├── aammii.db                 # SQLite DB (auto-created)
│
├── backend/
│   ├── app.py                # Flask app · all API routes
│   ├── database.py           # Schema · seed · helpers
│   ├── config.py             # Keys · paths · settings
│   └── admin.py              # CLI admin tool
│
├── frontend/
│   ├── index.html                # Full-page shop UI
│   ├── style.css                 # Dark earthy design system + dark mode
│   └── app.js                    # Cart, search, filter, order, dark-mode logic
│
├── uploads/
│   └── products.json         # Seed data (486 products)
│
├── generated_images/         # Auto-generated SVG product images
└── orders/                   # (legacy text invoices, kept for compat)
```

---

## 💳 Payment Setup (Razorpay)

1. Sign up at **https://razorpay.com** (free)
2. Go to **Settings → API Keys → Generate Test Key**
3. Set environment variables:

```bash
export RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXXXXXXXX"
export RAZORPAY_KEY_SECRET="your_secret_here"
```

4. For **live payments**, use `rzp_live_...` keys

**Supported payment methods (automatic):**
- 📱 UPI (GPay, PhonePe, BHIM, Paytm)
- 💳 Credit / Debit cards (Visa, Mastercard, Amex, RuPay)
- 🏦 Net Banking (all major banks)
- 👛 Wallets (Amazon Pay, Mobikwik, FreeCharge)

---

## 🛠️ Admin CLI

```bash
cd backend

# Overview stats
python3 admin.py stats

# List all products
python3 admin.py list-products

# List out-of-stock products
python3 admin.py list-products --oos

# List products in a category
python3 admin.py list-products --category="Millets & Grains"

# Update stock (use 999 for unlimited)
python3 admin.py set-stock <product_id> 50
python3 admin.py set-stock <product_id> 0     # → out of stock

# Mark as new launch
python3 admin.py set-new-launch <product_id> 1
python3 admin.py set-new-launch <product_id> 0

# Add a new product (interactive)
python3 admin.py add-product

# View orders
python3 admin.py list-orders
python3 admin.py list-orders --status=placed
```

---

## 🔌 REST API

### Products

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/products` | GET | Paginated list. Params: `category`, `q`, `sort`, `page`, `limit`, `new_launch`, `in_stock` |
| `GET /api/products/new-launches` | GET | Up to 12 new-launch products |
| `GET /api/products/<id>` | GET | Single product detail |
| `POST /api/admin/products` | POST | Add product (needs `X-Admin-Key` header) |
| `PATCH /api/admin/products/<id>` | PATCH | Update product fields |
| `PATCH /api/admin/products/<id>/stock` | PATCH | Quick stock update |

### Payment & Orders

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/payment/create-order` | POST | Creates Razorpay order, returns checkout params |
| `POST /api/payment/verify` | POST | Verifies signature, saves order to DB |
| `POST /api/payment/cod` | POST | Cash-on-delivery order (no payment verification) |
| `GET /api/orders/<order_number>` | GET | Order detail + items |

---

## 📦 Adding Products

### Option A — Edit products.json and re-seed
1. Edit `uploads/products.json`
2. Delete `aammii.db`
3. Restart the server (DB will be re-seeded)

### Option B — CLI
```bash
cd backend
python3 admin.py add-product
```

### Option C — REST API
```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: aammii-secret-change-in-prod-2024" \
  -d '{
    "name": "Organic Moringa Powder",
    "code": "HB-099",
    "category": "Herbal Powder",
    "price": 280,
    "qty_unit": "100g",
    "stock_quantity": 200,
    "is_new_launch": 1
  }'
```

---

## 🎨 Design System

- **Palette (Light):** Warm cream `#FAF6EE` · Forest green `#2B5E3C` · Amber `#C47A22`
- **Palette (Dark):** Charcoal `#100E0A` · Forest `#4A8C5E` · Amber `#D4923C`
- **Display font:** Fraunces (variable serif — retro, elegant)
- **Body font:** Sora (clean modern sans)
- **Texture:** Subtle paper grain overlay via SVG filter
- **Structure:** Sticky header → New Launches → Marquee → Category grid → Product grid with sidebar filters → Cart drawer → Checkout modal

---

## 🌐 Production Deployment

- **Aesthetic:** Dark earthy organic marketplace with warm gold accents
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Palette:** Deep brown, forest green, warm gold, cream
- **Dark mode:** Deep charcoal backgrounds (`#141010`) with warm card surfaces (`#231d18`) — same gold and green accents, higher shadow contrast
- **Hero:** Full-viewport with animated gradient orbs, floating category pills, live product count
- **Cards:** Colour-coded SVG images per category, hover lift effects
- **Cart:** Slide-in panel with quantity controls and real-time totals

```bash
# Install nginx + gunicorn
pip install gunicorn

# Run with gunicorn
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# nginx reverse proxy config
# (point localhost:80 → localhost:5000)
```

### Environment Variables

```bash
SECRET_KEY=your-long-random-secret
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_secret_here
DEBUG=false
```

> ⚠️ Razorpay requires **HTTPS** for live payments. Use nginx + Let's Encrypt (certbot) to set up SSL.

---

## 📞 Contact

**Aammii Tharcharbu Santhai Private Limited**
No.49, Thirupathy Nagar, Near Perumal Temple, Kovaipudur, Coimbatore – 641 042. TN.
📞 +91 95006 55548 · ✉️ aammiisanthai@gmail.com · 🌐 www.aammii.com

---

*Built with Flask · pdfplumber · Python · Vanilla JS*
