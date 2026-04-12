/**
 * app.js — Aammii Tharcharbu Santhai
 * Sections:
 *  1.  Config & State
 *  2.  Category Metadata & Relations (for recommendations)
 *  3.  DOM References
 *  4.  Theme
 *  5.  Scroll Effects & Animated Counters
 *  6.  Category Grid
 *  7.  PDF Upload
 *  8.  Shop Initialisation
 *  9.  New This Week
 * 10.  Recommendations Engine (rule-based AI)
 * 11.  Filter Chips
 * 12.  Search, Filter & Sort
 * 13.  Render Products
 * 14.  Cart
 * 15.  Order & Invoice
 * 16.  Price Modal
 * 17.  Toast
 * 18.  Utilities
 * 19.  Pull-to-Refresh
 * 20.  Auto-load on Start
 */

/* ─── 1. CONFIG & STATE ─────────────────────────────────────── */

// Auto-detect API: use local when running on localhost, production otherwise
const API = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) ? "http://localhost:5000" : "https://aammii.onrender.com";

let allProducts       = [];
let filteredProducts  = [];
let cart              = {};
let activeCategory    = "all";
let priceFilterActive = false;
let minPriceFilter    = 0;
let maxPriceFilter    = 5000;
let lastViewedProduct = null;   // for recommendations

/* ─── 2. CATEGORY METADATA & RELATIONS ─────────────────────── */
const CAT_META = {
  "Beverages":            { emoji: "🍵", color: "#1abc9c" },
  "Books & DVDs":         { emoji: "📚", color: "#3d5a80" },
  "Copper Products":      { emoji: "🥇", color: "#d4a043" },
  "Divine Products":      { emoji: "🕯",  color: "#9b59b6" },
  "Dry Fruits & Nuts":    { emoji: "🥜", color: "#784212" },
  "Face Pack":            { emoji: "✨", color: "#9b59b6" },
  "Health Mix":           { emoji: "💊", color: "#1a5276" },
  "Healthcare":           { emoji: "🩺", color: "#922b21" },
  "Herbal Powder":        { emoji: "🌿", color: "#4a7c59" },
  "Home Care":            { emoji: "🧴", color: "#2ecc71" },
  "Honey":                { emoji: "🍯", color: "#c8922e" },
  "Millets & Grains":     { emoji: "🌾", color: "#6b4226" },
  "Noodles & Vermicelli": { emoji: "🍜", color: "#e67e22" },
  "Oils & Ghee":          { emoji: "🫙",  color: "#8b4513" },
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

// Related categories for smart recommendations
const CAT_RELATIONS = {
  "Millets & Grains":     ["Pulses & Dals", "Health Mix", "Readymade Mix", "Oils & Ghee"],
  "Pulses & Dals":        ["Millets & Grains", "Spices", "Oils & Ghee", "Salt"],
  "Spices":               ["Oils & Ghee", "Pickles", "Salt", "Pulses & Dals"],
  "Oils & Ghee":          ["Spices", "Millets & Grains", "Pickles", "Vadagam & Appalam"],
  "Honey":                ["Sweeteners", "Beverages", "Dry Fruits & Nuts", "Health Mix"],
  "Sweeteners":           ["Honey", "Beverages", "Health Mix"],
  "Beverages":            ["Honey", "Health Mix", "Herbal Powder"],
  "Health Mix":           ["Millets & Grains", "Beverages", "Healthcare", "Honey"],
  "Healthcare":           ["Health Mix", "Herbal Powder", "Wellness Tools", "Personal Care"],
  "Herbal Powder":        ["Healthcare", "Health Mix", "Beverages", "Personal Care"],
  "Personal Care":        ["Soap", "Face Pack", "Healthcare", "Herbal Powder"],
  "Soap":                 ["Personal Care", "Face Pack", "Home Care"],
  "Face Pack":            ["Soap", "Personal Care", "Herbal Powder"],
  "Home Care":            ["Soap", "Copper Products", "Wellness Tools"],
  "Pickles":              ["Spices", "Oils & Ghee", "Vadagam & Appalam", "Salt"],
  "Vadagam & Appalam":    ["Pickles", "Oils & Ghee", "Readymade Mix"],
  "Readymade Mix":        ["Millets & Grains", "Noodles & Vermicelli", "Vadagam & Appalam"],
  "Noodles & Vermicelli": ["Readymade Mix", "Oils & Ghee", "Spices"],
  "Dry Fruits & Nuts":    ["Honey", "Sweeteners", "Health Mix"],
  "Seeds":                ["Millets & Grains", "Health Mix", "Oils & Ghee"],
  "Salt":                 ["Spices", "Pickles", "Pulses & Dals"],
  "Copper Products":      ["Wellness Tools", "Home Care", "Divine Products"],
  "Divine Products":      ["Copper Products", "Books & DVDs"],
  "Books & DVDs":         ["Divine Products", "Healthcare"],
  "Wellness Tools":       ["Healthcare", "Copper Products", "Personal Care"],
};

/* ─── 3. DOM REFERENCES ─────────────────────────────────────── */
const $ = id => document.getElementById(id);

const productGrid    = $("productGrid");
const shopToolbar    = $("shopToolbar");
const cartPanel      = $("cartPanel");
const cartOverlay    = $("cartOverlay");
const cartItemsEl    = $("cartItems");
const cartEmpty      = $("cartEmpty");
const cartBadge      = $("cartBadge");
const cartPill       = $("cartPill");
const totalItemsEl   = $("totalItems");
const totalPriceEl   = $("totalPrice");
const subtotalEl     = $("subtotalPrice");
const placeOrderBtn  = $("placeOrderBtn");
const noResults      = $("noResults");
const uploadProgress = $("uploadProgress");
const progressBar    = $("progressBar");
const uploadText     = $("uploadText");
const resultsInfo    = $("resultsInfo");

/* ─── 4. THEME ──────────────────────────────────────────────── */
(function initTheme() {
  const saved      = localStorage.getItem("aammii-theme");
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved ? saved === "dark" : preferDark) {
    document.body.classList.add("dark");
  }
})();

