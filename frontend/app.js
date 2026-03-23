/**
 * app.js — Aammii Shop
 * Sections:
 * 1. Config & State
 * 2. Category Metadata
 * 3. DOM References
 * 4. Theme
 * 5. Scroll Effects & Counters
 * 6. Category Grid
 * 7. PDF Upload
 * 8. Shop Initialisation
 * 9. Filter Chips
 * 10. Search & Filter & Sort
 * 11. Render Products
 * 12. Cart
 * 13. Order
 * 14. Toast
 * 15. Utilities
 * 16. Pull-to-Refresh
 * 17. Auto-load on start
 */

/* ─── 1. CONFIG & STATE ─────────────────────────────────────── */
const API = "https://aammii.onrender.com";

let allProducts      = [];
let filteredProducts = [];
let cart             = {};
let activeCategory   = "all";
let priceFilterActive = false;
let minPriceFilter    = 0;
let maxPriceFilter    = 5000;

/* ─── 2. CATEGORY METADATA ──────────────────────────────────── */
const CAT_META = {
  "Beverages":            { emoji: "🍵", color: "#1abc9c" },
  "Books & DVDs":         { emoji: "📚", color: "#3d5a80" },
  "Copper Products":      { emoji: "🥇", color: "#d4a043" },
  "Divine Products":      { emoji: "🕯", color: "#9b59b6" },
  "Dry Fruits & Nuts":    { emoji: "🥜", color: "#784212" },
  "Face Pack":            { emoji: "✨", color: "#9b59b6" },
  "Health Mix":           { emoji: "💊", color: "#1a5276" },
  "Healthcare":           { emoji: "🩺", color: "#922b21" },
  "Herbal Powder":        { emoji: "🌿", color: "#4a7c59" },
  "Home Care":            { emoji: "🧴", color: "#2ecc71" },
  "Honey":                { emoji: "🍯", color: "#c8922e" },
  "Millets & Grains":     { emoji: "🌾", color: "#6b4226" },
  "Noodles & Vermicelli": { emoji: "🍜", color: "#e67e22" },
  "Oils & Ghee":          { emoji: "🫙", color: "#8b4513" },
  "Personal Care":        { emoji: "🌸", color: "#9b59b6" },
  "Pickles":              { emoji: "🥒", color: "#556b2f" },
  "Pulses & Dals":        { emoji: "🫘", color: "#556b2f" },
  "Readymade Mix":        { emoji: "🍱", color: "#d4a043" },
  "Salt":                 { emoji: "🧂", color: "#3d5a80" },
  "Seeds":                { emoji: "🌱", color: "#27ae60" },
  "Soap":                 { emoji: "🧼", color: "#2980b9" },
  "Spices":               { emoji: "🌶", color: "#c0392b" },
  "Sweeteners":           { emoji: "🍯", color: "#d4a043" },
  "Vadagam & Appalam":    { emoji: "🥙", color: "#8b4513" },
  "Wellness Tools":       { emoji: "🧘", color: "#2980b9" },
};

/* ─── 3. DOM REFERENCES ─────────────────────────────────────── */
const $ = id => document.getElementById(id);

const productGrid    = $("productGrid");
const shopToolbar    = $("shopToolbar");
const filterChipsEl  = $("filterChips");
const shopMain       = $("shopMain");
const cartPanel      = $("cartPanel");
const cartOverlay    = $("cartOverlay");
const cartItemsEl    = $("cartItems");
const cartEmpty      = $("cartEmpty");
const cartBadge      = $("cartBadge");
const cartPill       = $("cartPill");
const totalItemsEl   = $("totalItems");
const totalPriceEl   = $("totalPrice");
const placeOrderBtn  = $("placeOrderBtn");
const noResults      = $("noResults");
const uploadStatus   = $("uploadStatus");
const uploadProgress = $("uploadProgress");
const progressBar    = $("progressBar");
const progressLabel  = $("progressLabel");
const uploadText     = $("uploadText");
const catGrid        = $("catGrid");
const resultsInfo    = $("resultsInfo");

