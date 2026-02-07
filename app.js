const cartKey = "pedalpeak-cart-v1";

let catalog = [];
let bikes = [];
let otherProducts = [];
let productIndex = new Map();
let cart = loadCart();

const categoryFilter = document.getElementById("categoryFilter");
const priceFilter = document.getElementById("priceFilter");
const priceValue = document.getElementById("priceValue");
const searchInput = document.getElementById("searchInput");
const productGrid = document.getElementById("productGrid");
const accessoryGrid = document.getElementById("accessoryGrid");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const year = document.getElementById("year");

document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("clearCart").addEventListener("click", clearCart);
overlay.addEventListener("click", closeCart);

categoryFilter.addEventListener("change", renderCatalog);
priceFilter.addEventListener("input", () => {
  priceValue.textContent = formatMoney(Number(priceFilter.value));
  renderCatalog();
});
searchInput.addEventListener("input", renderCatalog);

productGrid.addEventListener("click", handleAddClick);
accessoryGrid.addEventListener("click", handleAddClick);
checkoutForm.addEventListener("submit", submitCheckout);

year.textContent = String(new Date().getFullYear());
renderCart();
bootstrap();

async function bootstrap() {
  productGrid.innerHTML = '<p class="hidden-message">در حال بارگذاری محصولات...</p>';

  catalog = await window.CatalogStore.loadCatalog();
  bikes = catalog.filter((item) => item.itemType === "bicycle");
  otherProducts = catalog.filter((item) => item.itemType !== "bicycle");
  productIndex = new Map(catalog.map((item) => [item.id, item]));

  syncPriceRange();
  reconcileCart();
  renderCatalog();
  renderCart();
}

function renderCatalog() {
  renderBikes();
  renderOtherProducts();
}

function renderBikes() {
  if (bikes.length === 0) {
    productGrid.innerHTML = '<p class="hidden-message">محصولی برای نمایش وجود ندارد.</p>';
    return;
  }

  const category = categoryFilter.value;
  const maxPrice = Number(priceFilter.value);
  const query = searchInput.value.trim().toLowerCase();

  const filtered = bikes.filter((item) => {
    const byCategory = category === "all" || item.category === category;
    const byPrice = item.price <= maxPrice;
    const bySearch = !query || item.searchText.includes(query);
    return byCategory && byPrice && bySearch;
  });

  if (filtered.length === 0) {
    productGrid.innerHTML = '<p class="hidden-message">نتیجه‌ای برای این فیلتر پیدا نشد.</p>';
    return;
  }

  productGrid.innerHTML = filtered.map(productCard).join("");
}

function renderOtherProducts() {
  if (otherProducts.length === 0) {
    accessoryGrid.innerHTML = '<p class="hidden-message">کالای دیگری ثبت نشده است.</p>';
    return;
  }

  const query = searchInput.value.trim().toLowerCase();
  const filtered = otherProducts.filter((item) => !query || item.searchText.includes(query));

  if (filtered.length === 0) {
    accessoryGrid.innerHTML = '<p class="hidden-message">نتیجه‌ای در سایر کالاها پیدا نشد.</p>';
    return;
  }

  accessoryGrid.innerHTML = filtered.map(productCard).join("");
}

function productCard(item) {
  const image = item.image || "";
  const safeName = escapeHtml(item.name);
  const safeDesc = escapeHtml(item.description);

  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${escapeHtml(image)}" alt="${safeName}" loading="lazy" onerror="this.style.display='none'" />
        <span class="image-label">${escapeHtml(item.tag)}</span>
      </div>
      <div class="product-meta">
        <span>${categoryLabel(item)}</span>
        <span>کد: ${escapeHtml(item.sku.replace(".jpg", ""))}</span>
      </div>
      <h3>${safeName}</h3>
      <p>${safeDesc}</p>
      <div class="card-foot">
        <span class="price">${formatMoney(item.price)}</span>
        <button class="add-btn" data-id="${item.id}">افزودن</button>
      </div>
    </article>
  `;
}

function handleAddClick(event) {
  const button = event.target.closest(".add-btn");
  if (!button) return;
  addToCart(button.dataset.id);
}

function addToCart(id) {
  const product = productIndex.get(id);
  if (!product) return;

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
    });
  }

  persistCart();
  renderCart();
  openCart();
}

function renderCart() {
  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="hidden-message">سبد خرید شما خالی است.</p>';
    cartTotal.textContent = formatMoney(0);
    cartCount.textContent = "0";
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <article class="cart-item">
          <div class="cart-item-head">
            <strong>${escapeHtml(item.name)}</strong>
            <strong>${formatMoney(item.price * item.qty)}</strong>
          </div>
          <small>${formatMoney(item.price)} برای هر عدد</small>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="کاهش">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="افزایش">+</button>
            <button class="remove-btn" data-action="remove" data-id="${item.id}">حذف</button>
          </div>
        </article>
      `
    )
    .join("");

  cartItems.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { id, action } = button.dataset;
      if (action === "increase") updateQty(id, 1);
      if (action === "decrease") updateQty(id, -1);
      if (action === "remove") removeFromCart(id);
    });
  });

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartCount.textContent = String(totalQty);
  cartTotal.textContent = formatMoney(totalPrice);
}

function updateQty(id, delta) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }

  persistCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((entry) => entry.id !== id);
  persistCart();
  renderCart();
}

function clearCart() {
  cart = [];
  persistCart();
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

function submitCheckout(event) {
  event.preventDefault();

  if (cart.length === 0) {
    checkoutMessage.textContent = "ابتدا یک محصول به سبد خرید اضافه کنید.";
    return;
  }

  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") || "").trim() || "مشتری عزیز";

  checkoutMessage.textContent = `${name}، سفارش شما ثبت شد. به‌زودی تماس می‌گیریم.`;
  event.currentTarget.reset();
  clearCart();
  closeCart();
}

function syncPriceRange() {
  if (bikes.length === 0) {
    priceFilter.min = "0";
    priceFilter.max = "0";
    priceFilter.value = "0";
    priceValue.textContent = formatMoney(0);
    return;
  }

  const prices = bikes.map((item) => item.price);
  const min = Math.floor(Math.min(...prices) / 100000) * 100000;
  const max = Math.ceil(Math.max(...prices) / 100000) * 100000;

  priceFilter.min = String(Math.max(0, min));
  priceFilter.max = String(Math.max(100000, max));
  priceFilter.step = "100000";
  priceFilter.value = String(Math.max(100000, max));
  priceValue.textContent = formatMoney(Number(priceFilter.value));
}

function reconcileCart() {
  cart = cart
    .map((entry) => {
      const product = productIndex.get(entry.id);
      if (!product) return null;

      const qty = Math.max(1, Number(entry.qty) || 1);
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        qty,
      };
    })
    .filter(Boolean);

  persistCart();
}

function loadCart() {
  try {
    const raw = localStorage.getItem(cartKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCart() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
}

function categoryLabel(item) {
  if (item.itemType !== "bicycle") {
    if (item.itemType === "scooter") return "اسکوتر";
    if (item.itemType === "ride-on") return "موتور شارژی";
    if (item.itemType === "board") return "اسکیت";
    return "سایر";
  }

  if (item.category === "kids") return "دوچرخه کودک";
  if (item.category === "mountain") return "دوچرخه کوهستان";
  if (item.category === "folding") return "دوچرخه تاشو";
  return "دوچرخه بزرگسال";
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("fa-IR")} تومان`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
