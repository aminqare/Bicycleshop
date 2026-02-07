let products = [];
const pendingImages = new Map();

const searchInput = document.getElementById("searchInput");
const resetCatalogButton = document.getElementById("resetCatalog");
const productList = document.getElementById("productList");
const newProductForm = document.getElementById("newProductForm");
const stats = document.getElementById("stats");
const statusMessage = document.getElementById("statusMessage");

searchInput.addEventListener("input", renderProducts);
resetCatalogButton.addEventListener("click", handleResetCatalog);
newProductForm.addEventListener("submit", handleAddProduct);

productList.addEventListener("click", handleListClick);
productList.addEventListener("change", handleListChange);

bootstrap();

async function bootstrap() {
  products = await window.CatalogStore.loadCatalog();
  renderProducts();
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = products.filter((item) => {
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.tag.toLowerCase().includes(query)
    );
  });

  const bikesCount = products.filter((item) => item.itemType === "bicycle").length;
  stats.textContent = `کل محصولات: ${formatNumber(products.length)} | دوچرخه: ${formatNumber(
    bikesCount
  )} | سایر: ${formatNumber(products.length - bikesCount)}`;

  if (filtered.length === 0) {
    productList.innerHTML = '<p class="empty-message">محصولی با این جستجو پیدا نشد.</p>';
    return;
  }

  productList.innerHTML = filtered.map(productTemplate).join("");
}

function productTemplate(item) {
  return `
    <article class="product-item" data-id="${escapeHtml(item.id)}">
      <div class="product-top">
        <img class="thumb" src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.name)}" onerror="this.style.opacity='0.35'" />
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="product-meta">کد: ${escapeHtml(item.sku)} | برچسب: ${escapeHtml(item.tag)}</p>
        </div>
        <div class="product-actions">
          <button class="save-btn" data-action="save">ذخیره</button>
          <button class="delete-btn" data-action="delete">حذف</button>
        </div>
      </div>

      <div class="product-edit-grid">
        <label>
          عنوان
          <input class="field-name" type="text" value="${escapeHtml(item.name)}" />
        </label>
        <label>
          قیمت (تومان)
          <input class="field-price" type="number" min="0" step="10000" value="${item.price}" />
        </label>
        <label>
          نوع
          <select class="field-type">
            ${typeOptions(item.itemType)}
          </select>
        </label>
        <label>
          دسته‌بندی
          <select class="field-category" ${item.itemType === "bicycle" ? "" : "disabled"}>
            ${categoryOptions(item.category)}
          </select>
        </label>
        <label>
          توضیح
          <input class="field-description" type="text" value="${escapeHtml(item.description)}" />
        </label>
        <label>
          آدرس عکس
          <input class="field-image" type="text" placeholder="downloaded_images/1.jpg" value="${
            item.image.startsWith("data:") ? "" : escapeHtml(item.image)
          }" />
        </label>
        <label>
          آپلود عکس جدید
          <input class="field-file" type="file" accept="image/*" />
        </label>
        <label>
          وضعیت عکس
          <input class="field-image-state" type="text" readonly value="${
            item.image.startsWith("data:") ? "عکس از نوع آپلودی ذخیره شده" : "عکس از مسیر/آدرس"
          }" />
        </label>
      </div>
    </article>
  `;
}

async function handleAddProduct(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    setStatus("عنوان محصول اجباری است.", true);
    return;
  }

  const file = formData.get("imageFile");
  let uploadedImage = "";

  if (file instanceof File && file.size > 0) {
    uploadedImage = await fileToDataUrl(file);
  }

  const template = {
    ...window.CatalogStore.createProductTemplate(),
    id: `p-${Date.now()}`,
    sku: `custom-${Date.now()}`,
    name,
    description: String(formData.get("description") || "").trim(),
    itemType: String(formData.get("itemType") || "bicycle"),
    category: String(formData.get("category") || "adult"),
    image: uploadedImage || String(formData.get("image") || "").trim(),
    price: Number(formData.get("price") || 0),
  };

  products = window.CatalogStore.saveCatalog([...products, template]);
  event.currentTarget.reset();
  renderProducts();
  setStatus("محصول جدید با موفقیت اضافه شد.");
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest(".product-item");
  if (!card) return;

  const id = card.dataset.id;
  if (button.dataset.action === "delete") {
    deleteProduct(id);
    return;
  }

  if (button.dataset.action === "save") {
    saveProduct(card, id);
  }
}

