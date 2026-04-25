/**
 * app.js — Aammii Tharcharbu Santhai
 * Single-page app with hash routing · Multi-page e-commerce · Vanilla JS
 *
 * Pages: Home · Browse · Category · Product · Cart · Checkout ·
 *        OrderConfirm · Orders · OrderDetail · Account · Admin · About · Contact
 */

/* ═══════════════════════════════════════════════════════════════
   1. CONFIG & STATE
   ═══════════════════════════════════════════════════════════════ */

const API = (window.location.hostname === "localhost" ||
             window.location.hostname === "127.0.0.1")
            ? "" : "";

const STATE = {
  products:    [],
  cart:        {},
  filters:     { category: "all", minP: 0, maxP: 5000, search: "", sort: "default" },
  location:    localStorage.getItem("aammii-loc") || "Tamil Nadu",
  ordersCache: [],
};

const CART_KEY  = "aammii-cart";
const ORDERS_KEY = "aammii-orders-local";   /* local order shadow for anon users */
const FAV_KEY   = "aammii-favs";

/* ═══════════════════════════════════════════════════════════════
   2. CATEGORY METADATA
   ═══════════════════════════════════════════════════════════════ */

const CAT_META = {
  "Beverages":            { emoji: "🍵", c1: "#0E7C6B", c2: "#35C9B0" },
  "Books & DVDs":         { emoji: "📚", c1: "#2D4A6E", c2: "#6E9EC0" },
  "Copper Products":      { emoji: "🥇", c1: "#B8860B", c2: "#F4C87A" },
  "Divine Products":      { emoji: "🕯", c1: "#6B2E7A", c2: "#B87ACC" },
  "Dry Fruits & Nuts":    { emoji: "🥜", c1: "#6B3A12", c2: "#C8956C" },
  "Face Pack":            { emoji: "✨", c1: "#6B2E7A", c2: "#E0B8F0" },
  "Health Mix":           { emoji: "💊", c1: "#1A4A70", c2: "#7EADCF" },
  "Healthcare":           { emoji: "🩺", c1: "#7A1E18", c2: "#E07070" },
  "Herbal Powder":        { emoji: "🌿", c1: "#2E6040", c2: "#6EA882" },
  "Home Care":            { emoji: "🧴", c1: "#1E6B38", c2: "#62C882" },
  "Honey":                { emoji: "🍯", c1: "#C8820A", c2: "#F9E79F" },
  "Millets & Grains":     { emoji: "🌾", c1: "#5C3A1E", c2: "#C8956C" },
  "Noodles & Vermicelli": { emoji: "🍜", c1: "#C05A10", c2: "#E09050" },
  "Oils & Ghee":          { emoji: "🫙", c1: "#7A3B0A", c2: "#D2A679" },
  "Personal Care":        { emoji: "🌸", c1: "#6B2E7A", c2: "#E0B8F0" },
  "Pickles":              { emoji: "🥒", c1: "#3D5A26", c2: "#8EBF62" },
  "Pulses & Dals":        { emoji: "🫘", c1: "#3D5A26", c2: "#8EBF62" },
  "Readymade Mix":        { emoji: "🍱", c1: "#B8860B", c2: "#F4C87A" },
  "Salt":                 { emoji: "🧂", c1: "#2D4A6E", c2: "#7EADCF" },
  "Seeds":                { emoji: "🌱", c1: "#1E6B38", c2: "#62C882" },
  "Soap":                 { emoji: "🧼", c1: "#1E6A9A", c2: "#70AACF" },
  "Spices":               { emoji: "🌶", c1: "#A02020", c2: "#E07070" },
  "Sweeteners":           { emoji: "🍯", c1: "#B8860B", c2: "#F4C87A" },
  "Vadagam & Appalam":    { emoji: "🥙", c1: "#7A3B0A", c2: "#C8956C" },
  "Wellness Tools":       { emoji: "🧘", c1: "#1E6A9A", c2: "#70AACF" },
};

const FEATURED_CATEGORIES = [
  "Millets & Grains", "Spices", "Oils & Ghee", "Honey",
  "Herbal Powder", "Pulses & Dals", "Personal Care", "Health Mix"
];

/* ═══════════════════════════════════════════════════════════════
   3. HELPERS
   ═══════════════════════════════════════════════════════════════ */

const $  = id => document.getElementById(id);
const q  = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(n) { return "₹" + Number(n || 0).toFixed(2); }
function moneyR(n) { return "₹" + Math.round(Number(n || 0)); }

/* Image system — modular URL based.
   Pasted image URL wins; everything else falls back to a category-tinted SVG. */
function imageUrl(p) {
  const img = (p?.image || "").trim();
  if (img && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:"))) {
    return img;
  }
  return fallbackSVG(280, p?.category);
}

function fallbackSVG(size = 280, category = "") {
  const meta = CAT_META[category] || { emoji: "🌿", c1: "#14532D", c2: "#22703E" };
  const h = Math.round(size * 0.78);
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 ${size} ${h}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${meta.c1}"/><stop offset="100%" stop-color="${meta.c2}"/>
       </linearGradient></defs>
       <rect width="${size}" height="${h}" fill="url(#g)" rx="10"/>
       <circle cx="${size/2}" cy="${h*0.42}" r="${size*0.13}" fill="rgba(255,255,255,0.12)"/>
       <text x="50%" y="${h*0.5}" text-anchor="middle" font-size="${Math.round(size*0.28)}" dominant-baseline="middle">${meta.emoji}</text>
     </svg>`);
}

function splitName(name) {
  if (!name) return { tamil: "", english: "" };
  if (name.includes(" / ")) {
    const [t, e] = name.split(" / ", 2);
    return { tamil: t.trim(), english: (e || "").trim() };
  }
  return { tamil: name, english: "" };
}

function isNew(p) {
  if (!p?.date_added) return false;
  return (Date.now() - new Date(p.date_added).getTime()) < 7 * 24 * 60 * 60 * 1000;
}

/* Pseudo-rating & MRP based on stable hash — gives the site the polish of an
   e-commerce store without fabricating real reviews. Replace with real data
   once the review system is live. */
function pseudoRating(p) {
  const h = String(p.id || p.code || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const stars = 3.8 + ((h % 12) / 10);      // 3.8–4.9
  const reviews = 12 + (h % 180);
  return { stars: Math.min(5, stars).toFixed(1), reviews };
}
function pseudoMRP(p) {
  const factor = 1.1 + ((String(p.id).length % 4) * 0.05);  // 1.10–1.25
  return Math.round(Number(p.price) * factor);
}

/* ═══════════════════════════════════════════════════════════════
   4. THEME
   ═══════════════════════════════════════════════════════════════ */

(function initTheme() {
  const saved = localStorage.getItem("aammii-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved ? saved === "dark" : prefersDark) document.body.classList.add("dark");
})();

function applyThemeIcon() {
  const ic = $("themeIcon");
  if (ic) ic.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}
applyThemeIcon();

function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("aammii-theme", dark ? "dark" : "light");
  applyThemeIcon();
}
window.toggleTheme = toggleTheme;

/* ═══════════════════════════════════════════════════════════════
   5. CART  (persists to localStorage)
   ═══════════════════════════════════════════════════════════════ */

function loadCart() {
  try { STATE.cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { STATE.cart = {}; }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(STATE.cart)); } catch {}
}

function cartCount()   { return Object.values(STATE.cart).reduce((s, i) => s + i.qty, 0); }
function cartTotal()   { return Object.values(STATE.cart).reduce((s, i) => s + i.qty * i.price, 0); }

function addToCart(id, qty = 1, silent = false) {
  const p = STATE.products.find(x => x.id === id || x.code === id);
  if (!p) return;
  if (STATE.cart[p.id]) STATE.cart[p.id].qty += qty;
  else STATE.cart[p.id] = { ...p, qty };
  saveCart(); updateNavCart();
  if (!silent) {
    showToast(`🛒 ${splitName(p.name).tamil} added`);
    openCartDrawer(p);
  }
}
function setQty(id, qty) {
  if (!STATE.cart[id]) return;
  if (qty <= 0) delete STATE.cart[id];
  else STATE.cart[id].qty = qty;
  saveCart(); updateNavCart();
}
function removeFromCart(id) { delete STATE.cart[id]; saveCart(); updateNavCart(); }
function clearCart() { STATE.cart = {}; saveCart(); updateNavCart(); }

function updateNavCart() {
  const b = $("cartBadge"), p = $("cartPill");
  if (b) b.textContent = cartCount();
  if (p) {
    const c = cartCount();
    p.textContent = c ? moneyR(cartTotal()) : "Cart";
  }
}

/* Favorites (localStorage-only) */
function loadFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || {}; } catch { return {}; } }
function saveFavs(f) { try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch {} }
function toggleFav(id) {
  const f = loadFavs();
  f[id] = !f[id];
  saveFavs(f);
  return f[id];
}

/* ═══════════════════════════════════════════════════════════════
   6. ROUTER  (hash-based SPA)
   ═══════════════════════════════════════════════════════════════ */

function parseHash() {
  const h = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = h.split("?");
  const params = Object.fromEntries(new URLSearchParams(query));
  const parts = path.split("/").filter(Boolean);
  return { path, parts, params };
}

async function route() {
  const { parts, params } = parseHash();
  const view = $("view");
  if (!STATE.products.length) await loadProducts();

  window.scrollTo(0, 0);
  updateNavCart();

  // Route dispatch
  const first = parts[0] || "";
  try {
    if (!first)                   return renderHome(view);
    if (first === "browse")       return renderBrowse(view, params);
    if (first === "category")     return renderBrowse(view, { category: decodeURIComponent(parts[1] || "") });
    if (first === "product")      return renderProduct(view, parts[1]);
    if (first === "cart")         return renderCart(view);
    if (first === "checkout")     return renderCheckout(view);
    if (first === "order-placed") return renderOrderPlaced(view, parts[1]);
    if (first === "orders")       return renderOrders(view);
    if (first === "order")        return renderOrderDetail(view, parts[1]);
    if (first === "account")      return renderAccount(view);
    if (first === "admin")        return renderAdmin(view);
    if (first === "about")        return renderAbout(view);
    if (first === "contact")      return renderContact(view);
    return render404(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="page"><div class="empty">
      <div class="emoji">😵</div><h3>Something broke.</h3>
      <p>${esc(e.message)}</p><a class="btn-primary" href="#/">Go Home</a></div></div>`;
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => { populateSearchCats(); buildMobileNav(); });
window.go = (path) => { window.location.hash = path.startsWith("#") ? path : "#" + path; };

/* ═══════════════════════════════════════════════════════════════
   7. DATA LAYER
   ═══════════════════════════════════════════════════════════════ */

