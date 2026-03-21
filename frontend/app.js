/**
 * app.js — Aammii Natural Shop · Production Frontend
 * v5.0 · Complete rebuild
 */

"use strict";

// ── Config ─────────────────────────────────────────────────────────────────
const API = `${location.protocol}//${location.hostname}:5000`;
const DELIVERY_THRESHOLD = 500;
const ITEMS_PER_PAGE     = 48;

// ── State ──────────────────────────────────────────────────────────────────
let allProducts = [], filteredProducts = [], cart = {}, activeCategory = "all";

// ── Dark Mode ──────────────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem("aammii-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved ? saved === "dark" : prefersDark;
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  // Icon is set after DOM is ready; see applyThemeIcon()
})();

function applyThemeIcon() {
  const icon = document.getElementById("themeIcon");
  if (!icon) return;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  icon.textContent = dark ? "☀️" : "🌙";
}

function toggleTheme() {
  const html = document.documentElement;
  const nowDark = html.getAttribute("data-theme") === "dark";
  if (nowDark) {
    html.removeAttribute("data-theme");
    localStorage.setItem("aammii-theme", "light");
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("aammii-theme", "dark");
  }
  applyThemeIcon();
}

// Respect OS-level changes while the tab is open
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("aammii-theme")) {
    if (e.matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    applyThemeIcon();
  }
});

// ── Category meta ──────────────────────────────────────────────────────────
const CAT_META = {
  "Millets & Grains":    {emoji:"🌾",color:"#6b4226"},
  "Pulses & Dals":       {emoji:"🫘",color:"#556b2f"},
  "Sweeteners":          {emoji:"🍯",color:"#d4a043"},
  "Honey":               {emoji:"🍯",color:"#c8922e"},
  "Beverages":           {emoji:"🍵",color:"#1abc9c"},
  "Spices":              {emoji:"🌶",color:"#c0392b"},
  "Oils & Ghee":         {emoji:"🫙",color:"#8b4513"},
  "Pickles":             {emoji:"🥒",color:"#556b2f"},
  "Salt":                {emoji:"🧂",color:"#3d5a80"},
  "Dry Fruits & Nuts":   {emoji:"🥜",color:"#784212"},
  "Health Mix":          {emoji:"💊",color:"#1a5276"},
  "Healthcare":          {emoji:"🩺",color:"#922b21"},
  "Personal Care":       {emoji:"🌸",color:"#9b59b6"},
  "Soap":                {emoji:"🧼",color:"#2980b9"},
  "Herbal Powder":       {emoji:"🌿",color:"#4a7c59"},
  "Noodles & Vermicelli":{emoji:"🍜",color:"#e67e22"},
  "Vadagam & Appalam":   {emoji:"🥙",color:"#8b4513"},
  "Readymade Mix":       {emoji:"🍱",color:"#d4a043"},
  "Face Pack":           {emoji:"✨",color:"#9b59b6"},
  "Seeds":               {emoji:"🌱",color:"#27ae60"},
  "Divine Products":     {emoji:"🕯",color:"#9b59b6"},
  "Copper Products":     {emoji:"🥇",color:"#d4a043"},
  "Wellness Tools":      {emoji:"🧘",color:"#2980b9"},
  "Books & DVDs":        {emoji:"📚",color:"#3d5a80"},
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const productGrid = $("productGrid"), filterBar = $("filterBar"),
      shopMain = $("shopMain"), cartPanel = $("cartPanel"),
      cartOverlay = $("cartOverlay"), cartItemsEl = $("cartItems"),
      cartEmpty = $("cartEmpty"), cartBadge = $("cartBadge"),
      cartPill = $("cartPill"), totalItemsEl = $("totalItems"),
      totalPriceEl = $("totalPrice"), placeOrderBtn = $("placeOrderBtn"),
      noResults = $("noResults"), uploadStatus = $("uploadStatus"),
      uploadProgress = $("uploadProgress"), progressBar = $("progressBar"),
      progressLabel = $("progressLabel"), uploadText = $("uploadText"),
      catGrid = $("catGrid");

// Set theme icon once DOM refs are ready
applyThemeIcon();

// ── Scroll header effect ───────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  document.getElementById("siteHeader").classList.toggle("scrolled", scrollY > 80);
});

