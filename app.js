const cartKey = "pedalpeak-cart-v1";

let bikes = [];
let accessories = [];
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
  priceValue.textContent = `$${priceFilter.value}`;
  renderCatalog();
});
searchInput.addEventListener("input", renderCatalog);

productGrid.addEventListener("click", handleAddButtonClick);
accessoryGrid.addEventListener("click", handleAddButtonClick);

checkoutForm.addEventListener("submit", submitCheckout);

year.textContent = String(new Date().getFullYear());
renderCart();
bootstrap();

async function bootstrap() {
  productGrid.innerHTML = '<p class="hidden-message">Loading bikes...</p>';
  accessoryGrid.innerHTML = '<p class="hidden-message">Loading products...</p>';

  try {
    const catalog = await loadCatalog();
    bikes = catalog.bikes;
    accessories = catalog.accessories;
    productIndex = new Map(catalog.all.map((item) => [item.id, item]));

    syncPriceRange();
    reconcileCart();
    renderCatalog();
    renderCart();
  } catch (error) {
    const message =
      "Could not load product data. Make sure product_data.json is available and run with a local server.";
    productGrid.innerHTML = `<p class="hidden-message">${message}</p>`;
    accessoryGrid.innerHTML = "";
    console.error(error);
  }
}

async function loadCatalog() {
  const response = await fetch("product_data.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load product_data.json (${response.status})`);
  }

  const rawData = await response.json();
  const entries = Object.entries(rawData).sort(
    ([fileA], [fileB]) => extractNumber(fileA) - extractNumber(fileB)
  );

  const all = entries.map(([fileName, title], index) => {
    const seed = extractNumber(fileName) || index + 1;
    const normalizedTitle = cleanTitle(title);
    const size = parseSize(normalizedTitle);
    const itemType = detectItemType(normalizedTitle);
    const bikeCategory = itemType === "bicycle" ? detectBikeCategory(normalizedTitle, size) : null;

    return {
      id: `p-${seed}`,
      sku: fileName,
      name: normalizedTitle,
      description: buildDescription(itemType, size),
      itemType,
      category: bikeCategory,
      tag: buildTag(itemType, bikeCategory, size),
      image: `downloaded_images/${fileName}`,
      price: estimatePrice(itemType, bikeCategory, size, seed),
      searchText: normalizedTitle.toLowerCase(),
    };
  });

  return {
    all,
    bikes: all.filter((item) => item.itemType === "bicycle"),
    accessories: all.filter((item) => item.itemType !== "bicycle"),
  };
}

function renderCatalog() {
  renderBikes();
  renderAccessories();
}

function renderBikes() {
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
    productGrid.innerHTML = '<p class="hidden-message">No bikes match the selected filters.</p>';
    return;
  }

  productGrid.innerHTML = filtered.map(productCard).join("");
}

function renderAccessories() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = accessories.filter((item) => !query || item.searchText.includes(query));

  if (filtered.length === 0) {
    accessoryGrid.innerHTML = '<p class="hidden-message">No matching non-bike items found.</p>';
    return;
  }

  accessoryGrid.innerHTML = filtered.map(productCard).join("");
}

function productCard(item) {
  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <span class="image-label">${escapeHtml(item.tag)}</span>
      </div>
      <div class="product-meta">
        <span>${escapeHtml(categoryLabel(item))}</span>
        <span>SKU: ${escapeHtml(item.sku.replace(".jpg", ""))}</span>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="card-foot">
        <span class="price">$${item.price.toLocaleString()}</span>
        <button class="add-btn" data-id="${item.id}">Add to Cart</button>
      </div>
    </article>
  `;
}

function handleAddButtonClick(event) {
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
    cartItems.innerHTML = '<p class="hidden-message">Your cart is empty.</p>';
    cartTotal.textContent = "$0";
    cartCount.textContent = "0";
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <article class="cart-item">
          <div class="cart-item-head">
            <strong>${escapeHtml(item.name)}</strong>
            <strong>$${(item.price * item.qty).toLocaleString()}</strong>
          </div>
          <small>$${item.price.toLocaleString()} each</small>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
            <button class="remove-btn" data-action="remove" data-id="${item.id}">Remove</button>
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
  cartTotal.textContent = `$${totalPrice.toLocaleString()}`;
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
    checkoutMessage.textContent = "Add at least one item to cart before submitting.";
    return;
  }

  const formData = new FormData(event.currentTarget);
  const name = formData.get("name");
  checkoutMessage.textContent = `Thanks ${name}, your order request was received. We'll contact you shortly.`;
  event.currentTarget.reset();
  clearCart();
  closeCart();
}