async function loadProducts() {
  try {
    const r = await fetch(`${API}/api/products`);
    const data = await r.json();
    if (Array.isArray(data)) {
      STATE.products = data.map(p => ({ ...p, mrp: pseudoMRP(p) }));
    }
  } catch (e) { console.error("loadProducts", e); STATE.products = []; }
  populateSearchCats();
}

async function fetchOrders() {
  try {
    const r = await fetch(`${API}/api/orders`);
    if (r.ok) return await r.json();
  } catch {}
  /* fallback to local shadow */
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch { return []; }
}

function saveOrderLocal(o) {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    list.unshift(o);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   8. PRODUCT CARD (shared)
   ═══════════════════════════════════════════════════════════════ */

function cardHTML(p) {
  const n = splitName(p.name);
  const meta = CAT_META[p.category] || { emoji: "📦" };
  const rating = pseudoRating(p);
  const mrp = p.mrp || pseudoMRP(p);
  const off = mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0;
  const fav = loadFavs()[p.id];
  const stars = "★".repeat(Math.floor(rating.stars)) + (rating.stars % 1 >= .5 ? "½" : "");

  return `
    <article class="card" data-pid="${esc(p.id)}" onclick="go('/product/${encodeURIComponent(p.id)}')">
      ${isNew(p) ? '<span class="card-new-badge">NEW</span>' : ""}
      <button class="card-fav ${fav ? 'active' : ''}" onclick="event.stopPropagation();onFav(this,'${esc(p.id)}')" aria-label="Favorite">${fav ? "❤" : "♡"}</button>
      <div class="card-image">
        <img src="${imageUrl(p)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='${fallbackSVG()}'"/>
      </div>
      <div class="card-body">
        <div class="card-cat">${meta.emoji} ${esc(p.category || "")}</div>
        <div class="card-name tamil">${esc(n.tamil)}</div>
        ${n.english ? `<div class="card-en">${esc(n.english)}</div>` : ""}
        ${p.qty ? `<div class="card-pack">📦 ${esc(p.qty)}</div>` : ""}
        <div class="card-rating">
          <span class="card-stars">${stars}</span>
          <span>${rating.stars}</span>
          <span>(${rating.reviews})</span>
        </div>
        <div class="card-price-row">
          <span class="card-price">${moneyR(p.price)}</span>
          ${off ? `<span class="card-mrp">${moneyR(mrp)}</span><span class="card-off">${off}% OFF</span>` : ""}
        </div>
        <button class="card-add" id="add-${esc(p.id)}"
                onclick="event.stopPropagation();addToCart('${esc(p.id)}')">
          + Add to Cart
        </button>
      </div>
    </article>`;
}

function onFav(btn, id) {
  const on = toggleFav(id);
  btn.classList.toggle("active", on);
  btn.textContent = on ? "❤" : "♡";
  showToast(on ? "❤ Added to favorites" : "Removed from favorites");
}
window.onFav = onFav;

/* ═══════════════════════════════════════════════════════════════
   9. PAGE: HOME
   ═══════════════════════════════════════════════════════════════ */

function renderHome(view) {
  const catCounts = {};
  STATE.products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  const topCats = FEATURED_CATEGORIES.filter(c => catCounts[c]);

  const newArrivals = STATE.products.filter(isNew).slice(0, 12);
  const bestsellers = [...STATE.products].sort(() => .5 - Math.random()).slice(0, 12);
  const deals       = [...STATE.products].sort((a, b) => b.price - a.price).slice(0, 8);
  const recs        = recommendedProducts(12);
  const hasPersonalRecs = (loadViewed().length + Object.keys(loadFavs()).filter(k => loadFavs()[k]).length + Object.keys(STATE.cart).length) > 0;

  view.innerHTML = `
    <!-- HERO -->
    <section class="home-hero">
      <div class="home-hero-in">
        <div class="hero-text">
          <div class="hero-eyebrow">🌱 Farm-direct · Tamil Nadu</div>
          <h1 class="hero-title">Pure nature,<br/>in your kitchen. <em>Straight from the farm.</em></h1>
          <p class="hero-desc">450+ authentic natural products sourced directly from Tamil farmers and artisans. Millets, cold-pressed oils, pure honey, temple spices — traditionally made, honestly priced.</p>
          <div class="hero-ctas">
            <a class="btn-hero-light" href="#/browse">Shop All Products →</a>
            <a class="btn-hero-ghost" href="#/about">Our Story</a>
          </div>
          <div class="hero-stats-row">
            <div class="h-stat"><span class="h-stat-n" data-target="${STATE.products.length}">0</span><span class="h-stat-l">Products</span></div>
            <div class="h-stat"><span class="h-stat-n" data-target="${Object.keys(catCounts).length}">0</span><span class="h-stat-l">Categories</span></div>
            <div class="h-stat"><span class="h-stat-n" data-target="100">0</span><span class="h-stat-l">% Natural</span></div>
            <div class="h-stat"><span class="h-stat-n">₹500+</span><span class="h-stat-l">Free delivery</span></div>
          </div>
        </div>
        <div class="hero-viz" id="heroViz">${renderHeroCarousel()}</div>
      </div>
    </section>

    <!-- TRUST STRIP -->
    <div class="trust-strip">
      <div class="trust-inner">
        <div class="trust-item"><div class="trust-icon">🚚</div><div><div class="trust-t">Free delivery ₹500+</div><div class="trust-d">Across Tamil Nadu</div></div></div>
        <div class="trust-item"><div class="trust-icon">🌾</div><div><div class="trust-t">100% Natural</div><div class="trust-d">No preservatives, no additives</div></div></div>
        <div class="trust-item"><div class="trust-icon">🔒</div><div><div class="trust-t">Secure Payment</div><div class="trust-d">UPI · Cards · COD</div></div></div>
        <div class="trust-item"><div class="trust-icon">↩️</div><div><div class="trust-t">7-day returns</div><div class="trust-d">On unopened items</div></div></div>
      </div>
    </div>

    <!-- FEATURED CATEGORIES -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">Shop by category</div>
          <h2 class="sec-title">Find what you love</h2>
        </div>
        <a class="sec-link" href="#/browse">View all →</a>
      </div>
      <div class="cat-tiles">
        ${topCats.map(c => {
          const m = CAT_META[c] || { emoji: "📦", c1: "#14532D", c2: "#22703E" };
          return `<a class="cat-tile" href="#/category/${encodeURIComponent(c)}" style="--c1:${m.c1};--c2:${m.c2}">
            <div class="cat-tile-emoji">${m.emoji}</div>
            <div class="cat-tile-name">${esc(c)}</div>
            <div class="cat-tile-count">${catCounts[c]} products</div>
          </a>`;
        }).join("")}
      </div>
    </section>

    ${hasPersonalRecs && recs.length ? `
    <!-- RECOMMENDED FOR YOU -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">✨ Picked for you</div>
          <h2 class="sec-title">Recommended for You</h2>
          <div class="sec-sub">Based on what you've browsed and favorited</div>
        </div>
        <a class="sec-link" href="#/browse">See more →</a>
      </div>
      <div class="hscroll">${recs.map(cardHTML).join("")}</div>
    </section>` : ""}

    ${newArrivals.length ? `
    <!-- NEW ARRIVALS -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">Just in</div>
          <h2 class="sec-title">New Arrivals</h2>
          <div class="sec-sub">Fresh additions to our catalogue</div>
        </div>
        <a class="sec-link" href="#/browse">See more →</a>
      </div>
      <div class="hscroll">${newArrivals.map(cardHTML).join("")}</div>
    </section>` : ""}

    <!-- BESTSELLERS -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">Customer picks</div>
          <h2 class="sec-title">Our Bestsellers</h2>
          <div class="sec-sub">What customers are loving this month</div>
        </div>
      </div>
      <div class="hscroll">${bestsellers.map(cardHTML).join("")}</div>
    </section>

    <!-- DEALS -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">Premium range</div>
          <h2 class="sec-title">Specialty Products</h2>
          <div class="sec-sub">Our carefully curated premium selection</div>
        </div>
      </div>
      <div class="grid">${deals.map(cardHTML).join("")}</div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="sec">
      <div class="sec-head">
        <div class="sec-title-wrap">
          <div class="sec-eyebrow">Reviews</div>
          <h2 class="sec-title">What our customers say</h2>
        </div>
      </div>
      <div class="testi-row">
        <div class="testi">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"The cold-pressed groundnut oil is just like my grandmother's — the aroma, the taste. My whole family switched over."</p>
          <div class="testi-author">
            <div class="testi-ava">L</div>
            <div><div class="testi-name">Lakshmi R.</div><div class="testi-loc">Coimbatore</div></div>
          </div>
        </div>
        <div class="testi">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"Fast delivery, well-packed, and the millet variety is incredible. I order every month now for my diabetic father."</p>
          <div class="testi-author">
            <div class="testi-ava">S</div>
            <div><div class="testi-name">Senthil K.</div><div class="testi-loc">Chennai</div></div>
          </div>
        </div>
        <div class="testi">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"Finally, a store that keeps real herbal powders and pure honey. The pricing is fair and the quality is consistent."</p>
          <div class="testi-author">
            <div class="testi-ava">P</div>
            <div><div class="testi-name">Priya M.</div><div class="testi-loc">Madurai</div></div>
          </div>
        </div>
      </div>
    </section>
  `;

  animateCounters();
  initHeroCarousel();
}

function renderHeroCarousel() {
  const slides = [
    { cat: "Millets & Grains", emoji: "🌾", tam: "தானியங்கள்", en: "Millets & Grains", tag: "Seasonal" },
    { cat: "Spices",           emoji: "🌶", tam: "மசாலா",    en: "Spices & Masalas", tag: "Traditional" },
    { cat: "Honey",            emoji: "🍯", tam: "தேன்",      en: "Pure Honey", tag: "Wild harvest" },
    { cat: "Oils & Ghee",      emoji: "🫙", tam: "எண்ணெய்",  en: "Cold-pressed Oils", tag: "Farm-direct" },
    { cat: "Herbal Powder",    emoji: "🌿", tam: "மூலிகை",   en: "Herbal Powders", tag: "Ayurvedic" },
  ];
  return `
    <div class="hv-track" id="hvTrack">
      ${slides.map(s => {
        const m = CAT_META[s.cat] || {};
        return `<div class="hv-slide" style="--c1:${m.c1};--c2:${m.c2}" data-cat="${esc(s.cat)}" onclick="go('/category/${encodeURIComponent(s.cat)}')">
          <span class="hv-tag">${esc(s.tag)}</span>
          <span class="hv-emoji">${s.emoji}</span>
          <div class="hv-tam tamil">${esc(s.tam)}</div>
          <div class="hv-en">${esc(s.en)}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="hv-dots" id="hvDots">
      ${slides.map((_, i) => `<span class="hv-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join("")}
    </div>
  `;
}

function initHeroCarousel() {
  const track = $("hvTrack"); const dots = $("hvDots"); if (!track) return;
  const slides = qa(".hv-slide", track);
  let cur = 0, auto;
  const go = i => {
    cur = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${cur * 100}%)`;
    qa(".hv-dot", dots).forEach((d, k) => d.classList.toggle("active", k === cur));
  };
  qa(".hv-dot", dots).forEach(d => d.onclick = e => { e.stopPropagation(); go(+d.dataset.idx); reset(); });
  const reset = () => { clearInterval(auto); auto = setInterval(() => go(cur + 1), 4000); };
  let sx = 0;
  track.parentElement.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  track.parentElement.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { go(dx < 0 ? cur + 1 : cur - 1); reset(); }
  }, { passive: true });
  reset();
}

function animateCounters() {
  qa(".h-stat-n").forEach(el => {
    const t = +el.dataset.target;
    if (!t) return;
    let s = 0, d = 1200;
    const step = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / d, 1);
      el.textContent = Math.floor(p * t);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = t;
    };
    requestAnimationFrame(step);
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. PAGE: BROWSE / CATEGORY
   ═══════════════════════════════════════════════════════════════ */

function renderBrowse(view, params = {}) {
  const activeCat = params.category || STATE.filters.category || "all";
  const q = params.q || "";
  const minP = Number(params.min || 0);
  const maxP = Number(params.max || 5000);
  const sort = params.sort || "default";
  STATE.filters = { category: activeCat, minP, maxP, search: q, sort };
  if ($("searchInput") && q) $("searchInput").value = q;

  const catCounts = {};
  STATE.products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });

  view.innerHTML = `
    <div class="page page-wide">
      <div class="crumbs">
        <a href="#/">Home</a><span class="sep">›</span>
        ${activeCat !== "all"
          ? `<a href="#/browse">All Products</a><span class="sep">›</span><span>${esc(activeCat)}</span>`
          : `<span>All Products</span>`}
      </div>

      <h1 class="page-title">${activeCat === "all" ? "All Products" : esc(activeCat)}</h1>
      <p class="page-sub">Browse our ${activeCat === "all" ? STATE.products.length + " " : ""}authentic, farm-direct selection</p>

      <button class="mobile-filter-btn" onclick="document.getElementById('filterPanel').classList.toggle('open')">⚡ Filters &amp; Sort</button>

      <div class="browse-wrap">
        <aside class="filter-panel" id="filterPanel">
          <div class="filter-head">
            <span class="filter-title">Filters</span>
            <button class="filter-reset" onclick="resetBrowseFilters()">Reset</button>
          </div>

          <div class="filter-section">
            <div class="filter-label">Category</div>
            <div class="filter-cats">
              <button class="filter-cat-btn ${activeCat === 'all' ? 'active' : ''}" onclick="go('/browse')">
                ✦ All Products <span class="filter-cat-count">${STATE.products.length}</span>
              </button>
              ${Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]).map(c => `
                <button class="filter-cat-btn ${activeCat === c ? 'active' : ''}" onclick="go('/category/${encodeURIComponent(c)}')">
                  ${(CAT_META[c] || {}).emoji || '📦'} ${esc(c)}
                  <span class="filter-cat-count">${catCounts[c]}</span>
                </button>`).join("")}
            </div>
          </div>

          <div class="filter-section">
            <div class="filter-label">Price Range</div>
            <div class="price-wrap">
              <div class="price-vals"><span>₹<span id="pMin">${minP}</span></span><span>₹<span id="pMax">${maxP}</span></span></div>
              <input type="range" class="rng" id="pMinR" min="0" max="5000" step="10" value="${minP}" oninput="onPriceSlide()"/>
              <input type="range" class="rng" id="pMaxR" min="0" max="5000" step="10" value="${maxP}" oninput="onPriceSlide()"/>
              <div class="price-preview">₹<span id="pMinP">${minP}</span> – ₹<span id="pMaxP">${maxP}</span></div>
              <button class="btn-primary" style="margin-top:6px" onclick="applyPriceFilter()">Apply</button>
            </div>
          </div>
        </aside>

        <div class="browse-main">
          <div class="browse-toolbar">
            <span class="brw-count" id="brwCount">Loading…</span>
            <div>
              <label style="font-size:12px;color:var(--text-3);margin-right:6px">Sort</label>
              <select class="brw-sort" id="brwSort" onchange="applySort(this.value)">
                <option value="default" ${sort === 'default' ? 'selected' : ''}>Relevance</option>
                <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Price: Low → High</option>
                <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price: High → Low</option>
                <option value="name" ${sort === 'name' ? 'selected' : ''}>Name A–Z</option>
                <option value="new" ${sort === 'new' ? 'selected' : ''}>Newest First</option>
              </select>
            </div>
          </div>
          <div class="grid" id="brwGrid"></div>
          <div class="empty hidden" id="brwEmpty">
            <div class="emoji">🔍</div>
            <h3>No products match your filters</h3>
            <p>Try clearing some filters or searching for something else</p>
            <button class="btn-primary" onclick="resetBrowseFilters()">Clear Filters</button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderBrowseGrid();
}

function renderBrowseGrid() {
  const { category, minP, maxP, search, sort } = STATE.filters;
  const s = (search || "").trim();

  let list;
  if (s) {
    // Use predictive scoring so typos still surface results.
    const qNorm = _normalize(s);
    const qTokens = qNorm.split(" ").filter(Boolean);
    list = [];
    for (const p of STATE.products) {
      if (category !== "all" && p.category !== category) continue;
      if (p.price < minP || p.price > maxP) continue;
      const sc = _scoreProduct(p, qNorm, qTokens);
      if (sc > 0) list.push([sc, p]);
    }
    list.sort((a, b) => b[0] - a[0]);
    list = list.map(x => x[1]);
  } else {
    list = STATE.products.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (p.price < minP || p.price > maxP) return false;
      return true;
    });
  }

  if (sort === "price-asc")  list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name")       list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (sort === "new")        list.sort((a, b) => new Date(b.date_added || 0) - new Date(a.date_added || 0));

  const grid = $("brwGrid"); const empty = $("brwEmpty"); const cnt = $("brwCount");
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = "";
    empty?.classList.remove("hidden");
    if (cnt) cnt.textContent = "0 results";
    return;
  }
  empty?.classList.add("hidden");
  if (cnt) cnt.innerHTML = `<strong>${list.length}</strong> of ${STATE.products.length} products`;
  grid.innerHTML = list.map(cardHTML).join("");
}