// ════════════════════════════════════════════════════════════════════════════
// THEME
// ════════════════════════════════════════════════════════════════════════════
function loadTheme() {
  const saved = localStorage.getItem("aammii_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}
function toggleTheme() {
  const cur  = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("aammii_theme", next);
}

// ════════════════════════════════════════════════════════════════════════════
// SCROLL EFFECTS
// ════════════════════════════════════════════════════════════════════════════
function onScroll() {
  $("siteHeader").classList.toggle("scrolled", window.scrollY > 20);
}

// ════════════════════════════════════════════════════════════════════════════
// API CALLS
// ════════════════════════════════════════════════════════════════════════════
async function api(path, opts = {}) {
  const res  = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

async function fetchCategories() {
  try {
    state.categories = await api("/api/categories");
  } catch {
    state.categories = [];
  }
}

async function fetchNewLaunches() {
  try {
    state.newLaunches = await api("/api/products/new-launches");
    const section = $("launchSection");
    if (!state.newLaunches.length) {
      section.style.display = "none";
    }
  } catch {
    $("launchSection").style.display = "none";
  }
}

async function fetchProducts(opts = {}) {
  showSkeleton(true);
  const params = new URLSearchParams();
  params.set("page",  opts.page  || state.page);
  params.set("limit", ITEMS_PER_PAGE);

  const q   = $("searchInput").value.trim();
  const cat = state.activeCategory;
  const srt = $("sortSelect")?.value || "default";
  const min = $("priceMin")?.value;
  const max = $("priceMax")?.value;

  if (q)          params.set("q", q);
  if (cat && cat !== "all") params.set("category", cat);
  if (srt)        params.set("sort", srt);
  if (min)        params.set("price_min", min);
  if (max)        params.set("price_max", max);
  if ($("inStockOnly")?.checked)     params.set("in_stock", "1");
  if ($("newLaunchFilter")?.checked) params.set("new_launch", "1");

  try {
    const data     = await api(`/api/products?${params}`);
    state.products     = data.products;
    state.totalPages   = data.pages;
    state.totalProducts = data.total;
    state.page         = data.page;
    renderProducts();
    renderPagination();
    updateResultsLabel();
  } catch (e) {
    showToast(`⚠️ ${e.message}`, "error");
  } finally {
    showSkeleton(false);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY NAV
// ════════════════════════════════════════════════════════════════════════════
function buildCategoryNav() {
  const nav = $("catNavInner");
  // Keep the "All" pill
  const allPill = nav.querySelector('[data-cat="all"]');
  nav.innerHTML = "";
  nav.appendChild(allPill);
  state.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className   = "cat-pill";
    btn.dataset.cat = cat.name;
    btn.innerHTML   = `<span>${cat.emoji}</span> ${esc(cat.name)}`;
    btn.onclick     = () => filterByCategory(cat.name, btn);
    nav.appendChild(btn);
  });
}

function filterByCategory(cat, btn) {
  state.activeCategory = cat;
  state.page = 1;
  qsa(".cat-pill").forEach(p => p.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    qsa(`.cat-pill[data-cat="${CSS.escape(cat)}"]`).forEach(p => p.classList.add("active"));
  }
  // Also update sidebar
  qsa(".sidebar-cat-item").forEach(i => {
    i.classList.toggle("active", i.dataset.cat === cat);
  });
  updateActiveFiltersDisplay();
  fetchProducts();
  // Scroll to shop section
  document.getElementById("shopSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY SHOWCASE
// ════════════════════════════════════════════════════════════════════════════
function buildCategoryShowcase() {
  const grid = $("catShowcaseGrid");
  grid.innerHTML = "";
  state.categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "cat-showcase-card";
    card.style.setProperty("--cat-color", cat.color || "#4a7c59");
    card.innerHTML = `
      <span class="cat-sc-emoji">${cat.emoji || "📦"}</span>
      <div class="cat-sc-name">${esc(cat.name)}</div>
      <div class="cat-sc-count">${cat.product_count || 0} items</div>
      <div class="cat-sc-bar"></div>
    `;
    card.onclick = () => {
      filterByCategory(cat.name, null);
    };
    grid.appendChild(card);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════════════════
function buildSidebarCategories() {
  const list = $("sidebarCatList");
  list.innerHTML = "";
  // All option
  const allItem = document.createElement("div");
  allItem.className  = "sidebar-cat-item active";
  allItem.dataset.cat = "all";
  allItem.innerHTML  = `<span>All Products</span><span class="sidebar-cat-count">${state.totalProducts}</span>`;
  allItem.onclick    = () => filterByCategory("all", null);
  list.appendChild(allItem);

  state.categories.forEach(cat => {
    const item = document.createElement("div");
    item.className   = "sidebar-cat-item";
    item.dataset.cat = cat.name;
    item.innerHTML   = `<span>${cat.emoji} ${esc(cat.name)}</span><span class="sidebar-cat-count">${cat.product_count || 0}</span>`;
    item.onclick     = () => filterByCategory(cat.name, item);
    list.appendChild(item);
  });
  list.classList.add("open");
}

function toggleSidebar() {
  const sb = $("sidebar");
  const ov = $("sidebarOverlay");
  sb.classList.toggle("mobile-open");
  ov.classList.toggle("active");
}

function toggleFilterGroup(title) {
  title.classList.toggle("open");
  const body = title.nextElementSibling;
  body.classList.toggle("open");
}

// ════════════════════════════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════════════════════════════
let searchTimer;
function onSearch(val, immediate) {
  $("searchClear").style.display = val ? "flex" : "none";
  clearTimeout(searchTimer);
  if (immediate) { state.page = 1; fetchProducts(); return; }
  searchTimer = setTimeout(() => { state.page = 1; fetchProducts(); }, 380);
}
function clearSearch() {
  $("searchInput").value = "";
  $("searchClear").style.display = "none";
  state.page = 1;
  fetchProducts();
}

// ════════════════════════════════════════════════════════════════════════════
// FILTERS
// ════════════════════════════════════════════════════════════════════════════
function applyFilters() {
  state.page = 1;
  updateActiveFiltersDisplay();
  fetchProducts();
}

function clearFilters() {
  state.activeCategory = "all";
  if ($("priceMin"))        $("priceMin").value = "";
  if ($("priceMax"))        $("priceMax").value = "";
  if ($("inStockOnly"))     $("inStockOnly").checked = false;
  if ($("newLaunchFilter")) $("newLaunchFilter").checked = false;
  if ($("sortSelect"))      $("sortSelect").value = "default";
  $("searchInput").value = "";
  qsa(".cat-pill").forEach(p => p.classList.toggle("active", p.dataset.cat === "all"));
  qsa(".sidebar-cat-item").forEach(i => i.classList.toggle("active", i.dataset.cat === "all"));
  updateActiveFiltersDisplay();
  state.page = 1;
  fetchProducts();
}

function updateActiveFiltersDisplay() {
  const chips = [];
  if (state.activeCategory !== "all") {
    chips.push({label: state.activeCategory, clear: () => filterByCategory("all", null)});
  }
  const min = $("priceMin")?.value, max = $("priceMax")?.value;
  if (min || max) {
    const label = min && max ? `₹${min}–₹${max}` : min ? `From ₹${min}` : `Up to ₹${max}`;
    chips.push({label, clear: () => { $("priceMin").value=""; $("priceMax").value=""; applyFilters(); }});
  }
  if ($("inStockOnly")?.checked)     chips.push({label:"In Stock", clear: () => { $("inStockOnly").checked=false; applyFilters(); }});
  if ($("newLaunchFilter")?.checked) chips.push({label:"New Launches", clear: () => { $("newLaunchFilter").checked=false; applyFilters(); }});

  const af = $("activeFilters");
  af.innerHTML = chips.map((c,i) =>
    `<div class="af-chip" onclick="chips_${i}()">${esc(c.label)} ✕</div>`
  ).join("");
  // Assign click handlers dynamically
  chips.forEach((c,i) => { window[`chips_${i}`] = c.clear; });
}

function updateResultsLabel() {
  const label   = $("resultsLabel");
  const q       = $("searchInput").value.trim();
  const cat     = state.activeCategory;
  let text      = `${state.totalProducts} products`;
  if (cat !== "all") text = `${state.totalProducts} in ${cat}`;
  if (q)             text = `${state.totalProducts} results for "${q}"`;
  label.textContent = text;
}

// ════════════════════════════════════════════════════════════════════════════
// VIEW TOGGLE
// ════════════════════════════════════════════════════════════════════════════
function setView(v) {
  state.view = v;
  const grid = $("productGrid");
  grid.dataset.view = v;
  $("viewGrid").classList.toggle("active", v === "grid");
  $("viewList").classList.toggle("active", v === "list");
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER PRODUCTS
// ════════════════════════════════════════════════════════════════════════════
function renderProducts() {
  const grid    = $("productGrid");
  const noRes   = $("noResults");
  const skel    = $("gridSkeleton");
  if (skel) skel.remove();

  grid.innerHTML = "";

  if (!state.products.length) {
    grid.appendChild(noRes.parentNode ? noRes : document.createElement("div"));
    noRes.classList.remove("hidden");
    return;
  }
  noRes.classList.add("hidden");

  const frag = document.createDocumentFragment();
  state.products.forEach((p, i) => {
    const card = buildProductCard(p, i);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

function buildProductCard(p, idx) {
  const inCart   = state.cart[p.id];
  const oos      = p.stock_quantity === 0;
  const imgSrc   = p.image_path?.startsWith("/")
    ? `${API}${p.image_path}` : (p.image_path || "");
  const fallback = `${API}/images/${p.id}.svg`;

  const div = document.createElement("div");
  div.className = "product-card" + (oos ? " out-of-stock" : "");
  div.style.animationDelay = `${Math.min(idx * 0.025, 0.5)}s`;
  div.setAttribute("data-id", p.id);

  div.innerHTML = `
    ${oos ? '<div class="oos-badge"><span>Out of Stock</span></div>' : ""}
    <div class="card-img">
      <img src="${imgSrc || fallback}" alt="${esc(p.name)}" loading="lazy"
        onerror="this.src='${fallback}';this.onerror=null"/>
      <span class="card-cat-badge">${esc(p.category)}</span>
      ${p.is_new_launch ? '<span class="card-new-badge">New</span>' : ""}
      ${p.code ? `<span class="card-code">${esc(p.code)}</span>` : ""}
    </div>
    <div class="card-body">
      <div class="card-name">${esc(p.name)}</div>
      ${p.qty_unit ? `<div class="card-unit">${esc(p.qty_unit)}</div>` : ""}
      <div class="card-foot">
        <div>
          <span class="card-price">₹${fmtPrice(p.price)}</span>
          ${p.original_price ? `<span class="card-orig-price">₹${fmtPrice(p.original_price)}</span>` : ""}
        </div>
        <button
          class="add-to-cart${inCart ? " added" : ""}"
          id="atcBtn_${p.id}"
          onclick="addToCart('${p.id}', event)"
          title="Add to cart"
          ${oos ? "disabled" : ""}
        >${inCart ? "✓" : "+"}</button>
      </div>
    </div>
  `;
  return div;
}

// ════════════════════════════════════════════════════════════════════════════
// NEW LAUNCHES CAROUSEL
// ════════════════════════════════════════════════════════════════════════════
function setupLaunchCarouselSize() {
  const w = window.innerWidth;
  if (w < 480)       state.launchsPerView = 1.1;
  else if (w < 720)  state.launchsPerView = 2;
  else if (w < 900)  state.launchsPerView = 3;
  else if (w < 1200) state.launchsPerView = 4;
  else               state.launchsPerView = 5;
}

function updateLaunchCarousel() {
  const track = $("launchTrack");
  const dots  = $("launchDots");
  if (!state.newLaunches.length || !track) return;

  track.innerHTML = "";
  state.newLaunches.forEach((p, i) => {
    const imgSrc = p.image_path?.startsWith("/")
      ? `${API}${p.image_path}` : `${API}/images/${p.id}.svg`;
    const card = document.createElement("div");
    card.className = "launch-card";
    card.innerHTML = `
      <span class="launch-card-badge">New</span>
      <div class="launch-card-img">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
          onerror="this.src='${API}/images/${p.id}.svg';this.onerror=null"/>
      </div>
      <div class="launch-card-body">
        <div class="launch-card-cat">${esc(p.category)}</div>
        <div class="launch-card-name">${esc(p.name)}</div>
        <div class="launch-card-foot">
          <span class="launch-card-price">₹${fmtPrice(p.price)}</span>
          <button class="launch-add-btn" onclick="addToCart('${p.id}', event)">+</button>
        </div>
      </div>
    `;
    track.appendChild(card);
  });

  // Dots
  const totalDots = Math.ceil(state.newLaunches.length / 1);
  dots.innerHTML  = "";
  for (let i = 0; i < Math.min(totalDots, 8); i++) {
    const d = document.createElement("button");
    d.className = "launch-dot" + (i === 0 ? " active" : "");
    d.onclick   = () => goToLaunch(i);
    dots.appendChild(d);
  }
  positionLaunchTrack();
}

function slideLaunches(dir) {
  const max = Math.max(0, state.newLaunches.length - Math.floor(state.launchsPerView));
  state.launchOffset = Math.max(0, Math.min(state.launchOffset + dir, max));
  positionLaunchTrack();
}

function goToLaunch(idx) {
  state.launchOffset = idx;
  positionLaunchTrack();
}

function positionLaunchTrack() {
  const track   = $("launchTrack");
  if (!track || !track.children.length) return;
  const cardW   = track.children[0].offsetWidth + 20; // 20 = gap
  const offset  = state.launchOffset * cardW;
  track.style.transform = `translateX(-${offset}px)`;
  // Update dots
  qsa(".launch-dot").forEach((d, i) => d.classList.toggle("active", i === state.launchOffset));
}

// ════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ════════════════════════════════════════════════════════════════════════════
function renderPagination() {
  const pg = $("pagination");
  pg.innerHTML = "";
  if (state.totalPages <= 1) return;

  const mkBtn = (label, page, active = false, disabled = false) => {
    const b = document.createElement("button");
    b.className = "page-btn" + (active ? " active" : "");
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = () => { state.page = page; fetchProducts({ page }); window.scrollTo({ top: document.getElementById("shopSection").offsetTop - 100, behavior: "smooth" }); };
    return b;
  };

  pg.appendChild(mkBtn("←", state.page - 1, false, state.page === 1));

  let start = Math.max(1, state.page - 2);
  let end   = Math.min(state.totalPages, state.page + 2);
  if (start > 1) { pg.appendChild(mkBtn("1", 1)); if (start > 2) pg.appendChild(Object.assign(document.createElement("span"),{textContent:"…",className:"page-btn",style:"pointer-events:none;opacity:.4"})); }
  for (let i = start; i <= end; i++) pg.appendChild(mkBtn(i, i, i === state.page));
  if (end < state.totalPages) { if (end < state.totalPages-1) pg.appendChild(Object.assign(document.createElement("span"),{textContent:"…",className:"page-btn",style:"pointer-events:none;opacity:.4"})); pg.appendChild(mkBtn(state.totalPages, state.totalPages)); }

  pg.appendChild(mkBtn("→", state.page + 1, false, state.page === state.totalPages));
}

// ════════════════════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════════════════════
function showSkeleton(show) {
  const grid = $("productGrid");
  if (show) {
    grid.innerHTML = Array(6).fill('<div class="skel-card"></div>').join("");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CART
// ════════════════════════════════════════════════════════════════════════════
function addToCart(id, event) {
  event?.stopPropagation();
  // Find product in state or launches
  let product = state.products.find(p => p.id === id)
             || state.newLaunches.find(p => p.id === id);
  if (!product) return;

  if (state.cart[id]) {
    state.cart[id].qty++;
  } else {
    state.cart[id] = { product, qty: 1 };
  }

  saveCart();
  updateCartUI();

  // Button feedback
  const btn = $(`atcBtn_${id}`);
  if (btn) {
    btn.textContent = "✓";
    btn.classList.add("added");
    setTimeout(() => {
      if (btn) { btn.textContent = "+"; btn.classList.remove("added"); }
    }, 900);
  }

  // Badge bump
  const badge = $("cartBadge");
  badge.classList.add("bump");
  setTimeout(() => badge.classList.remove("bump"), 300);

  showToast(`🛒 ${product.name.slice(0, 32)} added`);
}

function changeQty(id, delta) {
  if (!state.cart[id]) return;
  state.cart[id].qty += delta;
  if (state.cart[id].qty <= 0) {
    delete state.cart[id];
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  delete state.cart[id];
  saveCart();
  updateCartUI();
}

function clearCart() {
  state.cart = {};
  saveCart();
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem("aammii_cart", JSON.stringify(state.cart));
  } catch { /* quota */ }
}

function loadCart() {
  try {
    const saved = localStorage.getItem("aammii_cart");
    if (saved) state.cart = JSON.parse(saved);
  } catch { state.cart = {}; }
}

function cartItems() { return Object.values(state.cart); }
function cartTotal() { return cartItems().reduce((s, i) => s + i.product.price * i.qty, 0); }
function cartCount() { return cartItems().reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const items   = cartItems();
  const total   = cartTotal();
  const count   = cartCount();
  const isEmpty = items.length === 0;

  $("cartBadge").textContent    = count;
  $("cartCountLabel").textContent = `${count} item${count !== 1 ? "s" : ""}`;
  $("cartSubtotal").textContent  = `₹${fmtPrice(total)}`;
  $("cartEmpty").style.display   = isEmpty ? "flex" : "none";
  $("cartFooter").style.display  = isEmpty ? "none" : "block";
  $("checkoutBtn").disabled      = isEmpty;

  // Delivery note
  const note = $("cart-delivery-note");
  if (note) {
    note.textContent = total >= DELIVERY_THRESHOLD
      ? "✅ You qualify for free delivery!"
      : `Add ₹${fmtPrice(DELIVERY_THRESHOLD - total)} more for free delivery`;
  }

  // Render items
  const list = $("cartItemsList");
  list.innerHTML = "";
  items.forEach(({product: p, qty}) => {
    const imgSrc = p.image_path?.startsWith("/")
      ? `${API}${p.image_path}` : `${API}/images/${p.id}.svg`;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img class="ci-img" src="${imgSrc}" alt="${esc(p.name)}"
        onerror="this.src='${API}/images/${p.id}.svg';this.onerror=null"/>
      <div class="ci-info">
        <div class="ci-name">${esc(p.name)}</div>
        <div class="ci-unit">${esc(p.qty_unit || "")}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${p.id}', -1)">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" onclick="changeQty('${p.id}', +1)">+</button>
        </div>
      </div>
      <div class="ci-right">
        <span class="ci-total">₹${fmtPrice(p.price * qty)}</span>
        <button class="ci-delete" onclick="removeFromCart('${p.id}')" title="Remove">🗑</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function toggleCart() {
  const drawer  = $("cartDrawer");
  const overlay = $("cartOverlay");
  const open    = drawer.classList.toggle("open");
  overlay.classList.toggle("active", open);
  document.body.style.overflow = open ? "hidden" : "";
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════════════════════════════════
function openCheckout() {
  if (!cartCount()) return;
  // Close cart first
  $("cartDrawer").classList.remove("open");
  $("cartOverlay").classList.remove("active");
  document.body.style.overflow = "hidden";
  goToCheckoutStep(1);
  $("checkoutModal").classList.add("open");
  $("checkoutOverlay").classList.add("active");
}

function closeCheckout() {
  $("checkoutModal").classList.remove("open");
  $("checkoutOverlay").classList.remove("active");
  document.body.style.overflow = "";
  state.checkoutStep = 1;
}

function goToCheckoutStep(n) {
  state.checkoutStep = n;
  qsa(".checkout-step").forEach((el, i) => el.classList.toggle("hidden", i !== n - 1));
  qsa(".checkout-steps .step").forEach((el, i) => {
    el.classList.toggle("active", i + 1 === n);
    el.classList.toggle("done",   i + 1 < n);
  });
  if (n === 2) buildCheckoutSummary();
}

function goToPayment() {
  const name    = $("custName").value.trim();
  const phone   = $("custPhone").value.trim();
  const address = $("custAddress").value.trim();

  let valid = true;
  [$("custName"), $("custPhone"), $("custAddress")].forEach(el => el?.classList.remove("error"));

  if (!name)    { $("custName").classList.add("error");    valid = false; }
  if (!phone)   { $("custPhone").classList.add("error");   valid = false; }
  if (!address) { $("custAddress").classList.add("error"); valid = false; }

  if (!valid) { showToast("⚠️ Please fill in all required fields", "warn"); return; }
  goToCheckoutStep(2);
}

function selectPayMethod(input) {
  state.selectedPayMethod = input.value;
  $("payBtnLabel").textContent = input.value === "cod" ? "Place Order (COD)" : "Pay Now";
}

function buildCheckoutSummary() {
  const items = cartItems();
  const list  = $("checkoutItemsList");
  list.innerHTML = "";
  items.forEach(({product: p, qty}) => {
    const div = document.createElement("div");
    div.className = "checkout-sum-item";
    div.innerHTML = `<span>${esc(p.name)} × ${qty}</span><span>₹${fmtPrice(p.price * qty)}</span>`;
    list.appendChild(div);
  });
  const total = cartTotal();
  const delivery = total >= DELIVERY_THRESHOLD ? 0 : 50;
  $("sumSubtotal").textContent = `₹${fmtPrice(total)}`;
  $("sumDelivery").textContent  = delivery === 0 ? "Free" : `₹${delivery}`;
  $("sumTotal").textContent     = `₹${fmtPrice(total + delivery)}`;
}

async function processPayment() {
  const btn       = $("payNowBtn");
  const method    = state.selectedPayMethod;
  const customer  = {
    name:    $("custName").value.trim(),
    phone:   $("custPhone").value.trim(),
    email:   $("custEmail").value.trim(),
    address: $("custAddress").value.trim(),
  };
  const items = cartItems().map(({product: p, qty}) => ({
    product_id: p.id, id: p.id, quantity: qty,
  }));

  btn.disabled = true;
  $("payBtnLabel").textContent = "Processing…";

  try {
    if (method === "cod") {
      const data = await api("/api/payment/cod", {
        method: "POST",
        body: JSON.stringify({ items, customer }),
      });
      showOrderSuccess(data.order_number, "Cash on Delivery — pay when delivered.");
    } else {
      await initiateRazorpay(items, customer);
    }
  } catch (_) {}
})();