function applyThemeIcon() {
  const icon = $("themeIcon");
  if (!icon) return;
  icon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("aammii-theme", isDark ? "dark" : "light");
  applyThemeIcon();
}

applyThemeIcon();

/* ─── 5. SCROLL EFFECTS & ANIMATED COUNTERS ─────────────────── */
window.addEventListener("scroll", () => {
  $("siteHeader").classList.toggle("scrolled", scrollY > 80);
});

function animateCounters() {
  document.querySelectorAll(".h-stat-n").forEach(el => {
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

const heroStats = document.querySelector(".hero-stats-row");
if (heroStats) {
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); }
  }, { threshold: .3 }).observe(heroStats);
}

/* ─── 6. CATEGORY NAV + SIDEBAR ────────────────────────────── */
function buildCatGrid(products) {
  const counts = {};
  products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  // Update "All" count in sidebar
  const scatAll = $("scat-all");
  if (scatAll) scatAll.textContent = products.length;

  // Build sidebar category buttons
  const sidebarCats = $("sidebarCats");
  if (sidebarCats) {
    sidebarCats.querySelectorAll(".dyn").forEach(el => el.remove());
    cats.forEach(cat => {
      const m = CAT_META[cat] || { emoji: "📦" };
      const btn = document.createElement("button");
      btn.className = "scat-btn dyn";
      btn.innerHTML = `${m.emoji} ${esc(cat)} <span class="scat-count">${counts[cat]}</span>`;
      btn.onclick = () => filterByCategory(cat, btn);
      sidebarCats.appendChild(btn);
    });
  }

  // Build category nav bar
  const catNavInner = $("catNavInner");
  if (catNavInner) {
    catNavInner.querySelectorAll(".dyn").forEach(el => el.remove());
    cats.forEach(cat => {
      const m = CAT_META[cat] || { emoji: "📦" };
      const btn = document.createElement("button");
      btn.className = "cat-nav-btn dyn";
      btn.textContent = `${m.emoji} ${cat}`;
      btn.onclick = () => filterByCategory(cat, btn);
      catNavInner.appendChild(btn);
    });
  }
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
    if (ns !== si) {
      si = ns;
      setStatus("loading", UPLOAD_STEPS[si]);
      setStatus("loading", UPLOAD_STEPS[si]);
    }
  }, 220);

  try {
    const fd = new FormData();
    fd.append("pdf", file);
    const res  = await fetch(`${API}/api/upload`, { method: "POST", body: fd });

    clearInterval(iv);
    progressBar.style.width = "100%";
    setTimeout(() => {
      uploadProgress.classList.add("hidden");
      progressBar.style.width = "0%";
    }, 500);

    const text = await res.text();
    if (!text.trim()) { setStatus("error", "❌ Server returned empty response."); return; }

    let data;
    try { data = JSON.parse(text); }
    catch { setStatus("error", "❌ Invalid response from server."); return; }

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
    setStatus("error", `❌ Cannot reach server — make sure backend is running.`);
  }
}