window.resetBrowseFilters = () => go("/browse");
window.applySort = v => { STATE.filters.sort = v; renderBrowseGrid(); };
window.onPriceSlide = () => {
  let min = +$("pMinR").value, max = +$("pMaxR").value;
  if (min > max) [min, max] = [max, min];
  $("pMin").textContent = min; $("pMax").textContent = max;
  $("pMinP").textContent = min; $("pMaxP").textContent = max;
};
window.applyPriceFilter = () => {
  const min = +$("pMinR").value, max = +$("pMaxR").value;
  STATE.filters.minP = Math.min(min, max);
  STATE.filters.maxP = Math.max(min, max);
  renderBrowseGrid();
};

/* ═══════════════════════════════════════════════════════════════
   11. PAGE: PRODUCT DETAIL
   ═══════════════════════════════════════════════════════════════ */

function renderProduct(view, id) {
  const p = STATE.products.find(x => x.id === id || x.code === id);
  if (!p) return render404(view);

  trackView(p.id);
  const n = splitName(p.name);
  const meta = CAT_META[p.category] || { emoji: "📦" };
  const rating = pseudoRating(p);
  const mrp = p.mrp || pseudoMRP(p);
  const off = mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0;
  const stars = "★".repeat(Math.floor(rating.stars)) + (rating.stars % 1 >= .5 ? "½" : "");

  const related = STATE.products
    .filter(x => x.id !== p.id && x.category === p.category)
    .slice(0, 12);

  view.innerHTML = `
    <div class="page page-wide">
      <div class="crumbs">
        <a href="#/">Home</a><span class="sep">›</span>
        <a href="#/category/${encodeURIComponent(p.category)}">${esc(p.category)}</a><span class="sep">›</span>
        <span>${esc(n.tamil)}</span>
      </div>

      <div class="pd-wrap">
        <div class="pd-gallery">
          <div class="pd-main-img">
            <img src="${imageUrl(p)}" alt="${esc(p.name)}" id="pdMainImg" onerror="this.src='${fallbackSVG()}'"/>
          </div>
          <div class="pd-thumbs">
            <div class="pd-thumb active"><img src="${imageUrl(p)}" alt=""/></div>
          </div>
        </div>

        <div class="pd-info">
          <div class="pd-code">Product code: ${esc(p.code || p.id)}</div>
          <div class="pd-cat">${meta.emoji} ${esc(p.category)}</div>
          <h1 class="pd-name tamil">${esc(n.tamil)}</h1>
          ${n.english ? `<div class="pd-en">${esc(n.english)}</div>` : ""}
          <div class="pd-rating">
            <span class="pd-stars">${stars}</span>
            <strong>${rating.stars}</strong>
            <span>· ${rating.reviews} reviews</span>
            <span>· ${Math.floor(rating.reviews * 1.2)} sold this month</span>
          </div>

          <div class="pd-price-block">
            <div class="pd-price-main">
              <span class="pd-price">${moneyR(p.price)}</span>
              ${off ? `<span class="pd-mrp">${moneyR(mrp)}</span><span class="pd-off">${off}% OFF</span>` : ""}
            </div>
            ${p.qty ? `<div class="pd-pack">Pack size: <strong>${esc(p.qty)}</strong></div>` : ""}
            <div class="pd-pack" style="color:var(--green);font-weight:700;margin-top:6px">✓ In stock · Ships in 1–2 days</div>
          </div>

          <div class="pd-qty-row">
            <span class="pd-qty-label">Quantity:</span>
            <div class="pd-qty">
              <button onclick="pdChangeQty(-1)">−</button>
              <span id="pdQty">1</span>
              <button onclick="pdChangeQty(1)">+</button>
            </div>
          </div>

          <div class="pd-ctas">
            <button class="btn-primary" onclick="pdAddToCart('${esc(p.id)}')">🛒 Add to Cart</button>
            <button class="btn-secondary" onclick="pdBuyNow('${esc(p.id)}')">⚡ Buy Now</button>
          </div>

          <div class="pd-feats">
            <div class="pd-feat"><span class="pd-feat-ic">🚚</span><div>Free delivery above ₹500 across Tamil Nadu</div></div>
            <div class="pd-feat"><span class="pd-feat-ic">🌿</span><div>100% natural · No preservatives</div></div>
            <div class="pd-feat"><span class="pd-feat-ic">↩️</span><div>7-day easy returns</div></div>
            <div class="pd-feat"><span class="pd-feat-ic">🔒</span><div>Secure payment · COD available</div></div>
          </div>

          <div class="pd-tabs">
            <div class="pd-tabs-nav">
              <button class="pd-tab-btn active" onclick="pdTab(this,'desc')">Description</button>
              <button class="pd-tab-btn" onclick="pdTab(this,'details')">Details</button>
              <button class="pd-tab-btn" onclick="pdTab(this,'delivery')">Delivery</button>
            </div>
            <div class="pd-tab-body" id="pdTabBody">
              <strong>About ${esc(n.tamil)}${n.english ? ' (' + esc(n.english) + ')' : ''}:</strong><br/>
              Authentic ${esc(p.category.toLowerCase())} sourced directly from farmers in Tamil Nadu.
              ${p.qty ? `Available in a ${esc(p.qty)} pack.` : ""}
              No preservatives, no additives — just pure, traditional quality.
              Ideal for daily cooking, traditional recipes, and health-conscious families.
            </div>
          </div>
        </div>
      </div>

      ${related.length ? `
        <section class="sec" style="padding-top:40px">
          <div class="sec-head">
            <div class="sec-title-wrap">
              <div class="sec-eyebrow">You might also like</div>
              <h2 class="sec-title">Similar ${esc(p.category)}</h2>
            </div>
            <a class="sec-link" href="#/category/${encodeURIComponent(p.category)}">View all →</a>
          </div>
          <div class="hscroll">${related.map(cardHTML).join("")}</div>
        </section>` : ""}
    </div>
  `;
}