/* ─── 4. THEME ──────────────────────────────────────────────── */
(function initTheme() {
  const saved      = localStorage.getItem("aammii-theme");
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved ? saved === "dark" : preferDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();

function applyThemeIcon() {
  const icon = $("themeIcon");
  if (!icon) return;
  icon.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const html   = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  if (isDark) {
    html.removeAttribute("data-theme");
    localStorage.setItem("aammii-theme", "light");
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("aammii-theme", "dark");
  }
  applyThemeIcon();
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("aammii-theme")) {
    e.matches
      ? document.documentElement.setAttribute("data-theme", "dark")
      : document.documentElement.removeAttribute("data-theme");
    applyThemeIcon();
  }
});
applyThemeIcon();

/* ─── 5. SCROLL EFFECTS & COUNTERS ─────────────────────────── */
window.addEventListener("scroll", () => {
  $("siteHeader").classList.toggle("scrolled", scrollY > 80);
});

function animateCounters() {
  document.querySelectorAll(".stat-num").forEach(el => {
    const target = +el.dataset.target;
    const dur    = 1800;
    let start    = null;
    const step   = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.floor(p * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  });
}

const heroStats = document.querySelector(".hero-stats");
if (heroStats) {
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); }
  }, { threshold: .3 }).observe(heroStats);
}

/* ─── 6. CATEGORY GRID ──────────────────────────────────────── */
function buildCatGrid(products) {
  const counts = {};
  products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  catGrid.innerHTML = cats.map(cat => {
    const m = CAT_META[cat] || { emoji: "📦", color: "#4a7c59" };
    return `
      <div class="cat-card" style="--cat-color:${m.color}"
           onclick="filterByCategory('${esc(cat)}', null); document.getElementById('shopMain').scrollIntoView({behavior:'smooth'})">
        <span class="cat-emoji">${m.emoji}</span>
        <div class="cat-name">${esc(cat)}</div>
        <div class="cat-count">${counts[cat]} items</div>
        <div class="cat-bar"></div>
      </div>`;
  }).join("");
}

/* ─── 7. PDF UPLOAD ─────────────────────────────────────────── */
const UPLOAD_STEPS = [
  "📄 Reading PDF structure…",
  "🔍 Scanning product tables…",
  "🌿 Identifying Aammii catalogue…",
  "🏷️  Matching product codes & prices…",
  "🎨 Generating product images…",
  "✨ Almost ready…",
];

async function uploadPDF(input) {
  const file = input.files[0];
  if (!file) return;

  uploadText.textContent = file.name;
  setStatus("loading", UPLOAD_STEPS[0]);
  uploadProgress.classList.remove("hidden");
  progressBar.style.width = "0%";

  let w = 0, si = 0;
  const iv = setInterval(() => {
    w = Math.min(w + Math.random() * 5 + 1, 88);
    progressBar.style.width = w + "%";
    const ns = Math.floor((w / 88) * (UPLOAD_STEPS.length - 1));
    if (ns !== si) { si = ns; setStatus("loading", UPLOAD_STEPS[si]); if (progressLabel) progressLabel.textContent = UPLOAD_STEPS[si]; }
  }, 220);

  try {
    const fd = new FormData();
    fd.append("pdf", file);
    const res  = await fetch(`${API}/api/upload`, { method: "POST", body: fd });

    clearInterval(iv);
    progressBar.style.width = "100%";
    setTimeout(() => { uploadProgress.classList.add("hidden"); progressBar.style.width = "0%"; }, 500);

    const text = await res.text();
    if (!text.trim()) { setStatus("error", "❌ Server returned empty response."); return; }

    let data;
    try { data = JSON.parse(text); }
    catch { setStatus("error", "❌ Invalid JSON from server."); return; }

    if (!res.ok || data.error) { setStatus("error", `❌ ${data.error}`); return; }

    const msg = data.source === "preloaded"
      ? `✅ ${data.note || `Loaded ${data.count} Aammii products!`}`
      : `✅ Extracted ${data.count} products!`;
    setStatus("success", msg);
    uploadText.textContent = `✔ ${file.name}`;
    initShop(data.products);

  } catch (e) {
    clearInterval(iv);
    uploadProgress.classList.add("hidden");
    setStatus("error", `❌ Cannot reach server at ${API} — make sure you ran: bash run.sh`);
  }
}