function setStatus(_type, msg) {
  const strip = $("uploadStrip");
  const el    = $("uploadStatus2");
  if (strip) strip.classList.remove("hidden");
  if (el) { el.textContent = msg; }
}

/* ─── 8. SHOP INITIALISATION ────────────────────────────────── */
function initShop(products) {
  allProducts      = products;
  filteredProducts = [...products];
  buildCatGrid(products);
  renderNewThisWeek(products);
  renderProducts(filteredProducts);
}

function resetAllFilters() {
  activeCategory    = "all";
  priceFilterActive = false;
  minPriceFilter    = 0;
  maxPriceFilter    = 5000;
  $("searchInput").value = "";
  $("sortSelect").value  = "default";
  // Reset sidebar active state
  document.querySelectorAll(".scat-btn").forEach(c => c.classList.remove("active"));
  document.querySelector(".scat-btn")?.classList.add("active");
  document.querySelectorAll(".cat-nav-btn").forEach(c => c.classList.remove("active"));
  document.querySelector(".cat-nav-btn")?.classList.add("active");
  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
  updatePriceFilterBtn();
}

/* ─── 9. NEW THIS WEEK ───────────────────────────────────────── */
function renderNewThisWeek(products) {
  const nowMs  = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const section = $("newThisWeek");
  const row     = $("newProductsRow");

  const newProducts = products.filter(p => {
    if (!p.date_added) return false;
    const added = new Date(p.date_added).getTime();
    return (nowMs - added) <= weekMs;
  });

  if (!newProducts.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  row.innerHTML = newProducts.map(p => productCardHTML(p)).join("");
}

/* Scroll & highlight the product in the main grid */
function focusProduct(id) {
  filterByCategory("all", null);
  $("shopSection").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => {
    const card = document.querySelector(`[data-pid="${id}"]`);
    if (card) {
      card.classList.add("highlight-pulse");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => card.classList.remove("highlight-pulse"), 2000);
    }
  }, 600);
}

/* ─── 10. RECOMMENDATIONS ENGINE (Rule-Based AI) ────────────── */
/**
 * Returns up to `count` recommended products based on:
 *   a) Same category (up to 3)
 *   b) Related categories defined in CAT_RELATIONS
 *   c) Similar price range (±30%)
 */
