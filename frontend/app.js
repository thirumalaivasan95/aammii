/**
 * app.js — Aammii Shop Frontend
 * ─────────────────────────────
 * KEY FIX: API always points to the Flask backend at port 5000,
 * regardless of which port this page is served from (e.g. VS Code Live Server at 5500).
 */

// ── API base: always Flask at 5000 ─────────────────────────────────────────
const API = (() => {
  // If the page IS being served by Flask (port 5000), use same origin.
  // If served by anything else (e.g. VS Code Live Server at 5500), point to 5000.
  const { protocol, hostname, port } = window.location;
  return port === "5000"
    ? `${protocol}//${hostname}:5000`
    : `${protocol}//${hostname}:5000`;
})();

// ── State ──────────────────────────────────────────────────────────────────
let allProducts      = [];
let filteredProducts = [];
let cart             = {};
let activeCategory   = "all";

// ── DOM refs ───────────────────────────────────────────────────────────────
const productGrid    = document.getElementById("productGrid");
const filterBar      = document.getElementById("filterBar");
const shopMain       = document.getElementById("shopMain");
const hero           = document.getElementById("hero");
const cartPanel      = document.getElementById("cartPanel");
const cartOverlay    = document.getElementById("cartOverlay");
const cartItems      = document.getElementById("cartItems");
const cartEmpty      = document.getElementById("cartEmpty");
const cartBadge      = document.getElementById("cartBadge");
const cartPill       = document.getElementById("cartPill");
const totalItemsEl   = document.getElementById("totalItems");
const totalPriceEl   = document.getElementById("totalPrice");
const placeOrderBtn  = document.getElementById("placeOrderBtn");
const resultsInfo    = document.getElementById("resultsInfo");
const noResults      = document.getElementById("noResults");
const uploadStatus   = document.getElementById("uploadStatus");
const uploadProgress = document.getElementById("uploadProgress");
const progressBar    = document.getElementById("progressBar");
const uploadText     = document.getElementById("uploadText");

// ── PDF Upload ─────────────────────────────────────────────────────────────
async function uploadPDF(input) {
  const file = input.files[0];
  if (!file) return;

  uploadText.textContent = `Uploading: ${file.name}`;
  setStatus("loading", "⏳ Parsing catalogue, please wait…");
  showProgress(true);
  animateProgress();

  const fd = new FormData();
  fd.append("pdf", file);

  try {
    const res = await fetch(`${API}/api/upload`, { method: "POST", body: fd });

    showProgress(false);

    // Guard: empty body → server crashed
    const text = await res.text();
    if (!text || text.trim() === "") {
      setStatus("error", "❌ Server returned an empty response. Check the terminal for errors.");
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      setStatus("error", `❌ Server response was not valid JSON: ${text.slice(0, 120)}`);
      return;
    }

    if (!res.ok || data.error) {
      setStatus("error", `❌ ${data.error || "Upload failed"}`);
      return;
    }

    setStatus("success", `✅ Loaded ${data.count} products from catalogue!`);
    uploadText.textContent = `✔ ${file.name}`;
    initShop(data.products);

  } catch (err) {
    showProgress(false);
    setStatus("error",
      `❌ Cannot reach Flask server at ${API}. ` +
      `Make sure you ran: cd backend && python3 app.py`);
  }
}

function setStatus(type, msg) {
  uploadStatus.className = `upload-status ${type}`;
  uploadStatus.textContent = msg;
  uploadStatus.classList.remove("hidden");
}

let progressInterval;
function animateProgress() {
  progressBar.style.width = "0%";
  let w = 0;
  progressInterval = setInterval(() => {
    w = Math.min(w + Math.random() * 8, 88);
    progressBar.style.width = w + "%";
  }, 180);
}
function showProgress(show) {
  if (!show) {
    clearInterval(progressInterval);
    progressBar.style.width = "100%";
    setTimeout(() => {
      uploadProgress.classList.add("hidden");
      progressBar.style.width = "0";
    }, 400);
  } else {
    uploadProgress.classList.remove("hidden");
  }
}

// ── Drag-and-drop PDF onto hero ────────────────────────────────────────────
document.getElementById("hero").addEventListener("dragover", e => {
  e.preventDefault();
  e.currentTarget.style.background = "rgba(212,160,67,0.12)";
});
document.getElementById("hero").addEventListener("dragleave", e => {
  e.currentTarget.style.background = "";
});
document.getElementById("hero").addEventListener("drop", e => {
  e.preventDefault();
  e.currentTarget.style.background = "";
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith(".pdf")) {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById("pdfInput").files = dt.files;
    uploadPDF(document.getElementById("pdfInput"));
  }
});

// ── Init shop after load ───────────────────────────────────────────────────
function initShop(products) {
  allProducts      = products;
  filteredProducts = [...products];

  buildCategoryChips(products);
  renderProducts(filteredProducts);

  filterBar.classList.remove("hidden");
  shopMain.classList.remove("hidden");
  hero.style.minHeight = "160px";

  setTimeout(() => shopMain.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
}

// ── Category chips ─────────────────────────────────────────────────────────
function buildCategoryChips(products) {
  const cats  = [...new Set(products.map(p => p.category))].sort();
  const inner = document.querySelector(".filter-inner");
  inner.querySelectorAll(".dynamic-chip").forEach(c => c.remove());
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-chip dynamic-chip";
    btn.textContent = cat;
    btn.onclick = () => filterByCategory(cat, btn);
    inner.appendChild(btn);
  });
}

function filterByCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  applyFilters();
}

// ── Search + filter ────────────────────────────────────────────────────────
function filterProducts() { applyFilters(); }

