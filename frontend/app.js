/**
 * app.js — Aammii Shop  v5  (Enhanced Mobile Edition)
 */

// ── API ────────────────────────────────────────────────────────
const API = "https://aammii.onrender.com";

// ── State ──────────────────────────────────────────────────────
let allProducts = [], filteredProducts = [], cart = {}, activeCategory = "all";
let priceFilterActive = false, minPriceFilter = 0, maxPriceFilter = 5000;
let activeQuickFilters = new Set();

// ── Category meta with emoji icons ────────────────────────────
const CAT_META = {
  "Beverages":           {emoji:"🍵", icon:"☕",  color:"#1abc9c"},
  "Books & DVDs":        {emoji:"📚", icon:"📚",  color:"#3d5a80"},
  "Copper Products":     {emoji:"🥇", icon:"🔶",  color:"#d4a043"},
  "Divine Products":     {emoji:"🕯", icon:"🕉️",  color:"#9b59b6"},
  "Dry Fruits & Nuts":   {emoji:"🥜", icon:"🥜",  color:"#784212"},
  "Face Pack":           {emoji:"✨", icon:"💆",  color:"#9b59b6"},
  "Health Mix":          {emoji:"💊", icon:"💪",  color:"#1a5276"},
  "Healthcare":          {emoji:"🩺", icon:"⚕️",  color:"#922b21"},
  "Herbal Powder":       {emoji:"🌿", icon:"🌿",  color:"#4a7c59"},
  "Home Care":           {emoji:"🧴", icon:"🏠",  color:"#2ecc71"},
  "Honey":               {emoji:"🍯", icon:"🍯",  color:"#c8922e"},
  "Millets & Grains":    {emoji:"🌾", icon:"🌾",  color:"#6b4226"},
  "Noodles & Vermicelli":{emoji:"🍜", icon:"🍜",  color:"#e67e22"},
  "Oils & Ghee":         {emoji:"🫙", icon:"🫒",  color:"#8b4513"},
  "Personal Care":       {emoji:"🌸", icon:"🧴",  color:"#9b59b6"},
  "Pickles":             {emoji:"🥒", icon:"🥒",  color:"#556b2f"},
  "Pulses & Dals":       {emoji:"🫘", icon:"🫘",  color:"#556b2f"},
  "Readymade Mix":       {emoji:"🍱", icon:"🍱",  color:"#d4a043"},
  "Salt":                {emoji:"🧂", icon:"🧂",  color:"#3d5a80"},
  "Seeds":               {emoji:"🌱", icon:"🌱",  color:"#27ae60"},
  "Soap":                {emoji:"🧼", icon:"🧼",  color:"#2980b9"},
  "Spices":              {emoji:"🌶", icon:"🌶️", color:"#c0392b"},
  "Sweeteners":          {emoji:"🍯", icon:"🍬",  color:"#d4a043"},
  "Vadagam & Appalam":   {emoji:"🥙", icon:"🍘",  color:"#8b4513"},
  "Wellness Tools":      {emoji:"🧘", icon:"🧘",  color:"#2980b9"},
};

// ── DOM refs ───────────────────────────────────────────────────
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

// ── Dark Mode ──────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem("aammii-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved ? saved === "dark" : prefersDark;
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
})();

function applyThemeIcon() {
  const icon = $("themeIcon");
  if (!icon) return;
  icon.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
}
function toggleTheme() {
  const html = document.documentElement;
  const nowDark = html.getAttribute("data-theme") === "dark";
  if (nowDark) { html.removeAttribute("data-theme"); localStorage.setItem("aammii-theme","light"); }
  else { html.setAttribute("data-theme","dark"); localStorage.setItem("aammii-theme","dark"); }
  applyThemeIcon();
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("aammii-theme")) {
    if (e.matches) document.documentElement.setAttribute("data-theme","dark");
    else document.documentElement.removeAttribute("data-theme");
    applyThemeIcon();
  }
});
applyThemeIcon();

// ── Scroll header effect ───────────────────────────────────────
window.addEventListener("scroll", () => {
  $("siteHeader").classList.toggle("scrolled", scrollY > 80);
});

// ── Animated counters ──────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll(".stat-num").forEach(el => {
    const target = +el.dataset.target, dur = 1800;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.floor(p * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  });
}
const obs = new IntersectionObserver(e => {
  if (e[0].isIntersecting) { animateCounters(); obs.disconnect(); }
}, {threshold:.3});
const heroStats = document.querySelector(".hero-stats");
if (heroStats) obs.observe(heroStats);