let _pdQty = 1;
window.pdChangeQty = d => {
  _pdQty = Math.max(1, _pdQty + d);
  $("pdQty").textContent = _pdQty;
};
window.pdAddToCart = id => { addToCart(id, _pdQty); _pdQty = 1; $("pdQty").textContent = 1; };
window.pdBuyNow   = id => { addToCart(id, _pdQty, true); go("/checkout"); _pdQty = 1; };
window.pdTab = (btn, key) => {
  qa(".pd-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const body = $("pdTabBody");
  if (key === "details") body.innerHTML = `<strong>Product Details:</strong><ul style="margin-top:10px;padding-left:20px"><li>Code: ${esc(STATE.products[0].code || '—')}</li><li>100% natural and additive-free</li><li>Sourced from Tamil Nadu farmers</li><li>Traditionally processed</li><li>Store in a cool, dry place</li></ul>`;
  else if (key === "delivery") body.innerHTML = `<strong>Delivery Information:</strong><ul style="margin-top:10px;padding-left:20px"><li>Free delivery on orders above ₹500 within Tamil Nadu</li><li>Standard delivery: 2–4 business days</li><li>Express delivery available for Chennai, Coimbatore, Madurai</li><li>Cash on Delivery available in select pincodes</li><li>7-day returns on unopened items</li></ul>`;
  else body.innerHTML = body.dataset.desc || body.innerHTML;
};

/* ═══════════════════════════════════════════════════════════════
   12. PAGE: CART
   ═══════════════════════════════════════════════════════════════ */

function renderCart(view) {
  const items = Object.values(STATE.cart);

  if (!items.length) {
    view.innerHTML = `
      <div class="page">
        <h1 class="page-title">Your Cart</h1>
        <div class="cart-items">
          <div class="cart-empty-big">
            <div class="emoji">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Start shopping from our 450+ authentic natural products</p>
            <a class="btn-primary" href="#/browse">Shop Now →</a>
          </div>
        </div>
      </div>`;
    return;
  }

  const subtotal = cartTotal();
  const shipping = subtotal >= 500 ? 0 : 49;
  const tax = Math.round(subtotal * 0.05);      /* 5% GST illustrative */
  const grand = subtotal + shipping + tax;

  view.innerHTML = `
    <div class="page">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Cart</span></div>
      <h1 class="page-title">Your Cart (${cartCount()} items)</h1>
      <p class="page-sub">Review your selection before checkout</p>

      <div class="cart-wrap">
        <div class="cart-items">
          ${items.map(ciRowHTML).join("")}
        </div>

        <div class="cart-summary-card">
          <div class="cs-title">Order Summary</div>
          <div class="cs-row"><span>Subtotal (${cartCount()} items)</span><span>${money(subtotal)}</span></div>
          <div class="cs-row"><span>Shipping</span><span>${shipping ? money(shipping) : "FREE"}</span></div>
          <div class="cs-row"><span>GST (5%)</span><span>${money(tax)}</span></div>
          ${shipping ? `<div class="cs-row" style="color:var(--amber);font-size:11px">Add ${money(500 - subtotal)} more for free shipping</div>` : ""}
          <div class="cs-promo">
            <input type="text" placeholder="Promo code" id="promoInp"/>
            <button onclick="applyPromo()">Apply</button>
          </div>
          <div class="cs-row grand"><span>Total</span><span>${money(grand)}</span></div>
          <a class="btn-big" href="#/checkout" style="display:block;text-align:center;text-decoration:none;margin-top:14px">Proceed to Checkout →</a>
          <a class="btn-secondary" href="#/browse" style="display:block;text-align:center;text-decoration:none;margin-top:8px">← Continue Shopping</a>
          <div class="cs-sec-badge">🔒 Secure · UPI · Cards · COD</div>
        </div>
      </div>
    </div>
  `;
}

function ciRowHTML(item) {
  const n = splitName(item.name);
  const meta = CAT_META[item.category] || { emoji: "📦" };
  return `
    <div class="ci-row" data-id="${esc(item.id)}">
      <img class="ci-img-big" src="${imageUrl(item)}" alt="" onerror="this.src='${fallbackSVG(80)}'"/>
      <div class="ci-info-big">
        <div class="ci-cat-big">${meta.emoji} ${esc(item.category)}</div>
        <a class="ci-name-big tamil" href="#/product/${encodeURIComponent(item.id)}">${esc(n.tamil)}</a>
        ${n.english ? `<div class="ci-en-big">${esc(n.english)}</div>` : ""}
        ${item.qty ? `<div class="ci-pack-big">${esc(item.qty)}</div>` : ""}
        <div class="ci-price-each-big">${money(item.price)} each</div>
      </div>
      <div class="ci-actions-big">
        <div class="qty-ctl">
          <button onclick="setQty('${esc(item.id)}',${item.qty - 1});route()">−</button>
          <span>${item.qty}</span>
          <button onclick="setQty('${esc(item.id)}',${item.qty + 1});route()">+</button>
        </div>
        <button class="ci-remove" onclick="confirmRemove('${esc(item.id)}','${esc(n.tamil).replace(/'/g,"\\'")}')">Remove</button>
      </div>
      <div class="ci-total-big">${money(item.qty * item.price)}</div>
    </div>
  `;
}

window.setQty = setQty;
window.removeFromCart = removeFromCart;
window.confirmRemove = (id, name) => {
  showConfirm("Remove from cart?", `Remove ${name} from your cart?`, () => {
    removeFromCart(id); route();
  });
};
window.applyPromo = () => {
  const code = ($("promoInp")?.value || "").toUpperCase().trim();
  if (code === "AAMMII10") showToast("✓ 10% off applied at checkout");
  else if (code) showToast("❌ Invalid or expired code");
};

/* ═══════════════════════════════════════════════════════════════
   13. PAGE: CHECKOUT
   ═══════════════════════════════════════════════════════════════ */

function renderCheckout(view) {
  const items = Object.values(STATE.cart);
  if (!items.length) { go("/cart"); return; }

  const subtotal = cartTotal();
  const shipping = subtotal >= 500 ? 0 : 49;
  const tax      = Math.round(subtotal * 0.05);
  const grand    = subtotal + shipping + tax;

  const u = window._currentUser || {};
  const prefName    = u.displayName || "";
  const prefEmail   = u.email || "";
  const prefPhone   = u.phoneNumber || "";

  view.innerHTML = `
    <div class="page">
      <div class="crumbs">
        <a href="#/">Home</a><span class="sep">›</span>
        <a href="#/cart">Cart</a><span class="sep">›</span>
        <span>Checkout</span>
      </div>
      <h1 class="page-title">Checkout</h1>
      <p class="page-sub">One step away from farm-fresh goodness.</p>

      <div class="checkout-wrap">
        <form id="ckForm" onsubmit="event.preventDefault();submitCheckout()">
          <div class="ck-card">
            <div class="ck-step">
              <div class="ck-num">1</div>
              <div class="ck-title">Contact &amp; Shipping</div>
            </div>
            <div class="form-grid">
              <div class="form-row"><label>Full name</label><input class="inp" name="name" required value="${esc(prefName)}" placeholder="Thirumalai Vasan"/></div>
              <div class="form-row"><label>Phone</label><input class="inp" name="phone" required value="${esc(prefPhone)}" placeholder="+91 98765 43210"/></div>
              <div class="form-row full"><label>Email (for invoice)</label><input class="inp" type="email" name="email" required value="${esc(prefEmail)}" placeholder="you@example.com"/></div>
              <div class="form-row full"><label>Address line 1</label><input class="inp" name="addr1" required placeholder="House no, street name"/></div>
              <div class="form-row full"><label>Address line 2 (optional)</label><input class="inp" name="addr2" placeholder="Landmark, area"/></div>
              <div class="form-row"><label>City</label><input class="inp" name="city" required placeholder="Chennai"/></div>
              <div class="form-row"><label>PIN code</label><input class="inp" name="pincode" required maxlength="6" placeholder="600001"/></div>
              <div class="form-row full"><label>Delivery note (optional)</label><textarea class="inp" name="notes" placeholder="Any special instructions..."></textarea></div>
            </div>
          </div>

          <div class="ck-card">
            <div class="ck-step">
              <div class="ck-num">2</div>
              <div class="ck-title">Payment Method</div>
            </div>
            <div class="pay-grid">
              <label class="pay-opt active" data-pay="cod">
                <input type="radio" name="payment" value="cod" checked style="display:none"/>
                <span class="pay-ic">💵</span> Cash on Delivery
              </label>
              <label class="pay-opt" data-pay="upi">
                <input type="radio" name="payment" value="upi" style="display:none"/>
                <span class="pay-ic">📱</span> UPI / GPay
              </label>
              <label class="pay-opt" data-pay="card">
                <input type="radio" name="payment" value="card" style="display:none"/>
                <span class="pay-ic">💳</span> Card
              </label>
              <label class="pay-opt" data-pay="netbanking">
                <input type="radio" name="payment" value="netbanking" style="display:none"/>
                <span class="pay-ic">🏦</span> Net Banking
              </label>
            </div>
            <p style="font-size:12px;color:var(--text-3);margin-top:10px">
              Selected payment method will be processed on delivery. Online payment integration (Razorpay/Stripe) is ready in the backend — just drop in your keys.
            </p>
          </div>

          <button type="submit" class="btn-big" id="ckSubmit" style="padding:16px;font-size:15px">
            Place Order · ${money(grand)}
          </button>
          <a href="#/cart" style="display:block;text-align:center;margin-top:10px;color:var(--text-3);font-size:13px">← Back to Cart</a>
        </form>

        <div class="cart-summary-card">
          <div class="cs-title">Order Summary</div>
          <div style="max-height:260px;overflow-y:auto;margin-bottom:14px">
            ${items.map(i => {
              const n = splitName(i.name);
              return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <img src="${imageUrl(i)}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--surface-2)" onerror="this.src='${fallbackSVG(44)}'"/>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:700" class="tamil">${esc(n.tamil)}</div>
                  <div style="font-size:11px;color:var(--text-3)">Qty ${i.qty} · ${money(i.price)}</div>
                </div>
                <div style="font-size:13px;font-weight:700">${money(i.qty * i.price)}</div>
              </div>`;
            }).join("")}
          </div>
          <div class="cs-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="cs-row"><span>Shipping</span><span>${shipping ? money(shipping) : "FREE"}</span></div>
          <div class="cs-row"><span>GST (5%)</span><span>${money(tax)}</span></div>
          <div class="cs-row grand"><span>Total</span><span>${money(grand)}</span></div>
        </div>
      </div>
    </div>
  `;

  /* Payment option toggling */
  qa(".pay-opt").forEach(opt => opt.addEventListener("click", () => {
    qa(".pay-opt").forEach(o => o.classList.remove("active"));
    opt.classList.add("active");
    q("input[type=radio]", opt).checked = true;
  }));
}

async function submitCheckout() {
  const form = $("ckForm"); if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const items = Object.values(STATE.cart);
  if (!items.length) return;
  const btn = $("ckSubmit"); btn.disabled = true; btn.textContent = "Placing order…";

  const subtotal = cartTotal();
  const shipping = subtotal >= 500 ? 0 : 49;
  const tax      = Math.round(subtotal * 0.05);
  const grand    = subtotal + shipping + tax;

  const payload = {
    customer: {
      name:    data.name,
      email:   data.email,
      phone:   data.phone,
      address: [data.addr1, data.addr2, data.city, data.pincode].filter(Boolean).join(", "),
      notes:   data.notes || "",
    },
    payment:  data.payment || "cod",
    items:    items.map(i => ({
      code: i.code || i.id, name: i.name, qty: i.qty,
      price: i.price, qty_unit: i.qty_unit || "", category: i.category
    })),
    totals: { subtotal, shipping, tax, grand },
  };

  try {
    const r = await fetch(`${API}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Order failed (${r.status})`);

    const orderId = r.headers.get("X-Order-Id") || "ORD-LOCAL";
    /* Download the PDF invoice */
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${orderId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    saveOrderLocal({ id: orderId, created: Date.now(), ...payload, status: "confirmed" });
    clearCart();
    go(`/order-placed/${orderId}`);
  } catch (e) {
    showToast("❌ " + e.message);
    btn.disabled = false; btn.textContent = `Place Order · ${money(grand)}`;
  }
}
window.submitCheckout = submitCheckout;

/* ═══════════════════════════════════════════════════════════════
   14. PAGE: ORDER PLACED
   ═══════════════════════════════════════════════════════════════ */

function renderOrderPlaced(view, orderId) {
  view.innerHTML = `
    <div class="page page-narrow">
      <div class="ck-card" style="text-align:center;padding:48px 24px">
        <div style="font-size:64px;margin-bottom:12px">🎉</div>
        <h1 style="font-size:28px;font-weight:900;margin-bottom:8px">Order Confirmed!</h1>
        <p style="color:var(--text-2);margin-bottom:22px">
          Thank you for shopping with Aammii. Your invoice PDF has been downloaded to your device.
        </p>
        <div style="background:var(--surface-2);padding:16px;border-radius:var(--r);display:inline-block;margin-bottom:24px">
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1.2px">Order ID</div>
          <div style="font-size:22px;font-weight:900;color:var(--forest);font-family:monospace">${esc(orderId || "—")}</div>
        </div>
        <div style="color:var(--text-2);font-size:14px;line-height:1.8;margin-bottom:24px">
          📧 A confirmation will be emailed shortly<br/>
          📦 Expected delivery: 2–4 business days<br/>
          💬 We will call to confirm the order & address
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn-primary" href="#/orders">Track My Orders →</a>
          <a class="btn-secondary" href="#/browse">Continue Shopping</a>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   15. PAGE: ORDERS
   ═══════════════════════════════════════════════════════════════ */