function syncPriceRange() {
  if (bikes.length === 0) {
    priceFilter.value = "0";
    priceValue.textContent = "$0";
    return;
  }

  const values = bikes.map((item) => item.price);
  const min = Math.max(100, Math.floor(Math.min(...values) / 50) * 50);
  const max = Math.ceil(Math.max(...values) / 50) * 50;

  priceFilter.min = String(min);
  priceFilter.max = String(max);
  priceFilter.step = "50";
  priceFilter.value = String(max);
  priceValue.textContent = `$${max}`;
}

function reconcileCart() {
  cart = cart
    .map((entry) => {
      const product = productIndex.get(entry.id);
      if (!product) return null;
      const parsedQty = Number(entry.qty);
      const qty = Number.isFinite(parsedQty) ? Math.max(1, parsedQty) : 1;
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

function detectItemType(title) {
  if (title.includes("دوچرخه")) return "bicycle";
  if (title.includes("اسکوتر")) return "scooter";
  if (title.includes("موتور شارژی") || title.includes("موتور")) return "ride-on";
  if (title.includes("اسکیت")) return "board";
  return "other";
}

function detectBikeCategory(title, size) {
  if (title.includes("تاشو")) return "folding";
  if (
    title.includes("کوهستان") ||
    title.includes("آفرود") ||
    title.includes("هیدرولیک") ||
    title.includes("دنده") ||
    (size && size >= 27)
  ) {
    return "mountain";
  }
  if ((size && size <= 20) || title.includes("دخترانه") || title.includes("پسرانه")) {
    return "kids";
  }
  return "adult";
}

function estimatePrice(itemType, bikeCategory, size, seed) {
  const variation = (seed % 7) * 35;

  if (itemType === "bicycle") {
    let base = 850;

    if (size && size <= 16) base = 290;
    else if (size && size <= 20) base = 460;
    else if (size && size <= 24) base = 720;
    else if (size && size <= 26) base = 980;
    else if (size && size > 26) base = 1320;

    if (bikeCategory === "mountain") base += 220;
    if (bikeCategory === "folding") base += 140;

    return roundPrice(base + variation);
  }

  if (itemType === "scooter") return roundPrice(210 + variation * 2);
  if (itemType === "ride-on") return roundPrice(540 + variation * 2);
  if (itemType === "board") return roundPrice(140 + variation);
  return roundPrice(110 + variation);
}

function buildTag(itemType, bikeCategory, size) {
  if (itemType === "bicycle") {
    if (bikeCategory === "kids") return size ? `Kids • ${size}"` : "Kids Bicycle";
    if (bikeCategory === "mountain") return size ? `Mountain • ${size}"` : "Mountain Bicycle";
    if (bikeCategory === "folding") return "Folding Bicycle";
    return size ? `Adult • ${size}"` : "Adult Bicycle";
  }

  if (itemType === "scooter") return "Scooter";
  if (itemType === "ride-on") return "Ride-on";
  if (itemType === "board") return "Skateboard";
  return "Other Product";
}

function buildDescription(itemType, size) {
  if (itemType === "bicycle") {
    return size
      ? `Catalog bicycle with wheel size ${size} inches from local inventory.`
      : "Catalog bicycle from local inventory.";
  }

  if (itemType === "scooter") return "Catalog scooter from local inventory.";
  if (itemType === "ride-on") return "Catalog ride-on motor product from local inventory.";
  if (itemType === "board") return "Catalog skateboard from local inventory.";
  return "Catalog non-bike product from local inventory.";
}

function categoryLabel(item) {
  if (item.itemType !== "bicycle") {
    if (item.itemType === "ride-on") return "Ride-on";
    return capitalize(item.itemType);
  }

  const labels = {
    kids: "Kids Bike",
    adult: "Adult Bike",
    mountain: "Mountain Bike",
    folding: "Folding Bike",
  };

  return labels[item.category] || "Bicycle";
}

function parseSize(text) {
  const sizeMatch = text.match(/سایز\s*([0-9]+(?:\.[0-9]+)?)/);
  if (sizeMatch) return Number(sizeMatch[1]);

  const fallbackMatch = text.match(/\b(12|16|20|24|26|27\.5|29)\b/);
  if (fallbackMatch) return Number(fallbackMatch[1]);

  return null;
}

function cleanTitle(value) {
  return String(value)
    .replace(/\(\s*پس کرایه\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumber(fileName) {
  const matched = String(fileName).match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

function roundPrice(value) {
  return Math.round(value / 10) * 10;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
