# 🌿 Aammii Tharcharbu Santhai — Business Operations Guide

**Your natural-products e-commerce store. Deployable in 5 minutes. Runnable as a real business from day one.**

---

## Table of contents

1. [Get started in 5 minutes](#1-get-started-in-5-minutes)
2. [What's included (the pages)](#2-whats-included-the-pages)
3. [Day-to-day: running the business](#3-day-to-day-running-the-business)
4. [Managing your product catalogue](#4-managing-your-product-catalogue)
5. [Handling orders & invoices](#5-handling-orders--invoices)
6. [Enabling Firebase login](#6-enabling-firebase-login)
7. [Going live on the internet](#7-going-live-on-the-internet)
8. [Accepting real payments](#8-accepting-real-payments)
9. [Customising look & text](#9-customising-look--text)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Get started in 5 minutes

### You need
- **Windows**, **macOS**, or **Linux**
- **Python 3.8+** installed from <https://python.org> (tick _"Add Python to PATH"_ on Windows)
- About 200 MB free disk space
- An internet connection on first run (to install libraries)

### Run it

**Windows**
```
Double-click run.bat
```

**macOS / Linux**
```
./run.sh
```

That's it. The script will:
1. Auto-detect Python
2. Install Flask, CORS, pdfplumber, Pillow, reportlab
3. Create `uploads/`, `generated_images/`, `orders/` folders
4. Start the backend on http://localhost:5000
5. Auto-open your browser

Once you see **`Open in browser → http://localhost:5000`**, you're live.

---

## 2. What's included (the pages)

Your store comes with **12 distinct, professional pages**:

| Page | URL | What it does |
|------|-----|-------------|
| **Home** | `#/` | Hero, featured categories, new arrivals, bestsellers, testimonials |
| **Browse** | `#/browse` | Full catalogue with search, filters, sort |
| **Category** | `#/category/<name>` | Filtered by category (e.g. Millets) |
| **Product** | `#/product/<id>` | Detail page: gallery, description, related items |
| **Cart** | `#/cart` | Full cart with qty controls, promo codes, totals |
| **Checkout** | `#/checkout` | Address form, payment options, order review |
| **Order Confirmed** | `#/order-placed/<id>` | Thank-you page + PDF invoice download |
| **Orders** | `#/orders` | Order history with status tracking |
| **Order Detail** | `#/order/<id>` | Single order view |
| **Account** | `#/account` | Profile, preferences |
| **Admin** | `#/admin` | PDF upload, catalogue stats, image replacement |
| **About** | `#/about` | Your story |
| **Contact** | `#/contact` | Phone, WhatsApp, email, contact form |

---

## 3. Day-to-day: running the business

### Your daily routine

**Morning (5 minutes)**
1. Start the server (double-click `run.bat` or `./run.sh`)
2. Go to `#/orders` — see all overnight orders
3. Open each order → call customer to confirm → mark it packed

**During the day**
- Take orders (website + phone + WhatsApp)
- Keep updating the catalogue as stock changes (see _Managing products_ below)
- Print the PDF invoice for each order and pack it with the shipment

**Evening**
- Review what sold → note what to restock tomorrow
- Update prices if needed (re-upload PDF)

### Where your data lives
```
aammii/
├── uploads/products.json     ← your catalogue (450 products)
├── orders/orders.json        ← every order placed
├── orders/ORD-XXXX.pdf       ← saved copy of each invoice
└── generated_images/         ← product images (SVG placeholders + your JPG uploads)
```
Back these folders up weekly. That's your entire business record.

---

## 4. Managing your product catalogue

### Option A: Upload a PDF price list (recommended)

1. Open `#/admin`
2. Click **"Choose PDF File"**, pick your supplier's price list
3. Wait 5–15 seconds — the system extracts products, codes, categories, prices
4. Done. Your store instantly shows the new catalogue.

The PDF parser handles **text PDFs** out of the box. For **scanned/image PDFs**, install Tesseract OCR:
- Windows: <https://github.com/UB-Mannheim/tesseract/wiki>
- macOS: `brew install tesseract`
- Linux: `sudo apt install tesseract-ocr`

### Option B: Edit `products.json` directly

File: `uploads/products.json`

```json
[
  {
    "code": "A-033",
    "id":   "A-033",
    "name": "வீட்டு கடலை எண்ணெய் / Home Groundnut Oil",
    "category": "Oils & Ghee",
    "price": 250,
    "qty":   "500 ml",
    "date_added": "2026-04-20"
  }
]
```

Tamil name first, then ` / `, then English. Categories should match the 25 built-in ones (see `CAT_META` in `app.js`) for the best icons — but anything works.

### Replacing placeholder images with real photos

1. Take a good photo of your product (500–1000 px wide, 4:3 aspect ratio)
2. Name it **`<product-code>.jpg`** (e.g. `A-033.jpg`)
3. Drop it into `generated_images/`
4. Refresh the page — real photo replaces SVG automatically

The backend serves in this order: **.jpg → .jpeg → .png → .webp → .svg**. No code changes needed.

---

## 5. Handling orders & invoices

### When a customer places an order
1. It instantly appears in `#/orders` (and in `orders/orders.json` on disk)
2. A **PDF invoice** is generated (using reportlab, with real selectable Tamil + English text)
3. The PDF is:
   - Downloaded automatically to the customer's device
   - Saved to `orders/ORD-XXXXXXXX.pdf` on your server
4. The customer gets a big green "Order Confirmed" page with their order ID

### Your process
1. Click the order in `#/orders`
2. Call the phone number shown — confirm address, delivery time
3. Open the PDF, print it, tape to the package
4. Deliver / dispatch

### The PDF invoice includes
- Your branded green header (Aammii + Tamil Nadu tagline)
- Order ID, date, time (IST)
- Customer name, phone, email, full address
- Product table: code, Tamil name, English name, qty, unit price, total
- Subtotal, shipping, GST (5%), grand total
- Payment options (UPI, Bank, COD)
- Tamil thank-you: _"நன்றி! வாழ்க வளமுடன்!"_
- All text is **real selectable text** — customers can copy & paste from it

### Order statuses
Currently the status is just `"confirmed"`. To mark orders as `packed`, `shipped`, `delivered`, edit `orders/orders.json` — the UI auto-updates on reload.

---

## 6. Enabling Firebase login

Authentication is optional but recommended — it lets you:
- Remember customer names & addresses
- Show order history per customer
- Build a mailing list

### Quick setup
1. Create a project at <https://console.firebase.google.com>
2. **Authentication → Sign-in method**: enable Email, Google, GitHub, Phone
3. **Project settings → Your apps → Web app → </> icon**: copy the config
4. Paste into `frontend/firebase-config.js`:

```javascript
window.firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  // ... rest of the snippet
};
window.FIREBASE_READY = true;
```

5. Refresh the site. Click the **👤 Sign in** button. Done.

Firebase keys in `firebase-config.js` are safe to commit — they're designed to be public. The security comes from Firebase's rules, not from hiding the keys.

---

## 7. Going live on the internet

### Fastest: Render.com (recommended for starters)

1. Push your code to GitHub
2. Sign up at <https://render.com>
3. **New → Web Service** → connect your GitHub repo
4. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn app:app`
   - **Environment**: Python 3
5. Add `requirements.txt` at the project root:
   ```
   flask
   flask-cors
   pdfplumber
   pillow
   reportlab
   gunicorn
   ```
6. Deploy. Your site is live at `https://your-app.onrender.com`

### Alternative: PythonAnywhere, Railway, Fly.io, or your own VPS

All work identically. You just need Python 3 + those 5 libraries. The SQLite-free design means **no database setup needed** — just a writable disk.

### Your own domain
1. Buy a domain (e.g. GoDaddy, Namecheap): ~₹800/year
2. In your hosting dashboard, add a **Custom Domain**
3. Update the DNS records as instructed
4. After ~1 hour, `aammii.com` points to your site

---

## 8. Accepting real payments

Right now checkout captures **COD, UPI, Card, Net Banking** as preferences — the actual payment is arranged on delivery. To accept **live payments online**, integrate one of these:

### Razorpay (India – easiest)
1. Sign up at <https://razorpay.com>, get API keys
2. In `backend/app.py`, add (after `CORS(...)`):
   ```python
   import razorpay
   razor = razorpay.Client(auth=("rzp_test_XXX", "secret_XXX"))
   ```
3. Add a new route:
   ```python
   @app.route("/api/razorpay-order", methods=["POST"])
   def rzp():
       d = request.json
       amt = int(d["amount"] * 100)  # paise
       return jsonify(razor.order.create({"amount": amt, "currency": "INR"}))
   ```
4. In the frontend checkout, launch the Razorpay UI when user picks "Card / UPI" (10 lines of JS — see Razorpay docs)

### Stripe (international)
Similar, but use `stripe` Python SDK and `@stripe/stripe-js`.

### Cash on Delivery (no integration needed)
Already works. Your delivery person collects cash. Most authentic local Tamil businesses still run 80% COD — don't feel pressured to force prepaid.

---

## 9. Customising look & text

### Brand colors
Edit the CSS variables at the top of `frontend/style.css`:
```css
:root {
  --forest:  #14532D;   /* main brand green */
  --amber:   #D97706;   /* accent orange */
  --gold:    #FBBF24;   /* highlights */
}
```
Every button, header, and card updates instantly.

### Logo
Replace `frontend/logo.svg` with your own SVG logo (keeps it crisp at any size).

### Home page copy
Edit `renderHome()` in `frontend/app.js`. Every headline, testimonial, and section title is right there — plain HTML inside JavaScript template strings.

### Contact info
Search for `+91 95006 55548` and `orders@aammii.com` across:
- `frontend/index.html` (footer, announcement bar)
- `frontend/app.js` (contact page)
- `backend/app.py` (PDF invoice)

Replace with your actual numbers.

### Announcement bar
The rotating banner at the very top (Free delivery, promo code, etc.) lives in `index.html` around `class="announce"`. Edit those spans directly.

---

## 10. Troubleshooting

### "Python not found"
Install Python from <https://python.org>. **On the first screen, tick "Add Python to PATH"** — this is the #1 cause of this error.

### "Cannot reach server"
The Flask backend isn't running. Open a terminal, go to the project folder, and run `run.bat` (Windows) or `./run.sh` (Mac/Linux).

### PDF invoice downloads as `.txt` instead of `.pdf`
Reportlab didn't install. Run manually:
```
pip install reportlab
```
Then restart the server.

### Tamil text in PDF shows as boxes/rectangles
No Tamil font is installed on the system. Fix:
- **Windows**: already has `NirmalaUI.ttf` — should work automatically
- **macOS**: already has `Tamil MN` — works automatically
- **Linux**: `sudo apt install fonts-noto-tamil`
- **Docker/server**: add `apt-get install fonts-noto-tamil` to your Dockerfile

Text remains copy-pasteable either way (the PDF holds real text, not images).

### "Firebase not configured"
You haven't edited `frontend/firebase-config.js`. The site works fine without it — you just won't have login. See section 6 to set it up.

### Products not showing
Check `uploads/products.json` exists and is valid JSON. If the file got corrupted, the site loads empty. Re-upload a PDF via `#/admin` to rebuild it.

### PDF upload fails
Two possible reasons:
1. **Not a text PDF**: Install Tesseract for OCR support (see section 4)
2. **No tables detected**: The PDF layout is unusual — edit `backend/pdf_parser.py` to match your format, or edit `uploads/products.json` directly

### Site styling looks broken
Hard-refresh with `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) to clear cached old CSS.

---

## Final thoughts

This site is **built for you to own and customise**. No framework updates to chase, no build tools to break, no monthly hosting fees if you don't need them. Flask + vanilla JS means _if you can read English, you can change the site_.

Three suggestions as you scale:
1. **Take your own product photos** — replacing the SVGs with real pictures doubles conversion instantly. Phone camera + good light + white background is enough.
2. **Collect real reviews** — the star ratings are placeholders. Set up a Google Form after delivery and paste the genuine reviews into the testimonials section.
3. **Start a WhatsApp broadcast list** — it's worth more than any ad spend. Your site already has the WhatsApp link in the contact page.

**Your traditional Tamil grandmother's kitchen, distributed at internet scale. Go make it real.** 🌿

— _வாழ்க வளமுடன்!_
