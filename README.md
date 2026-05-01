# Aammii Tharcharbu Santhai — E-Commerce Site

Full-stack store for **Aammii Tharcharbu Santhai Pvt. Ltd.** — natural farm-direct
products from Tamil Nadu. Flask backend + vanilla-JS hash-router SPA. **No build
step, no Node toolchain.** Double-click and ship.

Production extras (auth, validation, atomic invoice numbering, structured
logging, QR codes on PDFs, Docker, CI, pytest) are documented in
[PROFESSIONAL.md](PROFESSIONAL.md).

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

**Windows** — double-click [run.bat](run.bat). It installs from
`backend/requirements.txt`, copies `.env.example` → `.env`, and opens the browser.

**macOS / Linux**
```bash
cp .env.example .env                   # then edit ADMIN_TOKEN before going live
pip install -r backend/requirements.txt
python3 backend/app.py                 # development
# or, for production:
python3 backend/wsgi.py                # waitress, single-process, Windows-friendly
```

Open http://localhost:5000.

### Run the test suite

```bash
pytest                                 # 21 tests — invoice math, validation, e2e
```

### Run with Docker

```bash
docker compose up --build -d           # see Dockerfile + docker-compose.yml
```

---

## Project structure

```
aammii/
├── run.bat                       # Windows: double-click to start
├── README.md                     # this file
├── PROFESSIONAL.md               # production hardening notes (auth, CI, Docker)
├── BUSINESS_GUIDE.md             # operations / customisation guide
├── .env.example                  # copy to .env and fill in real values
├── Dockerfile                    # production container image
├── docker-compose.yml            # one-command local stack
├── deploy.sh                     # Ubuntu/Nginx + systemd + gunicorn deployment
├── netlify.toml                  # static-frontend-only deploy (proxies /api)
├── pytest.ini                    # test runner config
│
├── backend/
│   ├── app.py                    # Flask app · routes · PDF invoice (with QR)
│   ├── wsgi.py                   # production entrypoint (waitress / gunicorn)
│   ├── config.py                 # env-driven configuration (loads .env)
│   ├── app_logger.py             # structured rotating logger
│   ├── security.py               # admin-token decorator + payload validation
│   ├── order_store.py            # SQLite-backed atomic invoice counter
│   ├── database.py               # extra schema (categories, settings, etc.)
│   ├── admin.py                  # CLI admin tool
│   ├── pdf_parser.py             # extract products from supplier PDFs
│   └── requirements.txt          # pinned production deps
│
├── tests/                        # pytest suite (invoice math, validation, e2e)
├── .github/workflows/ci.yml      # GitHub Actions: tests + Docker build
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

All routes are JSON; static frontend at `/`. Routes marked **🔒** require the
`X-Admin-Token` header (value from `.env` → `ADMIN_TOKEN`).

| Endpoint                          | Method | Description |
|-----------------------------------|--------|-------------|
| `GET  /api/health`                | GET    | Liveness probe — returns feature flags |
| `GET  /api/products`              | GET    | All products (with computed `hsn` + `gst_rate`) |
| `PATCH /api/products/<id>` 🔒     | PATCH  | Update `image` · `hsn` · `gst_rate` · `name` · `qty` · `price` · `category` |
| `POST /api/upload` 🔒             | POST   | Upload a supplier PDF; parsed products replace the catalogue |
| `POST /api/mark-new` 🔒           | POST   | Mark product IDs as newly added (sets `date_added` to today) |
| `POST /api/order`                 | POST   | Place an order — strict payload validation, atomic invoice number |
| `GET  /api/invoice/<inv>`         | GET    | Stream a previously-generated PDF (e.g. `/api/invoice/INV-11042`) |
| `GET  /api/orders` 🔒             | GET    | All orders, newest first |
| `GET  /api/orders/<id>` 🔒       | GET    | Single order by `id` or `invoice_no` |

`POST /api/order` request body:
```json
{
  "items":    [{"code":"FD-017","name":"...","price":80,"qty":2,"category":"Noodles & Vermicelli"}],
  "customer": {"name":"...","phone":"+91...","email":"...","address":"..."},
  "payment":  "cod"
}
```
**Response (default)** — JSON:
```json
{ "ok": true, "order_id": "ORD-XXXX", "invoice_no": "INV-11042",
  "filename": "INV-11042.pdf", "invoice_url": "/api/invoice/INV-11042" }
```
Add `?download=1` to receive the PDF as the response body instead.

Validation rejects empty items, bad phone/email format, qty out of `[1..999]`,
price out of `[0..1_000_000]`, and unknown payment methods.

If `ADMIN_TOKEN` is empty, the auth decorator falls through with a logged
warning — development convenience only. **Set it in `.env` for production.**

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

- `uploads/products.json` — catalogue. Mutate via `PATCH /api/products/<id>`
  (atomic write via tempfile + `os.replace`) or edit the file directly.
- `orders/orders.json` — mirror of placed orders for the admin UI. Capped at 500.
- `orders/INV-XXXXX.pdf` — one file per placed order, kept indefinitely.
- `aammii.db` — **SQLite (WAL)** holding the atomic invoice-number counter and a
  log of every order. Created automatically on first run; back this up too.

Back up `uploads/`, `orders/` and `aammii.db` weekly — that is the entire business record.

---

## Deployment

### Docker (any host)

```bash
docker compose up --build -d
```
The `Dockerfile` already installs `fonts-noto` so Tamil PDF rendering works.

### Ubuntu / Oracle Cloud (one-command)

```bash
bash deploy.sh
```
Installs Python, nginx, ufw, fonts-noto; creates a venv, generates a strong
`.env` (with random `ADMIN_TOKEN` and `SECRET_KEY`), wires a `systemd` unit
running `gunicorn wsgi:application`, and configures nginx as a reverse proxy.

### Render.com

1. Push to GitHub.
2. New → Web Service → connect repo.
3. **Build:** `pip install -r backend/requirements.txt`
4. **Start:** `cd backend && gunicorn wsgi:application`
5. Add env vars from `.env.example` (especially `ADMIN_TOKEN`, `CORS_ORIGINS`).

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
