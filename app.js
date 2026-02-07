const bikes = [
  {
    id: "b1",
    name: "Falcon Road 700",
    category: "road",
    price: 1450,
    tag: "Fast / Lightweight",
    description: "Carbon fork, 20-speed drivetrain, and responsive geometry.",
    color: "linear-gradient(135deg, #0f9d58, #2cc16f)",
  },
  {
    id: "b2",
    name: "TrailCore X29",
    category: "mountain",
    price: 1890,
    tag: "Trail / Full Control",
    description: "Hydraulic brakes and lockout suspension for rough routes.",
    color: "linear-gradient(135deg, #0d5c89, #1f8ac7)",
  },
  {
    id: "b3",
    name: "CityFlow Hybrid",
    category: "city",
    price: 820,
    tag: "Urban / Comfort",
    description: "Comfort saddle, upright posture, and puncture-resistant tires.",
    color: "linear-gradient(135deg, #495057, #6c757d)",
  },
  {
    id: "b4",
    name: "MiniRider 24",
    category: "kids",
    price: 410,
    tag: "Kids / Safe Ride",
    description: "Light aluminum frame with confidence-friendly handling.",
    color: "linear-gradient(135deg, #ee8f00, #f5b744)",
  },
  {
    id: "b5",
    name: "Altitude Pro 27.5",
    category: "mountain",
    price: 2360,
    tag: "Adventure / Premium",
    description: "Tubeless-ready wheels and dropper post for steep descents.",
    color: "linear-gradient(135deg, #7b1fa2, #a53fd8)",
  },
  {
    id: "b6",
    name: "Velocity Aero 900",
    category: "road",
    price: 2760,
    tag: "Race / Endurance",
    description: "Race-tuned frame and deep-section wheels for high speed.",
    color: "linear-gradient(135deg, #c62828, #f05454)",
  },
  {
    id: "b7",
    name: "MetroFold Lite",
    category: "city",
    price: 690,
    tag: "Compact / Commuter",
    description: "Quick-fold frame ideal for apartment and office storage.",
    color: "linear-gradient(135deg, #1f2a44, #4a5b88)",
  },
  {
    id: "b8",
    name: "Rookie Trail 20",
    category: "kids",
    price: 330,
    tag: "Beginner / Durable",
    description: "Stable wheelbase and chain guard for safe daily rides.",
    color: "linear-gradient(135deg, #00695c, #00a087)",
  },
];

const accessories = [
  {
    id: "a1",
    name: "Aero Helmet",
    category: "gear",
    price: 120,
    tag: "Safety",
    description: "Lightweight helmet with multi-point ventilation.",
    color: "linear-gradient(135deg, #ff6f00, #ff9f40)",
  },
  {
    id: "a2",
    name: "Lumen Pro Light Set",
    category: "gear",
    price: 65,
    tag: "Visibility",
    description: "USB rechargeable front and rear smart lights.",
    color: "linear-gradient(135deg, #2e7d32, #43a047)",
  },
  {
    id: "a3",
    name: "Floor Pump XL",
    category: "tool",
    price: 48,
    tag: "Workshop",
    description: "High-pressure steel floor pump with pressure gauge.",
    color: "linear-gradient(135deg, #37474f, #607d8b)",
  },
  {
    id: "a4",
    name: "Commuter Rack Bag",
    category: "bag",
    price: 74,
    tag: "Storage",
    description: "Water-resistant rear rack bag with side pockets.",
    color: "linear-gradient(135deg, #6d4c41, #8d6e63)",
  },
];

const cartKey = "pedalpeak-cart-v1";
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

categoryFilter.addEventListener("change", renderBikes);
priceFilter.addEventListener("input", () => {
  priceValue.textContent = `$${priceFilter.value}`;
  renderBikes();
});
searchInput.addEventListener("input", renderBikes);

checkoutForm.addEventListener("submit", submitCheckout);

year.textContent = String(new Date().getFullYear());
priceValue.textContent = `$${priceFilter.value}`;

renderBikes();
renderAccessories();
renderCart();

function renderBikes() {
  const category = categoryFilter.value;
  const maxPrice = Number(priceFilter.value);
  const query = searchInput.value.trim().toLowerCase();

  const filtered = bikes.filter((item) => {
    const byCategory = category === "all" || item.category === category;
    const byPrice = item.price <= maxPrice;
    const bySearch =
      item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    return byCategory && byPrice && bySearch;
  });

  if (filtered.length === 0) {
    productGrid.innerHTML = '<p class="hidden-message">No bikes match the selected filters.</p>';
    return;
  }

  productGrid.innerHTML = filtered.map(productCard).join("");
  bindAddButtons();
}

function renderAccessories() {
  accessoryGrid.innerHTML = accessories.map(productCard).join("");
  bindAddButtons();
}

function productCard(item) {
  return `
    <article class="product-card">
      <div class="product-image" style="background:${item.color}">${escapeHtml(item.tag)}</div>
      <div class="product-meta">
        <span>${capitalize(item.category)}</span>
        <span>SKU: ${escapeHtml(item.id.toUpperCase())}</span>
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

function bindAddButtons() {
  document.querySelectorAll(".add-btn").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.id));
  });
}

function addToCart(id) {
  const all = [...bikes, ...accessories];
  const product = all.find((item) => item.id === id);
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