// ── Build category grid ────────────────────────────────────────
function buildCatGrid(products) {
  const counts = {};
  products.forEach(p => counts[p.category] = (counts[p.category]||0) + 1);
  const cats = Object.keys(counts).sort((a,b) => counts[b]-counts[a]);
  catGrid.innerHTML = cats.map(cat => {
    const m = CAT_META[cat] || {emoji:"📦",color:"#4a7c59"};
    return `<div class="cat-card" style="--cat-color:${m.color}" onclick="filterByCategory('${esc(cat)}',null);document.getElementById('shopMain').scrollIntoView({behavior:'smooth'})">
      <span class="cat-emoji">${m.emoji}</span>
      <div class="cat-name">${esc(cat)}</div>
      <div class="cat-count">${counts[cat]} items</div>
      <div class="cat-bar"></div>
    </div>`;
  }).join("");
}

// ── Upload PDF ─────────────────────────────────────────────────
const STEPS = [
  "📄 Reading PDF structure…","🔍 Scanning product tables…",
  "🌿 Identifying Aammii catalogue…","🏷️  Matching product codes & prices…",
  "🎨 Generating product images…","✨ Almost ready…"
];
async function uploadPDF(input) {
  const file = input.files[0];
  if (!file) return;
  uploadText.textContent = file.name;
  setStatus("loading", STEPS[0]);
  uploadProgress.classList.remove("hidden");
  progressBar.style.width = "0%";
  let w = 0, si = 0;
  const iv = setInterval(() => {
    w = Math.min(w + Math.random() * 5 + 1, 88);
    progressBar.style.width = w + "%";
    const ns = Math.floor((w / 88) * (STEPS.length - 1));
    if (ns !== si) { si = ns; setStatus("loading", STEPS[si]); if (progressLabel) progressLabel.textContent = STEPS[si]; }
  }, 220);
  try {
    const fd = new FormData(); fd.append("pdf", file);
    const res = await fetch(`${API}/api/upload`, {method:"POST",body:fd});
    clearInterval(iv);
    progressBar.style.width = "100%";
    setTimeout(() => { uploadProgress.classList.add("hidden"); progressBar.style.width="0%"; }, 500);
    const text = await res.text();
    if (!text.trim()) { setStatus("error","❌ Server returned empty response."); return; }
    let data;
    try { data = JSON.parse(text); } catch { setStatus("error","❌ Invalid JSON from server."); return; }
    if (!res.ok || data.error) { setStatus("error", `❌ ${data.error}`); return; }
    const note = data.note || "";
    const msg = data.source === "preloaded" ? `✅ ${note || `Loaded ${data.count} Aammii products!`}` : `✅ Extracted ${data.count} products!`;
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
// drag-drop
document.getElementById("hero").addEventListener("dragover", e => { e.preventDefault(); });
document.getElementById("hero").addEventListener("drop", e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f?.name.endsWith(".pdf")) {
    const dt = new DataTransfer(); dt.items.add(f);
    $("pdfInput").files = dt.files; uploadPDF($("pdfInput"));
  }
});

// ── Init shop ──────────────────────────────────────────────────
function initShop(products) {
  allProducts = products; filteredProducts = [...products];
  buildCatGrid(products);
  buildFilterChips(products);
  renderProducts(filteredProducts);
  filterBar.classList.remove("hidden");
  shopMain.classList.remove("hidden");
  $("quickFiltersBar").classList.remove("hidden");
}
function scrollToShop() {
  if (shopMain.classList.contains("hidden") && allProducts.length) shopMain.classList.remove("hidden");
}

// ── Filter chips ───────────────────────────────────────────────
function buildFilterChips(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();
  const fc = $("filterChips");
  fc.querySelectorAll(".dyn").forEach(c => c.remove());
  cats.forEach(cat => {
    const b = document.createElement("button");
    b.className = "chip dyn";
    const m = CAT_META[cat] || {icon:"📦"};
    b.innerHTML = `${m.icon} ${cat}`;
    b.onclick = () => filterByCategory(cat, b);
    fc.appendChild(b);
  });
}

function filterByCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else document.querySelectorAll(".chip").forEach(c => {
    const label = c.textContent.trim();
    if (label.includes(cat) || (cat === "all" && label === "All")) c.classList.add("active");
  });
  // Update bottom nav category label
  const bnCatLabel = $("bnCatLabel");
  if (bnCatLabel) bnCatLabel.textContent = cat === "all" ? "Categories" : cat.split(" ")[0];
  applyFilters();
  // Auto-collapse on mobile after selection
  if (window.innerWidth < 640 && cat !== "all") {
    setTimeout(() => {
      if (shopMain) shopMain.scrollIntoView({behavior:"smooth",block:"start"});
    }, 150);
  }
}

