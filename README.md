# Aammii Tharcharbu Santhai — E-Commerce Site

Full-stack store for **Aammii Tharcharbu Santhai Pvt. Ltd.** — natural farm-direct
products from Tamil Nadu. Flask backend + vanilla-JS hash-router SPA. **No build
step, no Node toolchain, no database server.** Double-click and ship.

---

## What it does

- **Storefront** — 12-page SPA: Home, Browse, Category, Product, Cart, Checkout,
  Orders, Order Detail, Account, Admin, About, Contact.
- **Catalogue** — 450+ products in [uploads/products.json](uploads/products.json),
  Tamil + English names, 25 categories.
- **Search** — predictive, typo-tolerant, **Tamil-aware**: typing `samai` /
  `saamai` / `noodles` finds `சாமை நூடல்ஸ்`. Browse and the header dropdown
  share the same scoring logic.
- **PDF invoices** — generated server-side with `reportlab`, real selectable
  Tamil + English text, embedded brand logo, GST breakdown (CGST/SGST per HSN
  code), saved per order under `orders/`.
- **Auth** — optional Firebase login (email, Google, GitHub, phone OTP).
- **Theming** — light + dark mode, persistent.
- **Admin** — `#/admin` for PDF catalogue upload, image URL management, mark
  products as new.

---

## Quick start

**Windows** — double-click [run.bat](run.bat). It auto-installs deps and opens
the browser.

**macOS / Linux**
```bash
pip install flask flask-cors pdfplumber pillow reportlab
python3 backend/app.py
```

Open http://localhost:5000.

---

## Project structure

```
aammii/
├── run.bat                       # Windows: double-click to start
├── README.md                     # this file
├── BUSINESS_GUIDE.md             # operations / customisation guide
├── netlify.toml                  # static-frontend deploy config
│
├── backend/
│   ├── app.py                    # Flask app · all API routes · PDF invoice
│   ├── admin.py                  # CLI admin tool
│   ├── pdf_parser.py             # extract products from supplier PDFs
│   ├── config.py                 # paths · settings
│   ├── database.py               # legacy SQLite helpers (unused by app.py)
│   └── requirements.txt          # flask · flask-cors · gunicorn
│
├── frontend/
│   ├── index.html                # SPA shell (header / footer / view)
│   ├── app.js                    # router · pages · cart · search
│   ├── auth.js                   # Firebase compat SDK wrapper
│   ├── firebase-config.js        # Firebase keys (client-safe)
│   ├── logo.svg                  # brand logo (rendered in PDF too)
│   └── css/                      # modular stylesheets — see below
│       ├── tokens.css            # design variables · base reset · scrollbar
│       ├── layout.css            # announce · nav · mobile-nav · view
│       ├── home.css              # hero · sections · tiles · product card
│       ├── pages.css             # browse · product · cart · checkout · orders · admin · about
│       ├── chrome.css            # auth modal · cart drawer · toast · footer · search
│       └── responsive.css        # breakpoints + print
│
├── uploads/
│   └── products.json             # product catalogue (450+ items)
│
└── orders/
    ├── orders.json               # all orders (newest first, capped at 500)
    └── INV-XXXXX.pdf             # one invoice file per order
```

### Why modular CSS?

The earlier codebase shipped two files: `style.css` and `styles-new.css`.
`styles-new.css` was a leftover from an older design system — it referenced
variables (`--earth1`, `--gold-light`, `--brand-green`) and class names
(`.tamil-name`, `.user-menu`, `.new-card`) that no longer exist anywhere in
the JS, and it was never linked from `index.html`. It has been deleted.

`style.css` (1,604 lines) was sliced into six topic-focused files in
[frontend/css/](frontend/css/) above. The split is byte-equivalent to the
original (whitespace-normalised) — cascade order is preserved by loading
the files in a fixed sequence in `index.html`. Edit one concern at a time
without scrolling through unrelated rules.

---

## REST API

All routes are JSON; static frontend at `/`.