function applyFilters() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    const matchCat  = activeCategory === "all" || p.category === activeCategory;
    const matchText = !q
      || p.name.toLowerCase().includes(q)
      || (p.code     && p.code.toLowerCase().includes(q))
      || (p.category && p.category.toLowerCase().includes(q));
    return matchCat && matchText;
  });
  sortProducts(false);
}

function sortProducts(reRender = true) {
  const val = document.getElementById("sortSelect").value;
  const arr = reRender ? filteredProducts : [...filteredProducts];
  switch (val) {
    case "price-asc":  arr.sort((a, b) => a.price - b.price); break;
    case "price-desc": arr.sort((a, b) => b.price - a.price); break;
    case "name-asc":   arr.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  filteredProducts = arr;
  renderProducts(filteredProducts);
}

// ── Render product grid ────────────────────────────────────────────────────
function renderProducts(products) {
  productGrid.innerHTML = "";
  resultsInfo.textContent = `Showing ${products.length} of ${allProducts.length} products`;

  if (!products.length) {
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");

  products.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.animationDelay = `${Math.min(i * 0.04, 0.5)}s`;

    // Images served from Flask at port 5000
    const imgSrc = p.image.startsWith("/") ? `${API}${p.image}` : p.image;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22170%22><rect width=%22280%22 height=%22170%22 fill=%22%23f5f0e8%22/><text x=%22140%22 y=%2290%22 text-anchor=%22middle%22 font-size=%2240%22>🌿</text></svg>'"/>
        <span class="card-cat-badge">${esc(p.category)}</span>
        ${p.code ? `<span class="card-code">${esc(p.code)}</span>` : ""}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-qty">${esc(p.qty || "")}</div>
        <div class="card-footer">
          <div class="card-price">₹<span>${p.price.toFixed(2)}</span></div>
          <button class="add-btn" id="addbtn-${esc(p.id)}"
                  onclick="addToCart('${esc(p.id)}')"
                  title="Add to cart">+</button>
        </div>
      </div>`;
    productGrid.appendChild(card);
  });
}

// ── Cart operations ────────────────────────────────────────────────────────
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  cart[productId]
    ? cart[productId].qty++
    : (cart[productId] = { ...product, qty: 1 });

  const btn = document.getElementById(`addbtn-${productId}`);
  if (btn) {
    btn.textContent = "✓";
    btn.classList.add("added");
    setTimeout(() => { btn.textContent = "+"; btn.classList.remove("added"); }, 900);
  }

  updateCartUI();
  showToast(`🛒 ${product.name.slice(0, 30)} added to cart`);
}

function removeFromCart(productId) {
  delete cart[productId];
  updateCartUI();
}

function changeQty(productId, delta) {
  if (!cart[productId]) return;
  cart[productId].qty += delta;
  if (cart[productId].qty <= 0) { removeFromCart(productId); return; }
  updateCartUI();
}

function updateCartUI() {
  const items    = Object.values(cart);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const total    = items.reduce((s, i) => s + i.qty * i.price, 0);

  cartBadge.textContent = totalQty;
  cartPill.textContent  = `₹${total.toFixed(0)}`;
  totalItemsEl.textContent = totalQty;
  totalPriceEl.textContent = `₹${total.toFixed(2)}`;
  placeOrderBtn.disabled   = items.length === 0;
  cartEmpty.style.display  = items.length ? "none" : "flex";

  cartItems.innerHTML = "";
  items.forEach(item => {
    const imgSrc = item.image.startsWith("/") ? `${API}${item.image}` : item.image;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img class="cart-item-img" src="${imgSrc}" alt="${esc(item.name)}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2252%22 height=%2252%22><rect width=%2252%22 height=%2252%22 fill=%22%23f5f0e8%22 rx=%2210%22/><text x=%2226%22 y=%2234%22 text-anchor=%22middle%22 font-size=%2226%22>🌿</text></svg>'"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}</div>
        <div class="cart-item-price">₹${item.price.toFixed(2)} each · ${item.qty || ""}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', -1)">−</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${esc(item.id)}', +1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="cart-item-total">₹${(item.qty * item.price).toFixed(2)}</span>
        <button class="remove-btn" onclick="removeFromCart('${esc(item.id)}')">🗑</button>
      </div>`;
    cartItems.appendChild(row);
  });
}

// ── Cart panel toggle ──────────────────────────────────────────────────────
function toggleCart() {
  const open = cartPanel.classList.toggle("open");
  cartOverlay.classList.toggle("visible", open);
  document.body.style.overflow = open ? "hidden" : "";
}

// ── Place order ────────────────────────────────────────────────────────────
async function placeOrder() {
  const items = Object.values(cart).map(i => ({ name: i.name, qty: i.qty, price: i.price }));
  if (!items.length) return;

  placeOrderBtn.textContent = "⏳ Generating invoice…";
  placeOrderBtn.disabled    = true;

  try {
    const res = await fetch(`${API}/api/order`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ items }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      showToast(`❌ Order failed: ${err.error}`);
      return;
    }

    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    const cd    = res.headers.get("Content-Disposition") || "";
    const fname = cd.match(/filename=([^\s;]+)/)?.[1] || "order.txt";
    a.href = url; a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("🎉 Order placed! Invoice downloading…");
    cart = {};
    updateCartUI();
    setTimeout(toggleCart, 1200);

  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    placeOrderBtn.textContent = "Place Order & Download Invoice";
    placeOrderBtn.disabled    = Object.keys(cart).length === 0;
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ── HTML escaping ──────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Auto-load cached products on page open ─────────────────────────────────
(async () => {
  try {
    const res  = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setStatus("success", `✅ ${data.length} products ready — upload a new PDF to refresh`);
      initShop(data);
    }
  } catch (_) { /* no cache yet */ }
})();
