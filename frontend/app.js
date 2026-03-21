/**
 * app.js — Aammii Shop  v4  (complete rebuild)
 */

// ── API: always Flask at 5000 ──────────────────────────────────────────────
const API = location.hostname === 'localhost'
  ? `${location.protocol}//${location.hostname}:5000`
  : `"https://aammii.onrender.com";`;

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
  "Home Care":           {emoji:"🧴",color:"#2ecc71"},
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

// ── Animated counters ──────────────────────────────────────────────────────
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
const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) { animateCounters(); obs.disconnect(); } }, {threshold:.3});
obs.observe(document.querySelector(".hero-stats"));

// ── Build category grid ────────────────────────────────────────────────────
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

// ── Upload PDF ─────────────────────────────────────────────────────────────
const STEPS = [
  "📄 Reading PDF structure…",
  "🔍 Scanning product tables…",
  "🌿 Identifying Aammii catalogue…",
  "🏷️  Matching product codes & prices…",
  "🎨 Generating product images…",
  "✨ Almost ready…"
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
    const fd = new FormData();
    fd.append("pdf", file);
    const res = await fetch(`${API}/api/upload`, {method:"POST",body:fd});
    clearInterval(iv);
    progressBar.style.width = "100%";
    setTimeout(() => { uploadProgress.classList.add("hidden"); progressBar.style.width="0%"; }, 500);

    const text = await res.text();
    if (!text.trim()) { setStatus("error","❌ Server returned empty response. Run: bash run.sh"); return; }
    let data;
    try { data = JSON.parse(text); } catch { setStatus("error","❌ Invalid JSON from server."); return; }
    if (!res.ok || data.error) { setStatus("error", `❌ ${data.error}`); return; }

    const note = data.note || "";
    const msg = data.source === "preloaded"
      ? `✅ ${note || `Loaded ${data.count} Aammii products!`}`
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

// ── Init shop ──────────────────────────────────────────────────────────────
function initShop(products) {
  allProducts = products; filteredProducts = [...products];
  buildCatGrid(products);
  buildFilterChips(products);
  renderProducts(filteredProducts);
  filterBar.classList.remove("hidden");
  shopMain.classList.remove("hidden");
}

function scrollToShop() {
  if (shopMain.classList.contains("hidden") && allProducts.length) {
    shopMain.classList.remove("hidden");
  }
}

// ── Filter chips ───────────────────────────────────────────────────────────
function buildFilterChips(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();
  const fc = $("filterChips");
  fc.querySelectorAll(".dyn").forEach(c => c.remove());
  cats.forEach(cat => {
    const b = document.createElement("button");
    b.className = "chip dyn"; b.textContent = cat;
    b.onclick = () => filterByCategory(cat, b);
    fc.appendChild(b);
  });
}

function filterByCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    document.querySelectorAll(".chip").forEach(c => { if (c.textContent === cat) c.classList.add("active"); });
  }
  applyFilters();
}

// ── Search & filter ────────────────────────────────────────────────────────
function filterProducts() { applyFilters(); }
function applyFilters() {
  const q = $("searchInput").value.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    const mc = activeCategory === "all" || p.category === activeCategory;
    const mt = !q || p.name.toLowerCase().includes(q)
               || (p.code||"").toLowerCase().includes(q)
               || (p.category||"").toLowerCase().includes(q);
    return mc && mt;
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

// ── Render products ────────────────────────────────────────────────────────
function renderProducts(products) {
  productGrid.innerHTML = "";
  $("resultsInfo").textContent = `Showing ${products.length} of ${allProducts.length} products`;
  if (!products.length) { noResults.classList.remove("hidden"); return; }
  noResults.classList.add("hidden");
  const frag = document.createDocumentFragment();
  products.forEach((p, i) => {
    const imgSrc = p.image?.startsWith("/") ? `${API}${p.image}` : p.image;
    const div = document.createElement("div");
    div.className = "product-card";
    div.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;
    div.innerHTML = `
      <div class="card-img">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22160%22><rect width=%22280%22 height=%22160%22 fill=%22%23f5f0e8%22/><text x=%22140%22 y=%2288%22 text-anchor=%22middle%22 font-size=%2236%22>🌿</text></svg>'"/>
        <span class="card-badge">${esc(p.category)}</span>
        ${p.code ? `<span class="card-code">${esc(p.code)}</span>` : ""}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-qty">${esc(p.qty||"")}</div>
        <div class="card-foot">
          <div class="card-price">₹${p.price.toFixed(2)}</div>
          <button class="add-btn" id="ab-${esc(p.id)}" onclick="addToCart('${esc(p.id)}')" title="Add">+</button>
        </div>
      </div>`;
    frag.appendChild(div);
  });
  productGrid.appendChild(frag);
}

// ── Cart ───────────────────────────────────────────────────────────────────
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  cart[id] ? cart[id].qty++ : (cart[id] = {...p, qty:1});
  const btn = $(`ab-${id}`);
  if (btn) { btn.textContent = "✓"; btn.classList.add("added");
    setTimeout(() => { btn.textContent = "+"; btn.classList.remove("added"); }, 800); }
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
  cartBadge.textContent = tq;
  cartPill.textContent  = `₹${tp.toFixed(0)}`;
  totalItemsEl.textContent = tq;
  totalPriceEl.textContent = `₹${tp.toFixed(2)}`;
  placeOrderBtn.disabled = !items.length;
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

// ── Place order ────────────────────────────────────────────────────────────
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

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTm;
function showToast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove("show"), 2800);
}

// ── HTML escape ────────────────────────────────────────────────────────────
function esc(s) {
  if (s==null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ── Auto-load on start ─────────────────────────────────────────────────────
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