| Endpoint                          | Method | Description |
|-----------------------------------|--------|-------------|
| `GET  /api/products`              | GET    | All products (with computed `hsn` + `gst_rate`) |
| `PATCH /api/products/<id>`        | PATCH  | Update `image` URL · `hsn` · `gst_rate` · `name` · `qty` · `price` · `category` |
| `POST /api/upload`                | POST   | Upload a supplier PDF; parsed products replace the catalogue |
| `POST /api/mark-new`              | POST   | Mark product IDs as newly added (sets `date_added` to today) |
| `POST /api/order`                 | POST   | Place an order — returns the PDF invoice as the response body |
| `GET  /api/orders`                | GET    | All orders, newest first (capped at 500) |
| `GET  /api/orders/<id>`           | GET    | Single order by `id` (e.g. `ORD-XXXX`) or `invoice_no` |

`POST /api/order` request body:
```json
{
  "items":    [{"code":"FD-017","name":"...","price":80,"qty":2,"category":"Noodles & Vermicelli"}],
  "customer": {"name":"...","phone":"...","email":"...","address":"..."},
  "payment":  "COD"
}
```
Response: `Content-Type: application/pdf`, headers `X-Order-Id` + `X-Invoice-No`
expose the assigned IDs.

---

## Search — how it works

User types in the header search → [_scoreProduct](frontend/app.js) is called
per product with the normalised query. Sources mixed into the haystack:

1. Product name (Tamil + English)
2. Category
3. Code (e.g. `FD-017`)
4. **Roman transliteration of the Tamil portion** — `சாமை நூடல்ஸ்` → `saamai nuutals`

Matching is then run twice: strict (`samai` ↔ `samai`) and **vowel-collapsed**
(`saamai` ↔ `samai` after `aa` → `a`). Levenshtein edit distance covers
typos. Same scorer powers both the dropdown and the Browse-page filter.

To extend the transliterator, edit `_TA_VOWELS` / `_TA_SIGNS` / `_TA_CONS`
in `frontend/app.js` near the search section.

---

## Storage model

No database server. Everything is on disk:

- `uploads/products.json` — catalogue. Mutate via `/api/products/<id>` PATCH or edit the file directly.
- `orders/orders.json` — order log. Capped at 500; oldest entries roll off.
- `orders/INV-XXXXX.pdf` — one file per placed order, kept indefinitely.
- `aammii.db` — only present if you ran the legacy `database.py` seed; the live `app.py` does **not** read it.

Back up `uploads/` and `orders/` weekly. That is the entire business record.

---

## Deployment

### Render.com (recommended)

1. Push to GitHub.
2. New → Web Service → connect repo.
3. **Build:** `pip install flask flask-cors pdfplumber pillow reportlab gunicorn`
4. **Start:** `cd backend && gunicorn app:app`

For Linux servers, install a Tamil font: `apt install fonts-noto-tamil`,
otherwise the PDF Tamil text falls back to the Helvetica box glyph (English
parts are unaffected).

### Custom domain

Buy domain → in Render add Custom Domain → update DNS as instructed → done in ~1 hour.

### Live online payments

Out of the box, checkout records the customer's preferred payment method
(COD / UPI / Card / Net Banking) — the actual collection happens on delivery.
For online prepaid, follow the Razorpay snippet in section 8 of
[BUSINESS_GUIDE.md](BUSINESS_GUIDE.md).

---

## Customising

- **Brand palette** — edit the CSS variables at the top of [frontend/css/tokens.css](frontend/css/tokens.css).
- **Logo** — replace [frontend/logo.svg](frontend/logo.svg) (PNG / WebP also accepted; the file is read by Pillow for the PDF invoice).
- **Home copy** — edit `renderHome()` in [frontend/app.js](frontend/app.js).
- **Announcement bar** — the rotating top strip lives in [frontend/index.html](frontend/index.html) under `class="announce"`.
- **Contact info** — search for `9500655548` and `aammii.com` across `frontend/index.html`, `frontend/app.js`, `backend/app.py`.

For business-flow customisation (orders, invoices, GST rates, image
replacement, Firebase setup) see [BUSINESS_GUIDE.md](BUSINESS_GUIDE.md).

---

## Contact

**Aammii Tharcharbu Santhai Private Limited**
Door No.5/177, Arumuga kavundanur, Thanneer thotti stop, Roja street, perur chettipalayam(po), kovaipudhur main road, Coimbatore – 641010, Tamil Nadu, India.
GSTIN: `33AAZCA4586H1Z3` · FSSAI: `12419003001497`
+91 95006 55548 · www.aammii.com

— _வாழ்க வளமுடன்_