function setStatus(type, msg) {
  uploadStatus.className = `upload-status ${type}`;
  uploadStatus.textContent = msg;
  uploadStatus.classList.remove("hidden");
}

// Drag & drop on hero
document.getElementById("hero").addEventListener("dragover",  e => e.preventDefault());
document.getElementById("hero").addEventListener("drop", e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f?.name.endsWith(".pdf")) {
    const dt = new DataTransfer();
    dt.items.add(f);
    $("pdfInput").files = dt.files;
    uploadPDF($("pdfInput"));
  }
});

/* ─── 8. SHOP INITIALISATION ────────────────────────────────── */
function initShop(products) {
  allProducts      = products;
  filteredProducts = [...products];
  buildCatGrid(products);
  buildFilterChips(products);
  renderProducts(filteredProducts);
  shopToolbar.classList.remove("hidden");
  shopMain.classList.remove("hidden");
}

function scrollToShop() {
  if (shopMain.classList.contains("hidden") && allProducts.length) {
    shopMain.classList.remove("hidden");
  }
}

/* ─── 9. FILTER CHIPS ───────────────────────────────────────── */
function buildFilterChips(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();

  // Remove old dynamic chips
  filterChipsEl.querySelectorAll(".dyn").forEach(c => c.remove());

  cats.forEach(cat => {
    const m = CAT_META[cat] || { emoji: "📦" };
    const btn = document.createElement("button");
    btn.className = "filter-chip dyn";
    btn.innerHTML = `${m.emoji} ${cat}`;
    btn.onclick   = () => filterByCategory(cat, btn);
    filterChipsEl.appendChild(btn);
  });
}

function filterByCategory(cat, btn) {
  activeCategory = cat;

  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));

  if (btn) {
    btn.classList.add("active");
  } else {
    document.querySelectorAll(".filter-chip").forEach(c => {
      const txt = c.textContent.trim();
      if (cat === "all" ? txt === "All" : txt.includes(cat)) c.classList.add("active");
    });
  }

  applyFilters();
}

/* ─── 10. SEARCH, FILTER & SORT ─────────────────────────────── */
function filterProducts() { applyFilters(); }

function applyFilters() {
  const q = $("searchInput").value.toLowerCase().trim();

  filteredProducts = allProducts.filter(p => {
    const matchCat   = activeCategory === "all" || p.category === activeCategory;
    const matchText  = !q || p.name.toLowerCase().includes(q)
                         || (p.code     || "").toLowerCase().includes(q)
                         || (p.category || "").toLowerCase().includes(q);
    const matchPrice = !priceFilterActive || (p.price >= minPriceFilter && p.price <= maxPriceFilter);
    return matchCat && matchText && matchPrice;
  });

  sortProducts(false);
}

function sortProducts(reRender = true) {
  const v = $("sortSelect").value;
  const a = reRender ? filteredProducts : [...filteredProducts];
  if (v === "price-asc")  a.sort((x, y) => x.price - y.price);
  if (v === "price-desc") a.sort((x, y) => y.price - x.price);
  if (v === "name-asc") a.sort((x, y) => {
    const nameA = x.name.includes(" / ") ? x.name.split(" / ")[1] : x.name;
    const nameB = y.name.includes(" / ") ? y.name.split(" / ")[1] : y.name;
    return nameA.localeCompare(nameB);
  });
  filteredProducts = a;
  renderProducts(filteredProducts);
}