async function renderOrders(view) {
  view.innerHTML = `<div class="page"><h1 class="page-title">Your Orders</h1><p class="page-sub">Loading…</p><div class="loading-state"><div class="spinner"></div></div></div>`;
  const orders = await fetchOrders();
  STATE.ordersCache = orders;

  if (!orders.length) {
    view.innerHTML = `
      <div class="page">
        <h1 class="page-title">Your Orders</h1>
        <div class="empty">
          <div class="emoji">📦</div>
          <h3>No orders yet</h3>
          <p>When you place your first order, it will appear here.</p>
          <a class="btn-primary" href="#/browse">Start Shopping →</a>
        </div>
      </div>`;
    return;
  }

  view.innerHTML = `
    <div class="page">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Orders</span></div>
      <h1 class="page-title">Your Orders</h1>
      <p class="page-sub">${orders.length} order${orders.length > 1 ? "s" : ""} · newest first</p>
      <div class="orders-list">
        ${orders.map(o => {
          const d = new Date(o.created || o.date || Date.now());
          const itemCount = (o.items || []).length;
          const total = (o.totals || {}).grand ?? (o.items || []).reduce((s, i) => s + (i.qty * i.price), 0);
          const first = (o.items || []).slice(0, 4);
          return `
            <div class="order-card">
              <div class="order-head">
                <div class="oh-block"><span class="oh-lbl">Placed</span><span class="oh-val">${d.toLocaleDateString("en-IN", {day:'numeric',month:'short',year:'numeric'})}</span></div>
                <div class="oh-block"><span class="oh-lbl">Order ID</span><span class="oh-val">${esc(o.id)}</span></div>
                <div class="oh-block"><span class="oh-lbl">Total</span><span class="oh-val">${money(total)}</span></div>
                <div class="oh-block"><span class="oh-lbl">Items</span><span class="oh-val">${itemCount}</span></div>
                <div><span class="order-status">${esc(o.status || "confirmed")}</span></div>
              </div>
              <div class="order-body">
                <div class="order-items-mini">
                  ${first.map(i => {
                    const prod = STATE.products.find(x => x.id === (i.code || i.id) || x.code === (i.code || i.id));
                    const src = imageUrl(prod || { image: i.image, category: i.category });
                    return `<img class="omi" src="${src}" onerror="this.src='${fallbackSVG(60, i.category)}'" alt=""/>`;
                  }).join("")}
                  ${itemCount > 4 ? `<div class="omi" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--text-3);font-size:13px">+${itemCount - 4}</div>` : ""}
                </div>
                <div class="order-actions">
                  <a class="btn-primary" href="#/order/${encodeURIComponent(o.id)}">View Details</a>
                  <button class="btn-secondary" onclick="reorderItems('${esc(o.id)}')">Buy Again</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderOrderDetail(view, id) {
  const o = (STATE.ordersCache || []).find(x => x.id === id);
  if (!o) {
    view.innerHTML = `<div class="page"><div class="empty"><div class="emoji">🤔</div><h3>Order not found</h3><a class="btn-primary" href="#/orders">View all orders</a></div></div>`;
    return;
  }
  const d = new Date(o.created || Date.now());
  view.innerHTML = `
    <div class="page">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><a href="#/orders">Orders</a><span class="sep">›</span><span>${esc(o.id)}</span></div>
      <h1 class="page-title">Order ${esc(o.id)}</h1>
      <p class="page-sub">Placed on ${d.toLocaleString("en-IN")}</p>

      <div class="cart-wrap">
        <div class="cart-items">
          ${(o.items || []).map(i => {
            const prod = STATE.products.find(x => x.id === (i.code || i.id) || x.code === (i.code || i.id));
            const src = imageUrl(prod || { image: i.image, category: i.category });
            return `
            <div class="ci-row">
              <img class="ci-img-big" src="${src}" onerror="this.src='${fallbackSVG(80, i.category)}'" alt=""/>
              <div class="ci-info-big">
                <div class="ci-cat-big">${esc(i.category || "")}</div>
                <div class="ci-name-big tamil">${esc(splitName(i.name).tamil)}</div>
                <div class="ci-en-big">${esc(splitName(i.name).english)}</div>
                <div class="ci-price-each-big">${money(i.price)} × ${i.qty}</div>
              </div>
              <div></div>
              <div class="ci-total-big">${money(i.price * i.qty)}</div>
            </div>`;
          }).join("")}
        </div>
        <div class="cart-summary-card">
          <div class="cs-title">Delivery</div>
          <div style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:14px">
            <strong>${esc(o.customer?.name || "")}</strong><br/>
            ${esc(o.customer?.phone || "")}<br/>
            ${esc(o.customer?.address || "")}
          </div>
          <div class="cs-row"><span>Subtotal</span><span>${money(o.totals?.subtotal || 0)}</span></div>
          <div class="cs-row"><span>Shipping</span><span>${(o.totals?.shipping) ? money(o.totals.shipping) : "FREE"}</span></div>
          <div class="cs-row"><span>Tax</span><span>${money(o.totals?.tax || 0)}</span></div>
          <div class="cs-row grand"><span>Total</span><span>${money(o.totals?.grand || 0)}</span></div>
          <div class="cs-row" style="margin-top:8px"><span>Payment</span><span>${esc((o.payment || "cod").toUpperCase())}</span></div>
          <div class="cs-row"><span>Status</span><span class="order-status">${esc(o.status || "confirmed")}</span></div>
        </div>
      </div>
    </div>
  `;
}

window.reorderItems = async (id) => {
  const o = (STATE.ordersCache || []).find(x => x.id === id);
  if (!o) return;
  (o.items || []).forEach(i => {
    const p = STATE.products.find(x => x.id === (i.code || i.id));
    if (p) addToCart(p.id, i.qty, true);
  });
  showToast(`✓ ${(o.items || []).length} items added to cart`);
  go("/cart");
};

/* ═══════════════════════════════════════════════════════════════
   16. PAGE: ACCOUNT
   ═══════════════════════════════════════════════════════════════ */

function renderAccount(view) {
  const u = window._currentUser;
  if (!u) {
    view.innerHTML = `
      <div class="page page-narrow">
        <div class="ck-card" style="text-align:center;padding:48px">
          <div style="font-size:56px;margin-bottom:10px">👤</div>
          <h2 style="font-size:22px;margin-bottom:8px">Sign in to view your account</h2>
          <p style="color:var(--text-2);margin-bottom:20px">Sign in to track orders, save favorites, and check out faster.</p>
          <button class="btn-primary" onclick="openAuth('email')">Sign In / Create Account</button>
        </div>
      </div>`;
    return;
  }

  const name = u.displayName || u.email?.split("@")[0] || "User";
  const avatar = u.photoURL
    ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer"/>`
    : name.charAt(0).toUpperCase();

  const favCount = Object.values(loadFavs()).filter(Boolean).length;

  view.innerHTML = `
    <div class="page page-wide">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Account</span></div>
      <h1 class="page-title">Your Account</h1>

      <div class="acc-wrap-page">
        <aside class="acc-side">
          <a class="acc-side-link active" href="#/account">👤 Profile</a>
          <a class="acc-side-link" href="#/orders">📦 Orders</a>
          <a class="acc-side-link" href="#/admin">⚙️ Admin</a>
          <div class="dd-sep"></div>
          <button class="acc-side-link" onclick="doSignOut()">🚪 Sign Out</button>
        </aside>
        <div>
          <div class="acc-profile-head">
            <div class="acc-big-avatar">${avatar}</div>
            <div>
              <div style="font-size:22px;font-weight:900">${esc(name)}</div>
              <div style="font-size:13px;opacity:.8">${esc(u.email || u.phoneNumber || "")}</div>
            </div>
          </div>

          <div class="admin-tiles">
            <div class="admin-tile"><div class="admin-tile-n">${STATE.ordersCache.length || 0}</div><div class="admin-tile-l">Orders</div></div>
            <div class="admin-tile"><div class="admin-tile-n">${cartCount()}</div><div class="admin-tile-l">In Cart</div></div>
            <div class="admin-tile"><div class="admin-tile-n">${favCount}</div><div class="admin-tile-l">Favorites</div></div>
          </div>

          <div class="ck-card">
            <div class="ck-title" style="margin-bottom:14px">Profile</div>
            <div class="form-grid">
              <div class="form-row"><label>Name</label><input class="inp" value="${esc(name)}" disabled/></div>
              <div class="form-row"><label>Email</label><input class="inp" value="${esc(u.email || '')}" disabled/></div>
              <div class="form-row"><label>Phone</label><input class="inp" value="${esc(u.phoneNumber || '')}" disabled/></div>
              <div class="form-row"><label>Default location</label>
                <select class="inp" id="locSel" onchange="changeLocation(this.value)">
                  ${["Tamil Nadu","Chennai","Coimbatore","Madurai","Tiruchirapalli","Salem","Erode","Tirunelveli","Other"].map(l =>
                    `<option ${l === STATE.location ? "selected" : ""}>${l}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>

          <div class="ck-card">
            <div class="ck-title" style="margin-bottom:14px">Preferences</div>
            <div class="form-row"><label>Theme</label><button class="btn-secondary" onclick="toggleTheme()" style="width:max-content">Toggle Light / Dark</button></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   17. PAGE: ADMIN
   ═══════════════════════════════════════════════════════════════ */

function renderAdmin(view) {
  const byCat = {};
  STATE.products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  const newCount = STATE.products.filter(isNew).length;
  const priceSum = STATE.products.reduce((s, p) => s + p.price, 0);

  view.innerHTML = `
    <div class="page page-wide">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Admin</span></div>
      <h1 class="page-title">Admin Panel</h1>
      <p class="page-sub">Manage your catalogue, upload price lists, and oversee the store.</p>

      <div class="admin-tiles">
        <div class="admin-tile"><div class="admin-tile-n">${STATE.products.length}</div><div class="admin-tile-l">Total Products</div></div>
        <div class="admin-tile"><div class="admin-tile-n">${Object.keys(byCat).length}</div><div class="admin-tile-l">Categories</div></div>
        <div class="admin-tile"><div class="admin-tile-n">${newCount}</div><div class="admin-tile-l">New This Week</div></div>
        <div class="admin-tile"><div class="admin-tile-n">${money(Math.round(priceSum / STATE.products.length || 0))}</div><div class="admin-tile-l">Avg Price</div></div>
      </div>

      <div class="ck-card">
        <div class="ck-title" style="margin-bottom:10px">📄 Upload PDF Catalogue</div>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">
          Upload your supplier's price list PDF. The system will auto-extract product names, codes, categories,
          and prices, then regenerate the catalogue.
        </p>
        <label class="admin-upload">
          <div class="admin-up-ic">📤</div>
          <div class="admin-up-t">Drop PDF here or click to upload</div>
          <div class="admin-up-s">Accepts .pdf · up to 20MB · Text or scanned (OCR supported)</div>
          <span class="admin-up-btn" id="upBtnText">Choose PDF File</span>
          <input type="file" id="pdfInput" accept=".pdf" hidden onchange="uploadPDF(this)"/>
        </label>
        <div class="progress-wrap hidden" id="progressWrap">
          <div id="progressMsg">Starting upload…</div>
          <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        </div>
      </div>

      <div class="ck-card">
        <div class="ck-title" style="margin-bottom:8px">🖼 Manage Product Images</div>
        <p style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:14px">
          Paste a public image URL (e.g. from a CDN, Unsplash, or your own host) for any product.
          Leave empty to use the auto-generated category illustration.
        </p>
        <input class="inp" id="imgMgrSearch" placeholder="🔎 Find product by name, code, or category…" oninput="renderImgMgr()" style="margin-bottom:12px"/>
        <div id="imgMgrList" class="img-mgr-list"></div>
      </div>

      <div class="ck-card">
        <div class="ck-title" style="margin-bottom:14px">📊 Catalogue breakdown</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
          ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `
            <a class="dd-item" href="#/category/${encodeURIComponent(c)}" style="display:flex;justify-content:space-between;align-items:center">
              <span>${(CAT_META[c] || {}).emoji || '📦'} ${esc(c)}</span>
              <span style="color:var(--text-3);font-weight:700">${n}</span>
            </a>`).join("")}
        </div>
      </div>
    </div>
  `;

  renderImgMgr();
}

/* ── Product Image Manager (admin) ─────────────────────────────── */
function renderImgMgr() {
  const list = $("imgMgrList"); if (!list) return;
  const q = ($("imgMgrSearch")?.value || "").toLowerCase().trim();
  let prods = STATE.products;
  if (q) {
    prods = prods.filter(p => {
      const hay = [p.name, p.code, p.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  prods = prods.slice(0, 30);
  if (!prods.length) {
    list.innerHTML = `<div class="empty" style="padding:24px"><p>No matching products</p></div>`;
    return;
  }
  list.innerHTML = prods.map(p => {
    const n = splitName(p.name);
    return `
      <div class="img-mgr-row">
        <img class="img-mgr-thumb" src="${imageUrl(p)}" alt="" onerror="this.src='${fallbackSVG(60, p.category)}'"/>
        <div class="img-mgr-info">
          <div class="img-mgr-code">${esc(p.code || p.id)} · ${esc(p.category || "")}</div>
          <div class="img-mgr-name tamil">${esc(n.tamil)}</div>
        </div>
        <input class="inp img-mgr-url" data-pid="${esc(p.id)}" type="url"
               value="${esc(p.image && (p.image.startsWith('http')||p.image.startsWith('data:')) ? p.image : '')}"
               placeholder="https://example.com/image.jpg"/>
        <button class="btn-primary img-mgr-save" onclick="saveProductImage('${esc(p.id)}', this)">Save</button>
      </div>
    `;
  }).join("");
}
window.renderImgMgr = renderImgMgr;

async function saveProductImage(pid, btn) {
  const input = btn.parentElement.querySelector(`input.img-mgr-url[data-pid="${pid}"]`);
  if (!input) return;
  const url = input.value.trim();
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const r = await fetch(`${API}/api/products/${encodeURIComponent(pid)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Save failed");
    // update local state
    const p = STATE.products.find(x => x.id === pid || x.code === pid);
    if (p) p.image = data.product?.image ?? url;
    showToast(url ? "✓ Image URL saved" : "✓ Reset to default");
    btn.textContent = "Saved ✓";
    setTimeout(() => { btn.disabled = false; btn.textContent = "Save"; }, 1200);
    // refresh thumbnail
    const row = btn.closest(".img-mgr-row");
    const thumb = row?.querySelector(".img-mgr-thumb");
    if (thumb) thumb.src = imageUrl(p);
  } catch (e) {
    btn.disabled = false; btn.textContent = "Save";
    showToast("❌ " + e.message);
  }
}
window.saveProductImage = saveProductImage;

async function uploadPDF(input) {
  const f = input.files[0]; if (!f) return;
  const wrap = $("progressWrap"); const msg = $("progressMsg"); const fill = $("progressFill");
  const btn = $("upBtnText");
  wrap?.classList.remove("hidden");
  btn.textContent = f.name;
  let w = 0;
  const steps = ["📄 Reading PDF…", "🔍 Scanning tables…", "🏷 Matching products…", "🎨 Generating images…", "✨ Finishing up…"];
  let si = 0;
  const iv = setInterval(() => {
    w = Math.min(w + Math.random() * 6 + 2, 88);
    fill.style.width = w + "%";
    const ns = Math.floor((w / 88) * (steps.length - 1));
    if (ns !== si) { si = ns; msg.textContent = steps[si]; }
  }, 250);

  try {
    const fd = new FormData(); fd.append("pdf", f);
    const r = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
    clearInterval(iv);
    fill.style.width = "100%";
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || "Upload failed");
    msg.textContent = `✓ ${data.note || data.count + " products loaded"}`;
    showToast(`✓ ${data.count} products ready`);
    await loadProducts();
    setTimeout(() => route(), 800);
  } catch (e) {
    clearInterval(iv);
    msg.textContent = "❌ " + e.message;
    showToast("❌ " + e.message);
  }
}
window.uploadPDF = uploadPDF;

/* ═══════════════════════════════════════════════════════════════
   18. PAGE: ABOUT
   ═══════════════════════════════════════════════════════════════ */

function renderAbout(view) {
  view.innerHTML = `
    <div class="page page-narrow">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Our Story</span></div>

      <div class="about-hero">
        <h1>The Aammii Story</h1>
        <p>அம்மி — a grandmother's grinding stone. Aammii Tharcharbu Santhai exists to bring that
        same authentic, uncompromised quality of traditional Tamil food and lifestyle to your door.
        Direct from farmers, processed the old way, priced honestly.</p>
      </div>

      <div class="about-grid">
        <div class="about-item">
          <div class="about-item-ic">🌱</div>
          <h3>Farm-direct</h3>
          <p>We partner directly with 40+ small farmers across Tamil Nadu. No middlemen, no markup games. They earn more, you pay less, everyone wins.</p>
        </div>
        <div class="about-item">
          <div class="about-item-ic">🏺</div>
          <h3>Traditional processing</h3>
          <p>Cold-pressed oils. Sun-dried millets. Stone-ground spices. We don't chase shelf life — we chase taste, aroma, and nutrition.</p>
        </div>
        <div class="about-item">
          <div class="about-item-ic">🤝</div>
          <h3>Honest pricing</h3>
          <p>What you see is what you pay. No inflated MRPs, no fake discounts. We believe trust is built one transparent transaction at a time.</p>
        </div>
        <div class="about-item">
          <div class="about-item-ic">📞</div>
          <h3>Personal service</h3>
          <p>Call us. Seriously. Every order is reviewed by a human, every customer's name gets remembered, every issue gets resolved the same day.</p>
        </div>
      </div>

      <div class="ck-card mt-lg" style="text-align:center">
        <h3 style="font-size:20px;margin-bottom:10px">Join our journey</h3>
        <p style="color:var(--text-2);margin-bottom:16px">Discover 450+ authentic products. Let's bring traditional Tamil natural goodness back to your kitchen.</p>
        <a href="#/browse" class="btn-primary">Shop Now →</a>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   19. PAGE: CONTACT
   ═══════════════════════════════════════════════════════════════ */

function renderContact(view) {
  view.innerHTML = `
    <div class="page page-narrow">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">›</span><span>Contact</span></div>
      <h1 class="page-title">Get in touch</h1>
      <p class="page-sub">We typically respond within a few hours.</p>

      <div class="contact-grid">
        <div class="contact-card">
          <h3 style="font-size:17px;margin-bottom:16px">Reach us directly</h3>
          <div class="contact-item"><span class="contact-ic">📞</span><div><div class="contact-t">Call</div><div class="contact-v">+91 95006 55548</div></div></div>
          <div class="contact-item"><span class="contact-ic">💬</span><div><div class="contact-t">WhatsApp</div><div class="contact-v"><a href="https://wa.me/919500655548">Chat with us →</a></div></div></div>
          <div class="contact-item"><span class="contact-ic">✉️</span><div><div class="contact-t">Email</div><div class="contact-v">orders@aammii.com</div></div></div>
          <div class="contact-item"><span class="contact-ic">📍</span><div><div class="contact-t">Visit</div><div class="contact-v">Tamil Nadu, India</div></div></div>
          <div class="contact-item"><span class="contact-ic">🕒</span><div><div class="contact-t">Hours</div><div class="contact-v">Mon–Sat · 9am–8pm</div></div></div>
        </div>
        <div class="contact-card">
          <h3 style="font-size:17px;margin-bottom:16px">Send a message</h3>
          <form onsubmit="event.preventDefault();showToast('✓ Message sent! We will reply within a few hours.');this.reset()">
            <div class="form-row" style="margin-bottom:10px"><label>Name</label><input class="inp" required/></div>
            <div class="form-row" style="margin-bottom:10px"><label>Email</label><input class="inp" type="email" required/></div>
            <div class="form-row" style="margin-bottom:10px"><label>Subject</label><input class="inp" required/></div>
            <div class="form-row" style="margin-bottom:14px"><label>Message</label><textarea class="inp" required style="min-height:120px"></textarea></div>
            <button class="btn-primary" type="submit">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   20. 404
   ═══════════════════════════════════════════════════════════════ */

function render404(view) {
  view.innerHTML = `
    <div class="page page-narrow">
      <div class="empty">
        <div class="emoji">🌿</div>
        <h3 style="font-size:24px">Page not found</h3>
        <p>This page wandered off into the forest.</p>
        <a class="btn-primary" href="#/">← Back home</a>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   21. GLOBAL SEARCH — PREDICTIVE / FUZZY / TYPO-TOLERANT
   ═══════════════════════════════════════════════════════════════ */

const _SEARCH = { idx: -1, list: [], term: "", lastQ: "" };

/* Tokenizes & normalizes a string for indexing. */
function _normalize(s) {
  return (s || "").toString().toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

/* Tamil → Roman transliteration. Lets users type "saamai", "samai", or
   "noodles" and match Tamil-only product names like "சாமை நூடல்ஸ்".
   Casual TN romanization: ச → "s", ட → "t", த → "th", etc. */
const _TA_VOWELS = {
  "அ":"a","ஆ":"aa","இ":"i","ஈ":"ii","உ":"u","ஊ":"uu",
  "எ":"e","ஏ":"ee","ஐ":"ai","ஒ":"o","ஓ":"oo","ஔ":"au","ஃ":"h"
};
const _TA_SIGNS = {
  "ா":"aa","ி":"i","ீ":"ii","ு":"u","ூ":"uu",
  "ெ":"e","ே":"ee","ை":"ai","ொ":"o","ோ":"oo","ௌ":"au"
};
const _TA_CONS = {
  "க":"k","ங":"ng","ச":"s","ஞ":"nj","ட":"t","ண":"n",
  "த":"th","ந":"n","ப":"p","ம":"m","ய":"y","ர":"r",
  "ல":"l","வ":"v","ழ":"zh","ள":"l","ற":"r","ன":"n",
  "ஶ":"sh","ஷ":"sh","ஸ":"s","ஹ":"h","ஜ":"j"
};
const _TA_VIRAMA = "்";

function _transliterateTamil(s) {
  if (!s) return "";
  if (!/[஀-௿]/.test(s)) return "";
  const ch = [...s];
  let out = "";
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i], n = ch[i + 1];
    if (_TA_CONS[c]) {
      out += _TA_CONS[c];
      if (n === _TA_VIRAMA) { i++; }                 // pure consonant
      else if (_TA_SIGNS[n]) { out += _TA_SIGNS[n]; i++; }
      else { out += "a"; }                           // inherent vowel
    } else if (_TA_VOWELS[c]) {
      out += _TA_VOWELS[c];
    } else if (/\s/.test(c)) {
      out += " ";
    } else if (/[A-Za-z0-9]/.test(c)) {
      out += c.toLowerCase();
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/* Collapse repeated vowels (saamai → samai, oo → o) so users don't have
   to guess long-vowel doubling when typing Tamil words in English. */
function _collapseVowels(s) {
  return (s || "").replace(/([aeiou])\1+/g, "$1");
}

/* Levenshtein edit distance (capped at maxD for speed). */
function _editDistance(a, b, maxD = 3) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > maxD) return maxD + 1;
  if (!al) return bl; if (!bl) return al;
  let prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxD) return maxD + 1;
    prev = cur;
  }
  return prev[bl];
}

/* Cache the romanized search index per product so we transliterate once. */
function _searchHay(p) {
  if (p._hay) return p._hay;
  const name  = _normalize(p.name);
  const cat   = _normalize(p.category);
  const code  = _normalize(p.code || p.id);
  const trans = _normalize(_transliterateTamil(p.name));
  return (p._hay = { name, cat, code, trans });
}

/* Score a single product against the query. Higher = better. 0 = no match. */
function _scoreProduct(p, qNorm, qTokens) {
  const h = _searchHay(p);
  const hay      = `${h.name} ${h.cat} ${h.code} ${h.trans}`;
  const hayLoose = _collapseVowels(hay);
  const qLoose   = _collapseVowels(qNorm);

  let score = 0;
  // Exact substring is strongest. Loose match handles long-vowel variants.
  if (hay.includes(qNorm))         score += 100;
  else if (hayLoose.includes(qLoose)) score += 80;
  // Code exact / starts-with is very strong.
  if (h.code === qNorm) score += 200;
  if (h.code.startsWith(qNorm)) score += 60;
  // Token-by-token contribution: prefix > inclusion > fuzzy.
  const words = hay.split(" ");
  const wordsLoose = words.map(_collapseVowels);
  for (const t of qTokens) {
    if (!t) continue;
    const tLoose = _collapseVowels(t);
    let best = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]; if (!w) continue;
      const wLoose = wordsLoose[i];
      if (w === t)                 best = Math.max(best, 50);
      else if (w.startsWith(t))    best = Math.max(best, 35);
      else if (w.includes(t))      best = Math.max(best, 20);
      else if (wLoose === tLoose)        best = Math.max(best, 45);
      else if (wLoose.startsWith(tLoose))best = Math.max(best, 32);
      else if (wLoose.includes(tLoose))  best = Math.max(best, 18);
      else if (t.length >= 4) {
        // Fuzzy — typo tolerance, against the loose form for vowel slack.
        const maxD = t.length <= 5 ? 1 : t.length <= 8 ? 2 : 3;
        const d = _editDistance(wLoose, tLoose, maxD);
        if (d <= maxD) best = Math.max(best, 18 - d * 4);
      }
    }
    score += best;
  }
  // Prefer category match.
  if (qTokens.some(t => t && h.cat.includes(t))) score += 4;
  // Tiny popularity bias — favor newer / cheaper items as tiebreaker.
  if (isNew(p)) score += 1;
  return score;
}

/* Returns top N matching products + categories + a "did you mean" suggestion. */
function searchProducts(rawQ, limit = 8) {
  const qNorm = _normalize(rawQ);
  if (!qNorm) return { products: [], categories: [], didYouMean: "" };
  const qTokens = qNorm.split(" ").filter(Boolean);

  const cat = $("searchCat")?.value || "";
  const pool = cat ? STATE.products.filter(p => p.category === cat) : STATE.products;

  const scored = [];
  for (const p of pool) {
    const s = _scoreProduct(p, qNorm, qTokens);
    if (s > 0) scored.push([s, p]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const products = scored.slice(0, limit).map(x => x[1]);

  // Matching categories
  const categories = Object.keys(CAT_META)
    .filter(c => qTokens.some(t => _normalize(c).includes(t)))
    .slice(0, 4);

  // "Did you mean" — when no strong matches, find closest product / category word.
  let didYouMean = "";
  if (scored.length === 0 || scored[0][0] < 25) {
    const allWords = new Set();
    for (const p of STATE.products) {
      for (const w of _normalize(p.name).split(" ")) if (w.length >= 3) allWords.add(w);
      for (const w of _normalize(p.category).split(" ")) if (w.length >= 3) allWords.add(w);
    }
    let bestD = 99, bestW = "";
    for (const w of allWords) {
      const d = _editDistance(w, qNorm, 4);
      if (d < bestD) { bestD = d; bestW = w; }
    }
    if (bestW && bestD <= 3 && bestW !== qNorm) didYouMean = bestW;
  }

  return { products, categories, didYouMean };
}

/* Personal recommendations: recently viewed → category overlap → popular. */
const VIEWED_KEY = "aammii-recent";
function trackView(pid) {
  try {
    const arr = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]")
      .filter(x => x !== pid);
    arr.unshift(pid);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(arr.slice(0, 30)));
  } catch {}
}
function loadViewed() {
  try { return JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]"); }
  catch { return []; }
}
function recommendedProducts(limit = 12) {
  const viewedIds = new Set(loadViewed());
  const viewed = STATE.products.filter(p => viewedIds.has(p.id));
  const seenCats = new Set(viewed.map(p => p.category));
  const inCat = STATE.products.filter(p => seenCats.has(p.category) && !viewedIds.has(p.id));
  const fav = loadFavs();
  const favProds = STATE.products.filter(p => fav[p.id]);
  const cartIds = new Set(Object.keys(STATE.cart));
  const inCart  = STATE.products.filter(p => cartIds.has(p.id));
  const favCats = new Set([...favProds, ...inCart].map(p => p.category));
  const favBased = STATE.products.filter(p => favCats.has(p.category) && !viewedIds.has(p.id));

  const seen = new Set();
  const out = [];
  const push = arr => arr.forEach(p => { if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); } });
  push(favBased); push(inCat);
  // Top-up with random popular if not enough.
  if (out.length < limit) push([...STATE.products].sort(() => .5 - Math.random()));
  return out.slice(0, limit);
}

/* === Search UI handlers === */

let _searchDebounce;
function onSearchInput() {
  const v = $("searchInput")?.value || "";
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => renderSearchSuggest(v), 110);
}
window.onSearchInput = onSearchInput;
window.onSearchCatChange = () => {
  const v = $("searchInput")?.value || "";
  renderSearchSuggest(v);
};

function onSearchKey(e) {
  const box = $("searchSuggest"); if (!box || !box.classList.contains("open")) return;
  const rows = qa(".ss-row", box);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _SEARCH.idx = Math.min(_SEARCH.idx + 1, rows.length - 1);
    rows.forEach((r, i) => r.classList.toggle("active", i === _SEARCH.idx));
    rows[_SEARCH.idx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _SEARCH.idx = Math.max(_SEARCH.idx - 1, 0);
    rows.forEach((r, i) => r.classList.toggle("active", i === _SEARCH.idx));
    rows[_SEARCH.idx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    if (_SEARCH.idx >= 0 && rows[_SEARCH.idx]) {
      e.preventDefault();
      rows[_SEARCH.idx].click();
    }
  } else if (e.key === "Escape") {
    closeSearchSuggest();
  }
}
window.onSearchKey = onSearchKey;

function renderSearchSuggest(rawQ) {
  const box = $("searchSuggest"); if (!box) return;
  const q = (rawQ || "").trim();
  _SEARCH.idx = -1; _SEARCH.term = q;

  if (!q) {
    // On focus with empty query — show recommendations.
    const recs = recommendedProducts(6);
    if (!recs.length) { closeSearchSuggest(); return; }
    box.innerHTML = `
      <div class="ss-section-title">✨ Recommended for you</div>
      ${recs.map(p => ssRow(p)).join("")}
    `;
    box.classList.add("open");
    _SEARCH.list = recs.map(p => p.id);
    return;
  }

  const { products, categories, didYouMean } = searchProducts(q, 8);
  let html = "";
  if (didYouMean && products.length === 0) {
    html += `<div class="ss-did-mean">Did you mean
      <a href="javascript:void(0)" onclick="useSearchTerm('${esc(didYouMean)}')">${esc(didYouMean)}</a>?</div>`;
  } else if (didYouMean) {
    html += `<div class="ss-did-mean">Showing best matches. Did you mean
      <a href="javascript:void(0)" onclick="useSearchTerm('${esc(didYouMean)}')">${esc(didYouMean)}</a>?</div>`;
  }
  if (categories.length) {
    html += `<div class="ss-section-title">Categories</div>`;
    html += categories.map(c => `
      <div class="ss-row" onclick="goToCategory('${esc(c)}');closeSearchSuggest()">
        <div class="ss-img" style="background:linear-gradient(135deg,${(CAT_META[c]||{}).c1||'#14532D'},${(CAT_META[c]||{}).c2||'#22703E'});display:flex;align-items:center;justify-content:center;font-size:20px">${(CAT_META[c]||{}).emoji||'📦'}</div>
        <div class="ss-info"><div class="ss-name">${esc(c)}</div><div class="ss-meta">Browse all ${esc(c)}</div></div>
      </div>`).join("");
  }
  if (products.length) {
    html += `<div class="ss-section-title">Products</div>`;
    html += products.map(p => ssRow(p)).join("");
  }
  if (!products.length && !categories.length) {
    html += `<div class="ss-empty">No results. Press Enter to search anyway.</div>`;
  }
  box.innerHTML = html;
  box.classList.add("open");
  _SEARCH.list = products.map(p => p.id);
}

function ssRow(p) {
  const n = splitName(p.name);
  return `
    <div class="ss-row" onclick="go('/product/${encodeURIComponent(p.id)}');closeSearchSuggest()">
      <img class="ss-img" src="${imageUrl(p)}" onerror="this.src='${fallbackSVG(40, p.category)}'" alt=""/>
      <div class="ss-info">
        <div class="ss-name tamil">${esc(n.tamil)}</div>
        <div class="ss-meta">${esc(n.english || p.category || "")}${p.qty ? " · " + esc(p.qty) : ""}</div>
      </div>
      <div class="ss-price">${moneyR(p.price)}</div>
    </div>`;
}

function closeSearchSuggest() {
  $("searchSuggest")?.classList.remove("open");
  _SEARCH.idx = -1;
}
window.closeSearchSuggest = closeSearchSuggest;

function useSearchTerm(t) {
  const inp = $("searchInput"); if (!inp) return;
  inp.value = t;
  renderSearchSuggest(t);
}
window.useSearchTerm = useSearchTerm;

function goToCategory(c) { go(`/category/${encodeURIComponent(c)}`); }
window.goToCategory = goToCategory;

function submitSearch() {
  const s   = $("searchInput")?.value || "";
  const cat = $("searchCat")?.value || "";
  closeSearchSuggest();
  const path = cat ? `/category/${encodeURIComponent(cat)}` : "/browse";
  go(path + (s ? `?q=${encodeURIComponent(s)}` : ""));
}
window.submitSearch = submitSearch;
window.runSearch = submitSearch;  // back-compat

/* Click-outside to close. */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search")) closeSearchSuggest();
}, true);

function populateSearchCats() {
  const sel = $("searchCat"); if (!sel) return;
  const cats = Object.keys(CAT_META).sort();
  sel.innerHTML = `<option value="">All Categories</option>` +
    cats.map(c => `<option>${esc(c)}</option>`).join("");
}

/* ═══════════════════════════════════════════════════════════════
   22. MOBILE NAV
   ═══════════════════════════════════════════════════════════════ */

function buildMobileNav() {
  const body = $("mobileNavBody"); if (!body) return;
  const main = [
    { n: "🏠 Home",          h: "/" },
    { n: "🛒 All Products",  h: "/browse" },
    { n: "📦 Your Orders",   h: "/orders" },
    { n: "👤 Account",       h: "/account" },
    { n: "⚙️ Admin",         h: "/admin" },
    { n: "📖 Our Story",     h: "/about" },
    { n: "📞 Contact",       h: "/contact" },
  ];
  const cats = Object.keys(CAT_META).sort();
  body.innerHTML =
    `<div class="mn-section">Menu</div>` +
    main.map(m => `<a class="mn-link" href="#${m.h}" onclick="toggleMobileNav()">${m.n}</a>`).join("") +
    `<div class="mn-section">Shop by Category</div>` +
    cats.map(c => `<a class="mn-link" href="#/category/${encodeURIComponent(c)}" onclick="toggleMobileNav()">${(CAT_META[c] || {}).emoji || '📦'} ${esc(c)}</a>`).join("");
}

function toggleMobileNav() {
  $("mobileNav")?.classList.toggle("open");
  $("mobileNavOverlay")?.classList.toggle("open");
}
window.toggleMobileNav = toggleMobileNav;

/* ═══════════════════════════════════════════════════════════════
   23. CART DRAWER
   ═══════════════════════════════════════════════════════════════ */

function openCartDrawer(p) {
  const body = $("drawerBody"); if (!body) return;
  const n = splitName(p.name);
  const total = cartTotal();
  body.innerHTML = `
    <div class="dr-item">
      <img class="dr-img" src="${imageUrl(p)}" onerror="this.src='${fallbackSVG(52)}'"/>
      <div class="dr-info">
        <div class="dr-name tamil">${esc(n.tamil)}</div>
        <div class="dr-meta">${esc(n.english)} · ${esc(p.qty || "")}</div>
        <div class="dr-price">${money(p.price)}</div>
      </div>
    </div>
    <div style="padding-top:14px;font-size:13px;color:var(--text-2)">
      <div style="display:flex;justify-content:space-between"><span>Items in cart</span><strong>${cartCount()}</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:var(--text);margin-top:6px"><span>Subtotal</span><span>${money(total)}</span></div>
    </div>
  `;
  $("cartDrawer").classList.add("open");
  $("drawerBack").classList.add("visible");
  clearTimeout(window._drawerTimer);
  window._drawerTimer = setTimeout(closeCartDrawer, 5000);
}
function closeCartDrawer() {
  $("cartDrawer")?.classList.remove("open");
  $("drawerBack")?.classList.remove("visible");
  clearTimeout(window._drawerTimer);
}
window.closeCartDrawer = closeCartDrawer;

/* ═══════════════════════════════════════════════════════════════
   24. LOCATION
   ═══════════════════════════════════════════════════════════════ */

function changeLocation(loc) {
  if (loc) {
    STATE.location = loc;
    localStorage.setItem("aammii-loc", loc);
    const el = $("deliverLoc"); if (el) el.textContent = loc;
    showToast(`📍 Delivering to ${loc}`);
    return;
  }
  /* Simple cycling switcher if called with no arg */
  const cycle = ["Tamil Nadu", "Chennai", "Coimbatore", "Madurai", "Tiruchirapalli"];
  const i = cycle.indexOf(STATE.location);
  changeLocation(cycle[(i + 1) % cycle.length]);
}
window.changeLocation = changeLocation;

/* ═══════════════════════════════════════════════════════════════
   25. TOAST / CONFIRM
   ═══════════════════════════════════════════════════════════════ */

let _toastT;
function showToast(msg) {
  const t = $("toast"); if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove("show"), 3000);
}
window.showToast = showToast;

function showConfirm(title, msg, onOk) {
  $("confirmTitle").textContent = title;
  $("confirmMsg").textContent = msg;
  $("confirmBackdrop").classList.add("visible");
  $("confirmBox").classList.add("open");
  $("confirmOkBtn").onclick = () => { onOk?.(); closeConfirm(); };
}
function closeConfirm() {
  $("confirmBackdrop")?.classList.remove("visible");
  $("confirmBox")?.classList.remove("open");
}
window.closeConfirm = closeConfirm;

/* ═══════════════════════════════════════════════════════════════
   26. SCROLL EFFECTS / BACK-TO-TOP
   ═══════════════════════════════════════════════════════════════ */

window.addEventListener("scroll", () => {
  $("mainNav")?.classList.toggle("scrolled", window.scrollY > 40);
  $("backTop")?.classList.toggle("show", window.scrollY > 400);
  /* Close user menu on scroll */
  closeUserMenu();
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   27. BOOTSTRAP
   ═══════════════════════════════════════════════════════════════ */

loadCart();
updateNavCart();
const el = $("deliverLoc"); if (el) el.textContent = STATE.location;

(async () => {
  await loadProducts();
  route();
})();