// ── Quick Filters ──────────────────────────────────────────────
function toggleQuickFilter(btn, filter) {
  if (filter === "price") { openPriceModal(); return; }
  if (activeQuickFilters.has(filter)) {
    activeQuickFilters.delete(filter);
    btn.classList.remove("active");
  } else {
    activeQuickFilters.add(filter);
    btn.classList.add("active");
  }
  applyFilters();
}

// ── Price Modal ────────────────────────────────────────────────
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
  $("previewMin").textContent = min;
  $("previewMax").textContent = max;
  updateSliderTrack($("minPrice"));
  updateSliderTrack($("maxPrice"));
}
function updateSliderTrack(slider) {
  const min = +slider.min, max = +slider.max, val = +slider.value;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty("--val", pct + "%");
}
function applyPriceFilter() {
  minPriceFilter = +$("minPrice").value;
  maxPriceFilter = +$("maxPrice").value;
  priceFilterActive = true;
  // Mark the price chip as active
  const priceBtn = document.querySelector('.qf-chip[data-filter="price"]');
  if (priceBtn) priceBtn.classList.add("price-active");
  closePriceModal();
  applyFilters();
}
function resetPriceFilter() {
  $("minPrice").value = 0; $("maxPrice").value = 5000;
  updatePriceRange();
  minPriceFilter = 0; maxPriceFilter = 5000;
  priceFilterActive = false;
  const priceBtn = document.querySelector('.qf-chip[data-filter="price"]');
  if (priceBtn) priceBtn.classList.remove("price-active");
  applyFilters();
}

// ── Search & filter ────────────────────────────────────────────
function filterProducts() { applyFilters(); }
function applyFilters() {
  const q = $("searchInput").value.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    const mc = activeCategory === "all" || p.category === activeCategory;
    const mt = !q || p.name.toLowerCase().includes(q)
               || (p.code||"").toLowerCase().includes(q)
               || (p.category||"").toLowerCase().includes(q);
    const mp = !priceFilterActive || (p.price >= minPriceFilter && p.price <= maxPriceFilter);
    return mc && mt && mp;
  });
  sortProducts(false);
}
function sortProducts(reRender = true) {
  const v = $("sortSelect").value;
  const a = reRender ? filteredProducts : [...filteredProducts];
  if (v === "price-asc")  a.sort((x,y) => x.price - y.price);
  if (v === "price-desc") a.sort((x,y) => y.price - x.price);
  if (v === "name-asc")   a.sort((x,y) => x.name.localeCompare(y.name));
  filteredProducts = a;
  renderProducts(filteredProducts);
}

// ── Render products ────────────────────────────────────────────
function renderProducts(products) {
  productGrid.innerHTML = "";
  $("resultsInfo").textContent = `Showing ${products.length} of ${allProducts.length} products`;
  if (!products.length) { noResults.classList.remove("hidden"); return; }
  noResults.classList.add("hidden");
  const frag = document.createDocumentFragment();
  products.forEach((p, i) => {
    const imgSrc = p.image?.startsWith("/") ? `${API}${p.image}` : p.image;
    // Short category label (max 10 chars)
    const catShort = (p.category || "").toUpperCase().slice(0,12);
    const div = document.createElement("div");
    div.className = "product-card";
    div.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;
    div.innerHTML = `
      <div class="card-img">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22160%22><rect width=%22280%22 height=%22160%22 fill=%22%23f5f0e8%22/><text x=%22140%22 y=%2288%22 text-anchor=%22middle%22 font-size=%2236%22>🌿</text></svg>'"/>
        <span class="card-instock-badge">In Stock</span>
        <span class="card-cat-badge">${esc(catShort)}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-qty">${esc(p.qty||"")}</div>
        <div class="card-foot">
          <div class="card-price">₹${p.price.toFixed(2)}</div>
          <button class="add-btn" id="ab-${esc(p.id)}" onclick="addToCart('${esc(p.id)}')" title="Add to cart">+</button>
        </div>
      </div>`;
    frag.appendChild(div);
  });
  productGrid.appendChild(frag);
}

// ── Cart ───────────────────────────────────────────────────────
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  cart[id] ? cart[id].qty++ : (cart[id] = {...p, qty:1});
  const btn = $(`ab-${id}`);
  if (btn) {
    btn.textContent = "✓";
    btn.classList.add("added");
    setTimeout(() => { btn.textContent = "+"; btn.classList.remove("added"); }, 1000);
  }
  updateCartUI();
  showToast(`🛒 ${p.name.slice(0,28)} added`);
}
function removeFromCart(id) { delete cart[id]; updateCartUI(); }
function changeQty(id, d) {
  if (!cart[id]) return;
  cart[id].qty += d;
  if (cart[id].qty <= 0) { removeFromCart(id); return; }
  updateCartUI();
}
function updateCartUI() {
  const items = Object.values(cart);
  const tq = items.reduce((s,i) => s+i.qty, 0);
  const tp = items.reduce((s,i) => s+i.qty*i.price, 0);
  // Header badges
  cartBadge.textContent = tq;
  cartPill.textContent  = `₹${tp.toFixed(0)}`;
  totalItemsEl.textContent = tq;
  totalPriceEl.textContent = `₹${tp.toFixed(2)}`;
  placeOrderBtn.disabled = !items.length;
  cartEmpty.style.display = items.length ? "none" : "flex";
  // Bottom nav cart badge
  const bnBadge = $("bnCartBadge");
  if (bnBadge) bnBadge.textContent = tq;
  // Cart items list
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
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}',+1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="ci-total">₹${(item.qty*item.price).toFixed(2)}</span>
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