async function handleListChange(event) {
  const input = event.target;
  const card = input.closest(".product-item");
  if (!card) return;

  const id = card.dataset.id;

  if (input.classList.contains("field-type")) {
    const categorySelect = card.querySelector(".field-category");
    if (input.value === "bicycle") {
      categorySelect.disabled = false;
      if (categorySelect.value === "other") categorySelect.value = "adult";
    } else {
      categorySelect.value = "other";
      categorySelect.disabled = true;
    }
    return;
  }

  if (input.classList.contains("field-file")) {
    const file = input.files && input.files[0];
    if (!file) return;

    const imageData = await fileToDataUrl(file);
    pendingImages.set(id, imageData);

    const thumb = card.querySelector(".thumb");
    thumb.src = imageData;

    const state = card.querySelector(".field-image-state");
    state.value = "عکس جدید آپلود شد (ذخیره کنید)";
  }
}

function saveProduct(card, id) {
  const index = products.findIndex((item) => item.id === id);
  if (index === -1) return;

  const current = products[index];

  const name = String(card.querySelector(".field-name").value || "").trim();
  const price = Number(card.querySelector(".field-price").value || 0);
  const itemType = String(card.querySelector(".field-type").value || "other");
  const categorySelect = card.querySelector(".field-category");
  const category = categorySelect.disabled ? "other" : String(categorySelect.value || "adult");
  const description = String(card.querySelector(".field-description").value || "").trim();
  const imageInput = String(card.querySelector(".field-image").value || "").trim();

  if (!name) {
    setStatus("عنوان محصول نمی‌تواند خالی باشد.", true);
    return;
  }

  const uploaded = pendingImages.get(id);
  const finalImage = uploaded || imageInput || current.image;

  const updated = {
    ...current,
    name,
    price,
    itemType,
    category,
    description,
    image: finalImage,
  };

  products[index] = window.CatalogStore.normalizeProduct(updated, index);
  products = window.CatalogStore.saveCatalog(products);

  pendingImages.delete(id);
  renderProducts();
  setStatus("تغییرات محصول ذخیره شد.");
}

function deleteProduct(id) {
  const target = products.find((item) => item.id === id);
  if (!target) return;

  const ok = window.confirm(`محصول «${target.name}» حذف شود؟`);
  if (!ok) return;

  products = products.filter((item) => item.id !== id);
  products = window.CatalogStore.saveCatalog(products);
  pendingImages.delete(id);

  renderProducts();
  setStatus("محصول حذف شد.");
}

async function handleResetCatalog() {
  const ok = window.confirm("همه تغییرات ادمین حذف و داده اولیه بارگذاری شود؟");
  if (!ok) return;

  window.CatalogStore.resetCatalog();
  products = await window.CatalogStore.loadCatalog();
  pendingImages.clear();

  renderProducts();
  setStatus("داده‌ها به حالت اولیه برگشت.");
}

function typeOptions(selected) {
  const options = [
    ["bicycle", "دوچرخه"],
    ["scooter", "اسکوتر"],
    ["ride-on", "موتور شارژی"],
    ["board", "اسکیت"],
    ["other", "سایر"],
  ];

  return options
    .map(([value, label]) => {
      const selectedAttr = value === selected ? "selected" : "";
      return `<option value="${value}" ${selectedAttr}>${label}</option>`;
    })
    .join("");
}

function categoryOptions(selected) {
  const options = [
    ["adult", "بزرگسال"],
    ["kids", "کودک"],
    ["mountain", "کوهستان"],
    ["folding", "تاشو"],
    ["other", "سایر"],
  ];

  return options
    .map(([value, label]) => {
      const selectedAttr = value === selected ? "selected" : "";
      return `<option value="${value}" ${selectedAttr}>${label}</option>`;
    })
    .join("");
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b53535" : "#2d8f4e";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read-file-failed"));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