/* ─── 11. RENDER PRODUCTS ───────────────────────────────────── */
function renderProducts(products) {
  productGrid.innerHTML = "";
  resultsInfo.textContent = `Showing ${products.length} of ${allProducts.length} products`;

  if (!products.length) { noResults.classList.remove("hidden"); return; }
  noResults.classList.add("hidden");

  const frag = document.createDocumentFragment();

  products.forEach((p, i) => {
    const imgSrc   = p.image?.startsWith("/") ? `${API}${p.image}` : p.image;
    const catShort = (p.category || "").toUpperCase().slice(0, 12);

    const div = document.createElement("div");
    div.className = "product-card";
    div.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;

    div.innerHTML = `
      <div class="card-img">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22160%22><rect width=%22280%22 height=%22160%22 fill=%22%23f5f0e8%22/><text x=%22140%22 y=%2288%22 text-anchor=%22middle%22 font-size=%2236%22>🌿</text></svg>'"/>
        <span class="card-badge card-badge-stock">In Stock</span>
        <span class="card-badge card-badge-cat">${esc(catShort)}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-qty">${esc(p.qty || "")}</div>
        <div class="card-foot">
          <div class="card-price">₹${p.price.toFixed(2)}</div>
          <button class="add-btn" id="ab-${esc(p.id)}" onclick="addToCart('${esc(p.id)}')" title="Add to cart">+</button>
        </div>
      </div>`;

    frag.appendChild(div);
  });

  productGrid.appendChild(frag);
}

/* ─── 12. CART ──────────────────────────────────────────────── */
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  cart[id] ? cart[id].qty++ : (cart[id] = { ...p, qty: 1 });

  const btn = $(`ab-${id}`);
  if (btn) {
    btn.textContent = "✓";
    btn.classList.add("added");
    setTimeout(() => { btn.textContent = "+"; btn.classList.remove("added"); }, 1000);
  }

  updateCartUI();
  const displayName = p.name.includes(" / ") ? p.name.split(" / ")[1] : p.name;
  showToast(`🛒 ${displayName.slice(0, 28)} added`);
}

function removeFromCart(id) { delete cart[id]; updateCartUI(); }

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) { removeFromCart(id); return; }
  updateCartUI();
}

function updateCartUI() {
  const items = Object.values(cart);
  const tq    = items.reduce((s, i) => s + i.qty,         0);
  const tp    = items.reduce((s, i) => s + i.qty * i.price, 0);

  cartBadge.textContent   = tq;
  cartPill.textContent    = `₹${tp.toFixed(0)}`;
  totalItemsEl.textContent = tq;
  totalPriceEl.textContent = `₹${tp.toFixed(2)}`;
  placeOrderBtn.disabled  = !items.length;
  cartEmpty.style.display = items.length ? "none" : "flex";

  cartItemsEl.innerHTML = "";
  items.forEach(item => {
    const imgSrc = item.image?.startsWith("/") ? `${API}${item.image}` : item.image;
    const d = document.createElement("div");
    d.className = "cart-item";
    d.innerHTML = `
      <img class="ci-img" src="${imgSrc}" alt="${esc(item.name)}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect width=%2248%22 height=%2248%22 fill=%22%23f5f0e8%22 rx=%228%22/><text x=%2224%22 y=%2232%22 text-anchor=%22middle%22 font-size=%2224%22>🌿</text></svg>'"/>
      <div class="ci-info">
        <div class="ci-name">${esc(item.name)}</div>
        <div class="ci-price">₹${item.price.toFixed(2)} each</div>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', -1)">−</button>
          <span  class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', +1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="ci-total">₹${(item.qty * item.price).toFixed(2)}</span>
        <button class="ci-del" onclick="removeFromCart('${esc(item.id)}')">🗑</button>
      </div>`;
    cartItemsEl.appendChild(d);
  });
}

function toggleCart() {
  const open = cartPanel.classList.toggle("open");
  cartOverlay.classList.toggle("visible", open);
  document.body.style.overflow = open ? "hidden" : "";
}