function getRecommendations(product, count = 8) {
  if (!product || !allProducts.length) return [];

  const priceMin = product.price * 0.7;
  const priceMax = product.price * 1.3;
  const related  = CAT_RELATIONS[product.category] || [];

  // Score each product
  const scored = allProducts
    .filter(p => p.id !== product.id)
    .map(p => {
      let score = 0;
      if (p.category === product.category)    score += 10;
      if (related.includes(p.category))       score += 6;
      if (p.price >= priceMin && p.price <= priceMax) score += 4;
      score += Math.random() * 2; // small random shuffle to avoid always same set
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(x => x.p);

  return scored;
}

function renderRecommendations(product) {
  const section = $("recommendSection");
  const grid    = $("recGrid");
  const sub     = $("recSectionSub");
  const recs    = getRecommendations(product);

  if (!recs.length) { section.classList.add("hidden"); return; }

  const tamilName = product.name.split(" / ")[0] || product.name;
  if (sub) sub.textContent = `Because you viewed: ${tamilName}`;

  grid.innerHTML = recs.map(p => productCardHTML(p, true)).join("");
  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearRecommendations() {
  $("recommendSection")?.classList.add("hidden");
}

/* ─── 11. CATEGORY FILTER ───────────────────────────────────── */
function filterByCategory(cat, btn) {
  activeCategory = cat;

  // Update sidebar active
  document.querySelectorAll(".scat-btn").forEach(c => c.classList.remove("active"));
  // Update cat nav active
  document.querySelectorAll(".cat-nav-btn").forEach(c => c.classList.remove("active"));

  if (btn) {
    btn.classList.add("active");
    // Mirror active state to the sibling nav
    if (btn.classList.contains("scat-btn")) {
      document.querySelectorAll(".cat-nav-btn").forEach(c => {
        if (cat === "all" ? c.textContent.trim() === "All Products" : c.textContent.includes(cat))
          c.classList.add("active");
      });
    } else {
      document.querySelectorAll(".scat-btn").forEach(c => {
        if (cat === "all" ? !c.classList.contains("dyn") : c.textContent.includes(cat))
          c.classList.add("active");
      });
    }
  } else {
    // called programmatically — match by text
    if (cat === "all") {
      document.querySelector(".scat-btn")?.classList.add("active");
      document.querySelector(".cat-nav-btn")?.classList.add("active");
    } else {
      document.querySelectorAll(".scat-btn, .cat-nav-btn").forEach(c => {
        if (c.textContent.includes(cat)) c.classList.add("active");
      });
    }
  }

  applyFilters();
  clearRecommendations();
}

/* ─── 12. SEARCH, FILTER & SORT ─────────────────────────────── */
function filterProducts() { applyFilters(); }

function applyFilters() {
  const q = $("searchInput").value.toLowerCase().trim();

  filteredProducts = allProducts.filter(p => {
    const matchCat   = activeCategory === "all" || p.category === activeCategory;
    const matchText  = !q
      || p.name.toLowerCase().includes(q)
      || (p.code     || "").toLowerCase().includes(q)
      || (p.category || "").toLowerCase().includes(q)
      || (p.qty      || "").toLowerCase().includes(q);
    const matchPrice = !priceFilterActive
      || (p.price >= minPriceFilter && p.price <= maxPriceFilter);
    return matchCat && matchText && matchPrice;
  });

  sortProducts(false);
}

function sortProducts(reRender = true) {
  const v = $("sortSelect").value;
  const a = reRender ? filteredProducts : [...filteredProducts];

  if (v === "price-asc")  a.sort((x, y) => x.price - y.price);
  if (v === "price-desc") a.sort((x, y) => y.price - x.price);
  if (v === "name-asc") {
    a.sort((x, y) => {
      const nx = x.name.includes(" / ") ? x.name.split(" / ")[1] : x.name;
      const ny = y.name.includes(" / ") ? y.name.split(" / ")[1] : y.name;
      return nx.localeCompare(ny, "en");
    });
  }
  if (v === "new-first") {
    a.sort((x, y) => {
      const dx = x.date_added ? new Date(x.date_added).getTime() : 0;
      const dy = y.date_added ? new Date(y.date_added).getTime() : 0;
      return dy - dx;
    });
  }

  filteredProducts = a;
  renderProducts(filteredProducts);
}

/* ─── 13. RENDER PRODUCTS ───────────────────────────────────── */
function productCardHTML(p, isRec = false) {
  const imgSrc  = imageUrl(p);
  const isNew   = isNewProduct(p);
  const catMeta = CAT_META[p.category] || { emoji: "📦", color: "#4a7c59" };

  // Full name — Tamil part on top, English below (NO truncation)
  const nameParts    = p.name.includes(" / ") ? p.name.split(" / ") : [p.name, ""];
  const tamilName    = nameParts[0].trim();
  const englishName  = nameParts[1].trim();

  return `
    <div class="product-card${isRec ? " rec-card" : ""}" data-pid="${esc(p.id)}"
         onclick="onProductClick('${esc(p.id)}')">
      ${isNew ? '<span class="card-new-badge">NEW</span>' : ''}
      <div class="card-img-wrap">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
             onerror="this.src='${fallbackSVG()}'"/>
      </div>
      <div class="card-body">
        <div class="card-code">${esc(p.code || p.id)}</div>
        <span class="card-cat-tag">${catMeta.emoji} ${esc(p.category || "")}</span>
        <div class="card-tamil">${esc(tamilName)}</div>
        ${englishName ? `<div class="card-english">${esc(englishName)}</div>` : ""}
        ${p.qty ? `<div class="card-pack">${esc(p.qty)}</div>` : ""}
        <div class="card-price-row">
          <span class="card-price">₹${p.price.toFixed(2)}</span>
        </div>
        <button class="add-btn" id="ab-${esc(p.id)}"
                onclick="event.stopPropagation();addToCart('${esc(p.id)}')"
                title="Add to cart">+ Add to Cart</button>
      </div>
    </div>`;
}

function renderProducts(products) {
  productGrid.innerHTML = "";
  resultsInfo.textContent = `Showing ${products.length} of ${allProducts.length} products`;

  if (!products.length) { noResults.classList.remove("hidden"); return; }
  noResults.classList.add("hidden");

  const frag = document.createDocumentFragment();
  products.forEach((p, i) => {
    const div = document.createElement("div");
    div.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;
    div.innerHTML = productCardHTML(p);
    frag.appendChild(div.firstElementChild);
  });
  productGrid.appendChild(frag);
}

function onProductClick(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  lastViewedProduct = p;
  renderRecommendations(p);
}

/* ─── 14. CART ──────────────────────────────────────────────── */
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  cart[id] ? cart[id].qty++ : (cart[id] = { ...p, qty: 1 });

  // Button feedback
  const btn = $(`ab-${id}`);
  if (btn) {
    btn.innerHTML = "<span>✓</span>";
    btn.classList.add("added");
    setTimeout(() => {
      btn.innerHTML = "<span>+</span>";
      btn.classList.remove("added");
    }, 1000);
  }

  updateCartUI();

  const displayName = p.name.includes(" / ") ? p.name.split(" / ")[0] : p.name;
  showToast(`🛒 ${displayName} added to cart`);

  // Show recommendations on first add
  if (!lastViewedProduct) renderRecommendations(p);
}

function removeFromCart(id) {
  delete cart[id];
  updateCartUI();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) { removeFromCart(id); return; }
  updateCartUI();
}

function updateCartUI() {
  const items    = Object.values(cart);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalAmt = items.reduce((s, i) => s + i.qty * i.price, 0);

  cartBadge.textContent    = totalQty || "0";
  cartPill.textContent     = `₹${Math.round(totalAmt)}`;
  totalItemsEl.textContent = totalQty;
  if (subtotalEl)   subtotalEl.textContent = `₹${totalAmt.toFixed(2)}`;
  totalPriceEl.textContent = `₹${totalAmt.toFixed(2)}`;
  placeOrderBtn.disabled   = !items.length;
  cartEmpty.style.display  = items.length ? "none" : "flex";

  cartItemsEl.innerHTML = "";
  items.forEach(item => {
    const imgSrc = imageUrl(item);
    const tamilName  = item.name.includes(" / ") ? item.name.split(" / ")[0] : item.name;
    const englishName = item.name.includes(" / ") ? item.name.split(" / ")[1] : "";
    const d = document.createElement("div");
    d.className = "cart-item";
    d.innerHTML = `
      <img class="ci-img" src="${imgSrc}" alt="${esc(item.name)}"
           onerror="this.src='${fallbackSVG(48)}'"/>
      <div class="ci-info">
        <div class="ci-code">${esc(item.code || item.id)}</div>
        <div class="ci-name tamil-name">${esc(tamilName)}</div>
        ${englishName ? `<div class="ci-name-en">${esc(englishName)}</div>` : ""}
        <div class="ci-qty-wrap">${esc(item.qty || "")}</div>
        <div class="ci-price-each">₹${item.price.toFixed(2)} each</div>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', -1)" aria-label="Decrease">−</button>
          <span   class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', +1)" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="ci-right">
        <span class="ci-total">₹${(item.qty * item.price).toFixed(2)}</span>
        <button class="ci-del" onclick="removeFromCart('${esc(item.id)}')" aria-label="Remove">🗑</button>
      </div>`;
    cartItemsEl.appendChild(d);
  });
}

function toggleCart() {
  const open = cartPanel.classList.toggle("open");
  cartOverlay.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

/* ─── 15. ORDER & INVOICE ────────────────────────────────────── */
async function placeOrder() {
  const items = Object.values(cart).map(i => ({
    code:  i.code || i.id,
    name:  i.name,
    qty:   i.qty,
    price: i.price,
    qty_unit: i.qty || "",
  }));
  if (!items.length) return;

  placeOrderBtn.textContent = "⏳ Generating Invoice…";
  placeOrderBtn.disabled    = true;

  // Attach user info if logged in
  const userEmail = window._currentUser?.email || window._currentUser?.phoneNumber || "Guest";
  const userName  = window._currentUser?.displayName || "Guest";

  try {
    const res = await fetch(`${API}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, customer: { name: userName, contact: userEmail } }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(`❌ Order failed: ${err.error || res.statusText}`);
      return;
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const cd   = res.headers.get("Content-Disposition") || "";
    a.href     = url;
    a.download = cd.match(/filename=([^\s;"]+)/)?.[1] || "aammii-order.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("🎉 Order placed! Invoice downloaded.");
    cart = {};
    updateCartUI();
    setTimeout(toggleCart, 1400);

  } catch (e) {
    showToast(`❌ ${e.message}`);
  } finally {
    placeOrderBtn.textContent = "📦 Place Order & Download Invoice";
    placeOrderBtn.disabled    = !Object.keys(cart).length;
  }
}

/* ─── 16. PRICE MODAL ───────────────────────────────────────── */
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
  updatePriceFilterBtn();
}
function resetPriceFilter() {
  $("minPrice").value = 0;
  $("maxPrice").value = 5000;
  updatePriceRange();
  minPriceFilter    = 0;
  maxPriceFilter    = 5000;
  priceFilterActive = false;
  applyFilters();
  updatePriceFilterBtn();
}
function updatePriceFilterBtn() {
  const btn = $("priceFilterBtn");
  if (!btn) return;
  if (priceFilterActive) {
    btn.classList.add("active-filter");
    btn.textContent = `₹${minPriceFilter}–${maxPriceFilter} ✕`;
    btn.onclick = () => { resetPriceFilter(); };
  } else {
    btn.classList.remove("active-filter");
    btn.textContent = "₹ Price Filter";
    btn.onclick = openPriceModal;
  }
}

/* ─── 17. TOAST ─────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ─── 18. UTILITIES ─────────────────────────────────────────── */
function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imageUrl(p) {
  if (!p.image) return fallbackSVG();
  return p.image.startsWith("/") ? `${API}${p.image}` : p.image;
}

function fallbackSVG(size = 280) {
  const h = size === 280 ? 160 : size;
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${size}%22 height=%22${h}%22><rect width=%22${size}%22 height=%22${h}%22 fill=%22%23f5f0e8%22 rx=%228%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2232%22>🌿</text></svg>`;
}

function isNewProduct(p) {
  if (!p.date_added) return false;
  const nowMs  = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return (nowMs - new Date(p.date_added).getTime()) <= weekMs;
}

/* ─── 19. PULL-TO-REFRESH ───────────────────────────────────── */
(function initPullToRefresh() {
  const indicator = $("ptrIndicator");
  const ptrTextEl = $("ptrText");
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
    const releasing = dist >= THRESHOLD;
    indicator.classList.toggle("ptr-releasing", releasing);
    ptrTextEl.textContent = releasing ? "Release to refresh" : "Pull to refresh";
  }, { passive: true });

  document.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    const dist = currentY - startY;
    if (dist >= THRESHOLD && !refreshing) {
      refreshing = true;
      indicator.classList.add("ptr-refreshing");
      indicator.classList.remove("ptr-releasing");
      ptrTextEl.textContent = "Refreshing…";
      await refreshProducts();
      setTimeout(() => {
        indicator.classList.remove("ptr-visible", "ptr-refreshing");
        ptrTextEl.textContent = "Pull to refresh";
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

/* ─── 19b. HERO CAROUSEL ────────────────────────────────────── */
(function initHeroCarousel() {
  const track  = $("hcTrack");
  const dotsEl = $("hcDots");
  const prev   = $("hcPrev");
  const next   = $("hcNext");
  if (!track) return;

  const slides = track.querySelectorAll(".hc-slide");
  const total  = slides.length;
  let cur = 0, autoTimer = null;

  // Build dots
  slides.forEach((_, i) => {
    const d = document.createElement("span");
    d.className = "hc-dot" + (i === 0 ? " active" : "");
    d.onclick = () => goTo(i);
    dotsEl.appendChild(d);
  });

  function goTo(idx) {
    cur = (idx + total) % total;
    track.style.transform = `translateX(-${cur * 100}%)`;
    dotsEl.querySelectorAll(".hc-dot").forEach((d, i) =>
      d.classList.toggle("active", i === cur));
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(cur + 1), 3000);
  }

  if (prev) prev.onclick = () => goTo(cur - 1);
  if (next) next.onclick = () => goTo(cur + 1);

  // Category nav on click
  slides.forEach((slide) => {
    slide.addEventListener("click", () => {
      const cat = slide.querySelector(".hc-en")?.textContent
        .replace(/&amp;/g, "&").trim();
      if (cat) filterByCategory(cat, null);
    });
  });

  // Touch swipe
  let tx = 0;
  track.parentElement.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
  track.parentElement.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
  }, { passive: true });

  resetAuto();
})();

/* ─── 20. AUTO-LOAD ON START ────────────────────────────────── */
(async () => {
  try {
    const res  = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setStatus("success", `✅ ${data.length} Aammii products ready — upload a PDF to update`);
      initShop(data);
    }
  } catch {
    setStatus("error", "⚠️ Could not connect to server. Make sure the backend is running.");
  }
})();
