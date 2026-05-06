# Aammii — Operations & Troubleshooting Guide

The single reference for running, deploying, debugging, and extending this
project. Read top-to-bottom once; bookmark sections you'll return to.

> **TL;DR cheat sheet** at the end of section 2. Skip there if you're just
> trying to remember "how do I deploy a fix again?"

---

## Table of contents

1. [Architecture in 60 seconds](#1-architecture-in-60-seconds)
2. [Operational cheat sheet](#2-operational-cheat-sheet)
3. [Running locally](#3-running-locally)
4. [Where to change what — code map](#4-where-to-change-what--code-map)
5. [Environment variables, storage keys, routes, endpoints](#5-environment-variables-storage-keys-routes-endpoints)
6. [Common issues by symptom](#6-common-issues-by-symptom)
7. [Browser DevTools — diagnosing the frontend](#7-browser-devtools--diagnosing-the-frontend)
8. [PythonAnywhere — backend operations](#8-pythonanywhere--backend-operations)
9. [Cloudflare Pages / Workers — frontend operations](#9-cloudflare-pages--workers--frontend-operations)
10. [Firebase Auth notes](#10-firebase-auth-notes)
11. [Data backup & recovery](#11-data-backup--recovery)
12. [Future features — roadmap with file pointers](#12-future-features--roadmap-with-file-pointers)
13. [Glossary](#13-glossary)

---

## 1. Architecture in 60 seconds

```
┌────────────────────────┐       fetch (CORS)        ┌──────────────────────────┐
│  Cloudflare CDN edge   │ ───────────────────────▶  │  PythonAnywhere (Flask)  │
│  Static frontend       │                            │  /api/*                   │
│  HTML · CSS · JS       │                            │  products.json · SQLite   │
│  pages.dev / .workers  │                            │  PDF invoices             │
└────────────────────────┘                            └──────────────────────────┘
            │                                                      │
            ▼                                                      ▼
   browser localStorage                                    /home/<user>/aammii/
   - aammii-cart                                          ├── uploads/products.json
   - aammii-favs                                          ├── orders/orders.json
   - aammii-theme                                         ├── orders/INV-*.pdf
   - aammii-loc                                           ├── aammii.db (SQLite)
   - aammii-orders-local                                  └── logs/aammii.log
   - aammii-pending-order
   - aammii-admin-token
```

- **Frontend**: vanilla JS hash-routed SPA. No build step. One `app.js`,
  one `index.html`, six CSS files in `frontend/css/`.
- **Backend**: Flask. `backend/app.py` is the app, `backend/wsgi.py` is the
  production entry point that PA imports.
- **Auth**: Firebase (client-side only). Backend doesn't verify Firebase
  JWTs yet — admin endpoints use a separate `X-Admin-Token` header.
- **Storage**: `products.json` on disk, orders in SQLite (`aammii.db`)
  mirrored to `orders/orders.json` for the admin UI.

---

## 2. Operational cheat sheet

### Push a frontend change
```bash
git add frontend/
git commit -m "Frontend: <what changed>"
git push
```
Then re-zip `frontend/` → Cloudflare → **Create deployment** → upload zip.

### Push a backend change
```bash
git add backend/
git commit -m "Backend: <what changed>"
git push
```
On PA bash:
```bash
cd ~/aammii && git pull && touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py
```

### Check backend health (any console)
```bash
curl https://thirumalaivasan.pythonanywhere.com/api/health
```
Expected: `{"status":"ok","reportlab":true,"qrcode":true}`

### Verify CORS for a frontend domain
```bash
curl -s -I -X OPTIONS \
  -H "Origin: https://aammii-store.thirumalaithiruvasan.workers.dev" \
  -H "Access-Control-Request-Method: GET" \
  https://thirumalaivasan.pythonanywhere.com/api/products | grep -i access-control
```
Expected: `Access-Control-Allow-Origin: https://aammii-store.thirumalaithiruvasan.workers.dev`

### Open the admin panel
1. https://aammii-store.thirumalaithiruvasan.workers.dev/#/admin
2. Paste your `ADMIN_TOKEN` into the 🔑 card → **Save**

---

## 3. Running locally

### One-time setup (Windows)

Double-click `run.bat`. It will:
1. Auto-detect Python (3.8+ required)
2. Create the `venv` if missing
3. `pip install -r backend/requirements.txt`
4. Copy `.env.example` → `.env`
5. Start backend on `http://localhost:5000`
6. Open the browser

### One-time setup (Mac/Linux)

```bash
cp .env.example .env                            # only if not present
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python3 backend/app.py
```

Open http://localhost:5000.

### Subsequent runs

Windows: just double-click `run.bat`.
Mac/Linux:
```bash
source venv/bin/activate
python3 backend/app.py
```

### Edit-and-reload loop

- **Frontend changes** (`frontend/*.html`, `*.js`, `*.css`) — just refresh
  the browser. No build step. No server restart needed.
- **Backend changes** (`backend/*.py`) — Ctrl+C the dev server, re-run.
  Set `DEBUG=true` in `.env` for auto-reload.

### Run the test suite

```bash
pytest                        # 21 tests in tests/
pytest -k invoice             # filter
pytest -v                     # verbose with each test name
```

### Run lint

```bash
ruff check backend/ tests/
```

---

## 4. Where to change what — code map

### Want to change…

| Goal | File(s) |
|---|---|
| Brand colour, fonts, radii, shadow tokens | [frontend/css/tokens.css](frontend/css/tokens.css) |
| Header layout, nav links, mobile menu | [frontend/css/layout.css](frontend/css/layout.css), `<nav>` block in [frontend/index.html](frontend/index.html) |
| Home page hero text / sections | `renderHome()` in [frontend/app.js](frontend/app.js) |
| Product card design | `cardHTML()` in [frontend/app.js](frontend/app.js), `.card-*` rules in [frontend/css/home.css](frontend/css/home.css) |
| Product detail page | `renderProduct()` in [frontend/app.js](frontend/app.js), `.pd-*` rules in [frontend/css/pages.css](frontend/css/pages.css) |
| Cart page | `renderCart()` in [frontend/app.js](frontend/app.js) |
| Checkout form | `renderCheckout()` in [frontend/app.js](frontend/app.js) |
| Quotation/Confirm page | `renderConfirm()` in [frontend/app.js](frontend/app.js) |
| Admin panel | `renderAdmin()`, `renderImgMgr()`, `openGalleryEditor()` in [frontend/app.js](frontend/app.js) |
| Footer content | `<footer>` in [frontend/index.html](frontend/index.html) |
| Search placeholder typewriter words | `_typewriterCandidates()` in [frontend/app.js](frontend/app.js) |
| Add a new page (route) | Add `if (first === "<name>") return render<Name>(view);` to `route()` in [frontend/app.js](frontend/app.js), then write the renderer |
| Product list (all 450 items) | [uploads/products.json](uploads/products.json) (or admin panel) |
| Categories / GST mapping | `CAT_HSN`, `HIGH_GST_CATS` in [backend/app.py](backend/app.py) |
| Invoice PDF layout | `build_pdf_invoice()` in [backend/app.py](backend/app.py) (~line 458) |
| Order validation rules | `validate_order_payload()` in [backend/security.py](backend/security.py) |
| Admin auth behaviour | `require_admin()` in [backend/security.py](backend/security.py) |
| Default CORS origins | `_DEFAULT_CORS_ORIGINS` in [backend/config.py](backend/config.py) |
| Company name, GSTIN, address (used on invoice) | `COMPANY` dict in [backend/app.py](backend/app.py) (~line 84) |
| Free delivery threshold (₹500) | `subtotal >= 500 ? 0 : 49` in `submitCheckout()` and `computeQuoteTotals()` in [frontend/app.js](frontend/app.js) |
| Admin token UI | `renderAdmin()` in [frontend/app.js](frontend/app.js); helpers `adminToken()`, `adminHeaders()`, `setAdminToken()` |
| Razorpay integration (when wiring) | `payNow()` in [frontend/app.js](frontend/app.js) (TODO comment marks the spot); add `/api/razorpay/*` to [backend/app.py](backend/app.py) |
| Firebase config | [frontend/firebase-config.js](frontend/firebase-config.js); domain whitelist on console.firebase.google.com → Authentication → Settings → Authorized domains |

### File responsibility quick guide

```
backend/
├── app.py            ← all Flask routes, PDF invoice generation
├── wsgi.py           ← production entry point (PA imports `application` from here)
├── config.py         ← env-var driven settings; CORS_ORIGINS default lives here
├── security.py       ← @require_admin decorator + validate_order_payload()
├── order_store.py    ← SQLite atomic invoice counter + order persistence
├── pdf_parser.py     ← extract products from supplier PDFs (admin upload)
├── app_logger.py     ← rotating file logger
└── database.py       ← extra schema (categories, settings) — NOT YET WIRED to app.py

frontend/
├── index.html        ← SPA shell: header, footer, modals, drawers
├── app.js            ← router, all 13 pages, cart, search, admin
├── auth.js           ← Firebase compat SDK wrapper, exposes window._currentUser
├── firebase-config.js← Firebase client keys (safe to expose)
├── logo.svg          ← brand logo (also embedded in PDF invoices)
└── css/
    ├── tokens.css    ← design variables, base reset
    ├── layout.css    ← nav, mobile-nav, view container
    ├── home.css      ← hero, sections, product card
    ├── pages.css     ← browse, product, cart, checkout, admin, about
    ├── chrome.css    ← auth modal, cart drawer, toast, footer, search
    └── responsive.css← breakpoints + print styles
```

---

## 5. Environment variables, storage keys, routes, endpoints

### Backend env vars (read in [backend/config.py](backend/config.py))

| Var | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | `aammii-dev-secret-change-me` | Flask session signing. **Set a random value in production.** |
| `DEBUG` | `false` | Flask debug auto-reload (dev only) |
| `HOST` | `0.0.0.0` | Bind address (irrelevant on PA) |
| `PORT` | `5000` | Bind port (irrelevant on PA) |
| `ADMIN_TOKEN` | `""` | Required to access `/api/upload`, `/api/orders`, `PATCH /api/products/<id>`. Empty = open (dev only) |
| `CORS_ORIGINS` | hardcoded list in `_DEFAULT_CORS_ORIGINS` | Comma-separated allowed origins. Setting an env var overrides the default |
| `LOG_LEVEL` | `INFO` | One of `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FILE` | `logs/aammii.log` | Path for rotating log file |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `""` | Wire when Razorpay is integrated |
| `BUSINESS_*` | hardcoded defaults in `config.py` | Name, address, GSTIN — used on invoices |

### Frontend localStorage keys

| Key | Holds | Survives refresh? |
|---|---|---|
| `aammii-cart` | Current cart items + qty | Yes |
| `aammii-favs` | `{productId: true}` map | Yes |
| `aammii-theme` | `"light"` or `"dark"` | Yes |
| `aammii-loc` | Delivery location label | Yes |
| `aammii-pin` | Delivery PIN code | Yes |
| `aammii-orders-local` | Orders placed by anonymous users (mirror of backend) | Yes |
| `aammii-pending-order` | Customer/payment data between Checkout and Confirm pages | Yes (cleared on order success) |
| `aammii-admin-token` | Admin's `ADMIN_TOKEN` for sending the header | Yes |

### Frontend routes (hash-based)

| URL | Renderer | Notes |
|---|---|---|
| `#/` | `renderHome()` | Hero, categories, new arrivals, recommendations |
| `#/browse` | `renderBrowse()` | Search, filter, sort all products |
| `#/category/<name>` | `renderBrowse()` w/ `category` param | URL-encoded name |
| `#/product/<id>` | `renderProduct()` | Gallery (multi-image), description, related |
| `#/cart` | `renderCart()` | Editable cart, promo code field |
| `#/checkout` | `renderCheckout()` | Address form, payment radio. Submits → savePending → /confirm |
| `#/confirm` | `renderConfirm()` | Quotation table with per-row GST. Pay Now button |
| `#/order-placed/<id>` | `renderOrderPlaced()` | Thank-you screen + invoice download |
| `#/orders` | `renderOrders()` | Order history (logged-in: from backend; else local) |
| `#/order/<id>` | `renderOrderDetail()` | Single order view |
| `#/account` | `renderAccount()` | Firebase profile management |
| `#/admin` | `renderAdmin()` | Token entry, PDF upload, image manager, gallery |
| `#/about` | `renderAbout()` | Story page |
| `#/contact` | `renderContact()` | Phone, email, contact form |

### Backend API endpoints

| Method | Path | Auth | Used by |
|---|---|---|---|
| GET | `/api/health` | open | Smoke test |
| GET | `/api/products` | open | All product loads |
| PATCH | `/api/products/<id>` | 🔒 admin | Image, gallery, HSN, GST, name, price edits |
| POST | `/api/upload` | 🔒 admin | PDF catalogue upload |
| POST | `/api/mark-new` | 🔒 admin | Mark IDs as newly added |
| POST | `/api/order` | open | Place order, return order_id + invoice URL |
| GET | `/api/invoice/<inv>` | open | Stream a generated PDF |
| GET | `/api/orders` | 🔒 admin | List all orders |
| GET | `/api/orders/<id>` | 🔒 admin | Single order detail |

🔒 endpoints require header `X-Admin-Token: <ADMIN_TOKEN>`. Frontend sends it
automatically when admin token is saved in the admin panel.

---

## 6. Common issues by symptom

### "0 results / no products" on a deployed page

**Diagnose**: F12 → Network tab → reload → look for `/api/products` request.

| What you see | Cause | Fix |
|---|---|---|
| No request at all | JS error before products fetch | Switch to Console tab, screenshot the red error |
| Request to `<your-host>/api/products` 404 | Browser cached old `app.js` where `API = ""` | Hard refresh **Ctrl+Shift+R**, or open Incognito |
| Request to PA URL, status 200, body `[]` | `products.json` is empty on PA | Re-upload `products.json` or restore from backup |
| Request to PA URL, **CORS error** | PA is down or its CORS_ORIGINS doesn't include your host | See "PA is down" below; verify with curl from section 2 |
| Request to PA URL, status 500 | Backend exception | Check PA Error log (Web tab → log link) |

### "There is a problem with your virtualenv setup" on PA Web tab

```bash
cd ~/aammii
rm -rf venv
python3.10 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```
Then PA → Web tab → confirm Virtualenv path is `/home/thirumalaivasan/aammii/venv` → **Reload**.

### Admin actions fail (PDF upload, image save) — 401 Unauthorized

The admin token isn't being sent or doesn't match.

1. PA → Web → Environment variables → confirm `ADMIN_TOKEN` is set to a non-empty value
2. On the deployed admin page (#/admin) → 🔑 Admin token card → paste the **same** value → **Save**
3. Try the action again; should succeed

To clear and start over: click **Clear** in the admin token card, then paste fresh.

### Tamil text shows as boxes in PDF invoices

PA Linux doesn't have a Tamil font preinstalled. The website is unaffected
(browser fonts work). To fix PDF invoices:

1. Download `NotoSansTamil-Regular.ttf` from
   https://fonts.google.com/noto/specimen/Noto+Sans+Tamil
2. Upload to `/home/thirumalaivasan/aammii/`
3. Edit [backend/app.py](backend/app.py) → `find_tamil_font()` candidate list, add:
   ```python
   ("/home/thirumalaivasan/aammii/NotoSansTamil-Regular.ttf", "NotoTamil"),
   ```
4. Push, pull on PA, reload

### Sign-in fails with "auth/unauthorized-domain"

Firebase Auth rejects unknown domains. Add your deployed URL:

Firebase Console → **Authentication → Settings → Authorized domains → Add domain**:
```
aammii-store.thirumalaithiruvasan.workers.dev
localhost
```

### Cart shows ₹0 / quantity wrong

`localStorage` got into a bad state. Browser DevTools → **Application** tab →
**Local Storage** → `https://aammii-store.thirumalaithiruvasan.workers.dev` →
delete `aammii-cart` → reload.

### Cloudflare deploy rejects with auth error

The auto-generated API token in Workers Builds doesn't have `Cloudflare Pages: Edit`
permission. Two options:

- **Easy**: skip Workers Builds. Use **Direct Upload** — drag a zip of `frontend/`
  into the Pages dashboard. No tokens, no auth.
- **Hard**: Create custom token at https://dash.cloudflare.com/profile/api-tokens
  with `Account → Cloudflare Pages → Edit` permission, paste it as
  `CLOUDFLARE_API_TOKEN` secret in your project's Variables.

### "Order failed (500)" on Pay Now

Backend exception. PA → **Web** → click the **error log** link → look at the
last few lines for the Python traceback. Most common:

- `products.json` malformed → fix or restore from a known-good backup
- Permission denied on `orders/` → check folder ownership on PA bash:
  `ls -la ~/aammii/orders/` (should be writable by your user)
- SQLite locked → unlikely on a single-process PA setup; reload the web app

### A page is blank / spinner spins forever

Almost always a JS error. F12 → **Console** tab → first red error tells you the file
+ line. Common patterns:

- `Cannot read properties of undefined (reading 'foo')` — `STATE.products` is empty;
  the products fetch silently failed
- `Unexpected token` / `SyntaxError` — uploaded a broken `app.js`; re-zip and re-upload

### Backend says it's running but I see "Hello from Flask!" or "Hello, World!"

The PA WSGI file is pointing at the default app, not yours. Open
[https://www.pythonanywhere.com/user/thirumalaivasan/files/var/www/thirumalaivasan_pythonanywhere_com_wsgi.py](https://www.pythonanywhere.com/user/thirumalaivasan/files/var/www/thirumalaivasan_pythonanywhere_com_wsgi.py)
and replace contents with:

```python
import sys

PROJECT_PATH = '/home/thirumalaivasan/aammii/backend'
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

from wsgi import application  # noqa
```

Save → click Reload on the Web tab.

---

## 7. Browser DevTools — diagnosing the frontend

Open: **F12** (or right-click → Inspect).

### Console tab
- Red text = JavaScript errors. First red row is usually the actual bug; later ones cascade from it.
- Filter to "Errors" only if there's noise.
- Type `STATE.products.length` to see how many products loaded. `0` = fetch failed silently.
- Type `STATE.cart` to inspect cart state.
- Type `localStorage` to see all aammii-* keys.

### Network tab
- Reload page (Ctrl+R) to capture all requests.
- Filter "XHR" or "Fetch" to see only API calls.
- Click a request → **Headers** tab shows status, request/response headers.
  - `Origin` (request) tells you what frontend the request came from.
  - `Access-Control-Allow-Origin` (response) is what CORS allows. Must match Origin.
- Click **Response** tab to see what the API returned.
- Status code meanings:
  - `0` or red row → blocked by CORS / connection refused / network down
  - `200` → OK
  - `304` → cached (browser used local copy)
  - `400` → bad request payload (validation failed)
  - `401` → admin token missing or wrong
  - `404` → route doesn't exist on backend
  - `500` → backend exception → check PA error log

### Application tab → Local Storage
- See all `aammii-*` keys, their values
- Right-click a key → Delete to clear it
- Useful for resetting state when testing

### Network tab → Disable cache
- Tick **Disable cache** (top of Network tab) while DevTools is open
- Forces fresh fetches every reload — handy when iterating on `app.js`

---

## 8. PythonAnywhere — backend operations

### Logging in
Go to https://www.pythonanywhere.com/user/thirumalaivasan/

### Web tab — fields and what they do

| Field | Value | Why |
|---|---|---|
| Source code | `/home/thirumalaivasan/aammii/backend` | Where Flask code lives |
| Working directory | `/home/thirumalaivasan/aammii/backend` | cwd when WSGI imports modules (cosmetic for our app — paths are file-relative) |
| Virtualenv | `/home/thirumalaivasan/aammii/venv` | Python 3.10 with our deps installed |
| WSGI file | `/var/www/thirumalaivasan_pythonanywhere_com_wsgi.py` | What PA imports to find `application` |
| Python version | 3.10 | Matches venv |

### Reloading the app

Two ways:
- **Web tab** → green **Reload** button
- **Bash console**: `touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py`

Both do the same thing: invalidate the running Python process so the next
request rebuilds it with current code.

### Pulling fresh code

```bash
cd ~/aammii && git pull && touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py
```

After a `git pull` you **must** reload, otherwise the live process keeps
running old code from before the pull.

### Adding a new Python dependency

1. Locally: edit `backend/requirements.txt`, push.
2. PA bash:
   ```bash
   cd ~/aammii && git pull
   source venv/bin/activate
   pip install -r backend/requirements.txt
   touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py
   ```

### Viewing logs

PA Web tab has three log links:
- **Access log** — every HTTP request (mostly noisy)
- **Error log** — Python tracebacks. **Always check this first when debugging.**
- **Server log** — startup messages

In bash:
```bash
tail -100 /var/log/thirumalaivasan.pythonanywhere.com.error.log
tail -f /var/log/thirumalaivasan.pythonanywhere.com.error.log   # follow live
```

App-level logs (from `app_logger.py`):
```bash
tail -100 ~/aammii/logs/aammii.log
```

### Setting environment variables

Web tab → scroll to **Environment variables** → add or edit. **Reload after changing.**

| Recommended | Value |
|---|---|
| `ADMIN_TOKEN` | A long random string (e.g. `aammii-admin-9f7k2x...`) |
| `SECRET_KEY` | Another long random string |
| `DEBUG` | `false` |

### Testing the live API

```bash
# Health
curl https://thirumalaivasan.pythonanywhere.com/api/health

# Get a product
curl https://thirumalaivasan.pythonanywhere.com/api/products | head -c 500

# CORS preflight (replace Origin)
curl -s -I -X OPTIONS \
  -H "Origin: https://aammii-store.thirumalaithiruvasan.workers.dev" \
  -H "Access-Control-Request-Method: GET" \
  https://thirumalaivasan.pythonanywhere.com/api/products | grep -i access-control

# Admin endpoint (replace TOKEN)
curl -H "X-Admin-Token: TOKEN" https://thirumalaivasan.pythonanywhere.com/api/orders
```

### Renewing your free PA web app

Free tier disables the site if you don't log in for 1 month. PA emails a
warning. Just log in and click **Run until 1 month from today** on the Web tab.

### Free tier caps

- ~100 daily CPU-seconds for background tasks (web requests are unmetered)
- 512 MB disk
- Outbound network restricted to a whitelist (PyPI, common CDNs, OSM allowed)
- No custom domain (need paid Hacker plan $5/mo)

---

## 9. Cloudflare Pages / Workers — frontend operations

### Direct Upload deploy (simplest, recommended)

1. File Explorer → right-click `frontend` folder → Send to → Compressed (zipped) folder
2. dash.cloudflare.com → **Workers & Pages** → click your project (`aammii-store`)
3. **Create deployment** button → **Upload assets** → drag `frontend.zip` → **Deploy**
4. ~20 sec later your site is live at the project URL

### Connecting Git (auto-deploy on push) — once stable

Project → **Settings → Builds & deployments → Connect to Git**. Pick repo
`thirumalaivasan95/aammii`. Build config:
- Production branch: `main`
- Build command: *(empty)*
- Build output directory: `frontend`

After this, every `git push origin main` auto-deploys.

### Whitelisting a custom domain

Buying `aammii.in` (~₹600/yr) at Cloudflare Registrar:
1. Buy → automatically added to Cloudflare
2. Pages project → **Custom domains** → add `aammii.in` and `www.aammii.in`
3. SSL provisions in ~2 min
4. Update `_DEFAULT_CORS_ORIGINS` in `backend/config.py` to include
   `https://aammii.in,https://www.aammii.in`, push, pull on PA, reload

### Cache busting

Cloudflare auto-purges on every deploy. If you see stale content anyway:
- **Caching tab → Configuration → Purge cache → Purge Everything**
- Or use a hard refresh: **Ctrl+Shift+R**

### Worker URL vs Pages URL

The new Workers Builds flow gives you `*.workers.dev`. Classic Pages gives
`*.pages.dev`. Functionally identical for static hosting. To switch from
Worker → Pages:

1. Delete the worker (Settings → Delete worker)
2. Create new project: **Workers & Pages → Create → Pages tab → Upload assets**
3. Update `_DEFAULT_CORS_ORIGINS` in `backend/config.py` to the new URL

---

## 10. Firebase Auth notes

- Project ID: `aammii-1`
- Config in [frontend/firebase-config.js](frontend/firebase-config.js) — these
  keys are **safe to expose** (they identify the project, don't authorize anything)
- Client SDK loaded via CDN in [frontend/index.html](frontend/index.html) — no npm
- Auth state managed in [frontend/auth.js](frontend/auth.js); user available globally as `window._currentUser`

### Adding a new auth provider

Firebase Console → Authentication → Sign-in method → enable provider →
update `auth.js` with the corresponding `signInWithPopup(...)` call.

### Backend doesn't verify Firebase tokens (yet)

Currently the backend trusts whatever customer info the frontend sends.
For real security on order endpoints, future work:
1. Pass `await user.getIdToken()` from frontend in `Authorization: Bearer ...` header
2. Backend verifies via firebase-admin SDK
3. Reject orders where the user.uid doesn't match the claimed customer

Listed in section 12 (Future features).

---

## 11. Data backup & recovery

### What to back up

| File | Why |
|---|---|
| `~/aammii/uploads/products.json` | Catalogue (450+ items) |
| `~/aammii/orders/orders.json` | Order summary log |
| `~/aammii/orders/INV-*.pdf` | Generated invoice PDFs |
| `~/aammii/aammii.db` | SQLite — atomic invoice counter + order log |

### Backup script (run on PA bash, weekly)

```bash
cd ~/aammii
TS=$(date +%Y%m%d-%H%M)
mkdir -p backups
tar -czf backups/aammii-$TS.tgz uploads/products.json orders/ aammii.db
echo "Backup written to backups/aammii-$TS.tgz"
```

Then download via PA Files tab, or rsync to your machine.

### Restoring

```bash
cd ~/aammii
tar -xzf backups/aammii-20260506-1200.tgz
touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py
```

### Catalogue-only recovery (most common)

If `products.json` is corrupted or wiped:
```bash
cd ~/aammii
git checkout uploads/products.json    # restores last committed version
touch /var/www/thirumalaivasan_pythonanywhere_com_wsgi.py
```

(Your `uploads/products.json` is committed to git, so this works as long as
git history has a clean copy.)

---

## 12. Future features — roadmap with file pointers

Items are **roughly ordered by ROI** (revenue / trust / polish). Each entry
points to the file you'd touch.

### 🔴 Critical — blocks revenue

#### Razorpay live integration
**Why**: payments currently don't actually charge anyone. Pay Now records the
order but no money moves.

**Where**:
- Backend: add `/api/razorpay/create-order` and `/api/razorpay/verify` to [backend/app.py](backend/app.py)
- Frontend: branch in `payNow()` ([frontend/app.js](frontend/app.js)) on `payment !== 'cod'`:
  - Call `create-order` to get a Razorpay order_id
  - Open Razorpay Checkout via the `https://checkout.razorpay.com/v1/checkout.js` script
  - On `handler` callback, call `/api/razorpay/verify` (signature check) → then existing `/api/order` flow

**Razorpay setup**: Create account at razorpay.com → KYC → API keys go in
PA env vars `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (read by `config.py`).

#### Order confirmation email/SMS
**Why**: customer gets nothing on order placement currently.

**Where**:
- Backend: in `api_order()` ([backend/app.py](backend/app.py)), after `append_order(order)`,
  call a new `notify_customer(order, pdf_bytes)` helper.
- Email: SendGrid free tier (100/day) or Mailgun. Add SMTP creds to `.env`.
- SMS: MSG91 (Indian-friendly), DLT registration required for transactional SMS.

### 🟠 High — trust + UX

#### Promo code applies actual discount
Currently `AAMMII10` shows a toast but the discount isn't applied.

**Where**: in `submitCheckout()` and `computeQuoteTotals()` ([frontend/app.js](frontend/app.js)),
read promo code from `localStorage` (or pass via pending order), reduce
subtotal accordingly. Backend should also accept and apply the discount in
`compute_invoice_rows()` ([backend/app.py](backend/app.py)) so the invoice reflects it.

#### Stock / inventory
Currently products have no stock count → can sell unlimited.

**Where**:
- Add `stock` field to product schema in [uploads/products.json](uploads/products.json) and `PATCH` allowed fields in [backend/app.py](backend/app.py)
- Decrement on `api_order()` after validating qty ≤ stock
- Frontend: badge "Out of stock" when `stock <= 0` on cards, disable Add to Cart

#### Login at checkout / saved addresses
Currently anyone can checkout anonymously; addresses aren't saved between orders.

**Where**:
- `renderCheckout()` in [frontend/app.js](frontend/app.js): if `!window._currentUser`, show "Sign in to checkout" prompt
- New endpoint `/api/me/addresses` in [backend/app.py](backend/app.py) (requires Firebase token verification)
- Address book UI in `renderAccount()` ([frontend/app.js](frontend/app.js))

#### Shipping fee actually computed
"Free above ₹500" advertised; `computeQuoteTotals()` already does this.
Verify it's reflected on cart and order pages too — `renderCart()` may have stale logic.

### 🟡 Medium — operations

#### Admin orders dashboard
Backend `/api/orders` exists but no frontend UI to view them.

**Where**: add a new tab to `renderAdmin()` ([frontend/app.js](frontend/app.js)). Fetch
`/api/orders` with `adminHeaders()`. Table view with order_id, customer name,
date, total, status. Click → order detail.

#### Order status updates
Currently locked at `confirmed`. No "shipped" / "delivered" workflow.

**Where**:
- Backend: new `PATCH /api/orders/<id>` 🔒 admin endpoint that updates `status` field
- Frontend: dropdown in admin orders dashboard
- Customer-facing: enrich `renderOrderDetail()` ([frontend/app.js](frontend/app.js)) with a status timeline component

#### Real reviews
Pseudo-random "3.8 stars / 96 reviews" generated from product code hash.

**Where**:
- Add `reviews` table to SQLite (`order_store.py` or `database.py`)
- New `POST /api/reviews` (require Firebase auth; one review per user per product)
- Replace `pseudoRating()` in [frontend/app.js](frontend/app.js) with real fetch from `/api/products/<id>/reviews`

### 🟢 Polish

#### Analytics
Add Plausible (free open-source friendly) snippet to `<head>` in [frontend/index.html](frontend/index.html), or Google Analytics.

#### Rate limiting
`flask-limiter` is in `requirements.txt` but not used. Wire it on `/api/order`
(prevent order spam) and `/api/upload` (prevent PDF abuse) in [backend/app.py](backend/app.py):
```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route("/api/order", methods=["POST"])
@limiter.limit("5 per minute")
def api_order(): ...
```

#### Returns / refunds
Razorpay supports refund via API. Add admin UI to mark order as refunded,
trigger Razorpay refund, log in SQLite.

#### Logistics integration
Shiprocket has a clean REST API for shipping label generation, AWB tracking,
pickup scheduling. Plug after the order is placed → store AWB on the order.

#### WhatsApp order channel
Most popular Indian e-commerce channel. Add a "Order on WhatsApp" button
to product detail and cart pages with prefilled message:
```
https://wa.me/919500655548?text=Hi! I want to order:
- Foxtail millet × 2
- Country cow ghee × 1
Total: ₹540
```

#### PWA (installable app)
Add `manifest.json` + service worker to [frontend/](frontend/). Users can
"Add to Home Screen" and the site behaves like a native app. ~30 min of work.

#### Native app (Capacitor wrapper)
Wraps the existing site as iOS/Android shell. Needs Apple Developer ($99/yr) +
Google Play ($25 one-time). Only worth it once the site has consistent traffic.

---

## 13. Glossary

| Term | What it is |
|---|---|
| **CORS** | Cross-Origin Resource Sharing. The browser security policy that requires the backend to send `Access-Control-Allow-Origin: <frontend-url>` on responses. Without it, the browser blocks the response. |
| **WSGI** | Web Server Gateway Interface. The Python convention for plugging Flask into a server. PA imports `application` from your `wsgi.py`. |
| **venv** | Python virtual environment. An isolated `site-packages` directory so each project has its own dependency versions. |
| **Hash routing** | URLs like `#/cart`. Everything after `#` is a fragment, not sent to the server, so the same `index.html` handles every URL. SPA-friendly. |
| **SPA** | Single-Page Application. One HTML file, JavaScript renders all pages. |
| **HSN** | Harmonized System of Nomenclature. The tax code GST uses for products. We map by category in `CAT_HSN`. |
| **CGST/SGST** | Central + State GST. For intra-state sales the GST rate is split 50/50 between these two. |
| **`X-Admin-Token`** | Custom HTTP header we use to authenticate admin requests. Frontend sends it, `@require_admin` decorator in backend checks it. |

---

*Last updated: 2026-05-06. Keep this file current as you change the system —
the value compounds the more you trust it.*