/* ─── 13. ORDER ─────────────────────────────────────────────── */
async function placeOrder() {
  const items = Object.values(cart).map(i => ({ name: i.name, qty: i.qty, price: i.price }));
  if (!items.length) return;

  placeOrderBtn.textContent = "⏳ Generating…";
  placeOrderBtn.disabled    = true;

  try {
    const res = await fetch(`${API}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) { showToast("❌ Order failed"); return; }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const cd   = res.headers.get("Content-Disposition") || "";
    a.href     = url;
    a.download = cd.match(/filename=([^\s;]+)/)?.[1] || "order.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("🎉 Order placed! Invoice downloading…");
    cart = {};
    updateCartUI();
    setTimeout(toggleCart, 1200);

  } catch (e) {
    showToast(`❌ ${e.message}`);
  } finally {
    placeOrderBtn.textContent = "Place Order & Download Invoice";
    placeOrderBtn.disabled    = !Object.keys(cart).length;
  }
}

/* ─── 14. PRICE MODAL ───────────────────────────────────────── */
function openPriceModal() {
  $("priceModal").classList.add("open");
  $("priceModalBackdrop").classList.add("visible");
  document.body.style.overflow = "hidden";
  updateSliderTrack($("minPrice"));
  updateSliderTrack($("maxPrice"));
}
function closePriceModal() {
  $("priceModal").classList.remove("open");
  $("priceModalBackdrop").classList.remove("visible");
  document.body.style.overflow = "";
}
function updatePriceRange() {
  const min = +$("minPrice").value, max = +$("maxPrice").value;
  $("minPriceVal").textContent = min;
  $("maxPriceVal").textContent = max;
  $("previewMin").textContent  = min;
  $("previewMax").textContent  = max;
  updateSliderTrack($("minPrice"));
  updateSliderTrack($("maxPrice"));
}
function updateSliderTrack(slider) {
  const pct = ((+slider.value - +slider.min) / (+slider.max - +slider.min)) * 100;
  slider.style.setProperty("--val", pct + "%");
}
function applyPriceFilter() {
  minPriceFilter    = +$("minPrice").value;
  maxPriceFilter    = +$("maxPrice").value;
  priceFilterActive = true;
  closePriceModal();
  applyFilters();
}
function resetPriceFilter() {
  $("minPrice").value = 0;
  $("maxPrice").value = 5000;
  updatePriceRange();
  minPriceFilter    = 0;
  maxPriceFilter    = 5000;
  priceFilterActive = false;
  applyFilters();
}

/* ─── 15. TOAST ─────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ─── 16. UTILITIES ─────────────────────────────────────────── */
function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

/* ─── 17. PULL-TO-REFRESH ───────────────────────────────────── */
(function initPullToRefresh() {
  const indicator = $("ptrIndicator");
  const ptrText   = $("ptrText");
  const THRESHOLD = 80;
  let startY = 0, currentY = 0, pulling = false, refreshing = false;

  document.addEventListener("touchstart", e => {
    if (window.scrollY > 0) return;
    startY  = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!pulling || refreshing) return;
    currentY = e.touches[0].clientY;
    const dist = currentY - startY;
    if (dist <= 0) return;
    indicator.classList.add("ptr-visible");
    if (dist >= THRESHOLD) {
      indicator.classList.add("ptr-releasing");
      ptrText.textContent = "Release to refresh";
    } else {
      indicator.classList.remove("ptr-releasing");
      ptrText.textContent = "Pull to refresh";
    }
  }, { passive: true });

  document.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    const dist = currentY - startY;
    if (dist >= THRESHOLD && !refreshing) {
      refreshing = true;
      indicator.classList.add("ptr-refreshing");
      indicator.classList.remove("ptr-releasing");
      ptrText.textContent = "Refreshing…";
      await refreshProducts();
      setTimeout(() => {
        indicator.classList.remove("ptr-visible", "ptr-refreshing");
        ptrText.textContent = "Pull to refresh";
        refreshing = false;
        currentY = startY = 0;
      }, 600);
    } else {
      indicator.classList.remove("ptr-visible", "ptr-releasing");
      currentY = startY = 0;
    }
  }, { passive: true });
})();

async function refreshProducts() {
  try {
    const res  = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      initShop(data);
      showToast("✅ Products refreshed!");
    }
  } catch {
    showToast("⚠️ Refresh failed — check connection");
  }
}

/* ─── 18. AUTO-LOAD ON START ────────────────────────────────── */
(async () => {
  try {
    const res  = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setStatus("success", `✅ ${data.length} Aammii products ready — upload a PDF to refresh`);
      initShop(data);
    }
  } catch { /* server not running locally — silent fail */ }
})();