// ── Place order ────────────────────────────────────────────────
async function placeOrder() {
  const items = Object.values(cart).map(i => ({name:i.name,qty:i.qty,price:i.price}));
  if (!items.length) return;
  placeOrderBtn.textContent = "⏳ Generating…";
  placeOrderBtn.disabled = true;
  try {
    const res = await fetch(`${API}/api/order`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items})});
    if (!res.ok) { showToast("❌ Order failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const cd = res.headers.get("Content-Disposition")||"";
    a.href=url; a.download=cd.match(/filename=([^\s;]+)/)?.[1]||"order.txt";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("🎉 Order placed! Invoice downloading…");
    cart = {}; updateCartUI(); setTimeout(toggleCart, 1200);
  } catch(e) { showToast(`❌ ${e.message}`); }
  finally { placeOrderBtn.textContent = "Place Order & Download Invoice"; placeOrderBtn.disabled = !Object.keys(cart).length; }
}

// ── Toast ──────────────────────────────────────────────────────
let toastTm;
function showToast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove("show"), 2800);
}

// ── HTML escape ────────────────────────────────────────────────
function esc(s) {
  if (s==null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ── Bottom Navigation ──────────────────────────────────────────
function bottomNavTab(tab) {
  // Clear active states
  document.querySelectorAll(".bn-item").forEach(b => b.classList.remove("active"));
  $(`bn-${tab}`)?.classList.add("active");

  switch(tab) {
    case "home":
      window.scrollTo({top:0, behavior:"smooth"});
      break;
    case "categories":
      const catSection = document.getElementById("categories");
      if (catSection) catSection.scrollIntoView({behavior:"smooth"});
      // If shop is open, also scroll to filter bar
      if (!shopMain.classList.contains("hidden")) {
        setTimeout(() => {
          filterBar.scrollIntoView({behavior:"smooth", block:"start"});
        }, 400);
      }
      break;
    case "cart":
      toggleCart();
      // Re-set home as active since cart is a panel, not a page
      setTimeout(() => {
        document.querySelectorAll(".bn-item").forEach(b => b.classList.remove("active"));
        $("bn-home")?.classList.add("active");
      }, 100);
      break;
    case "account":
      showToast("👤 Account features coming soon!");
      break;
  }
}

// ── Pull-to-Refresh ────────────────────────────────────────────
(function initPullToRefresh() {
  const indicator = $("ptrIndicator");
  const ptrText = $("ptrText");
  const THRESHOLD = 80;
  let startY = 0, currentY = 0, pulling = false, refreshing = false;

  document.addEventListener("touchstart", e => {
    if (window.scrollY > 0) return; // only at top
    startY = e.touches[0].clientY;
    pulling = true;
  }, {passive:true});

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
  }, {passive:true});

  document.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    const dist = currentY - startY;

    if (dist >= THRESHOLD && !refreshing) {
      refreshing = true;
      indicator.classList.add("ptr-refreshing");
      indicator.classList.remove("ptr-releasing");
      ptrText.textContent = "Refreshing…";
      // Simulate refresh — reload products
      await refreshProducts();
      setTimeout(() => {
        indicator.classList.remove("ptr-visible","ptr-refreshing");
        ptrText.textContent = "Pull to refresh";
        refreshing = false;
        currentY = 0; startY = 0;
      }, 600);
    } else {
      indicator.classList.remove("ptr-visible","ptr-releasing");
      currentY = 0; startY = 0;
    }
  }, {passive:true});
})();

async function refreshProducts() {
  try {
    const res = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      initShop(data);
      showToast("✅ Products refreshed!");
    }
  } catch (_) {
    showToast("⚠️ Refresh failed — check connection");
  }
}

// ── Auto-load on start ─────────────────────────────────────────
(async () => {
  try {
    const res  = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setStatus("success", `✅ ${data.length} Aammii products ready — upload a PDF to refresh`);
      initShop(data);
    }
  } catch (_) {}
})();