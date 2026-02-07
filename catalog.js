(() => {
  const CATALOG_KEY = "pedalpeak-catalog-v2";

  async function loadCatalog() {
    const local = loadLocalCatalog();
    if (local.length > 0) {
      return sortCatalog(local);
    }

    const defaultCatalog = await loadDefaultCatalog();
    return sortCatalog(defaultCatalog);
  }

  function saveCatalog(items) {
    const normalized = sortCatalog(
      items.map((item, index) => normalizeProduct(item, index))
    );
    localStorage.setItem(CATALOG_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetCatalog() {
    localStorage.removeItem(CATALOG_KEY);
  }

  function createProductTemplate() {
    return normalizeProduct(
      {
        id: `p-${Date.now()}`,
        sku: `custom-${Date.now()}`,
        name: "",
        description: "",
        itemType: "bicycle",
        category: "adult",
        image: "",
        price: 0,
      },
      0
    );
  }

  function loadLocalCatalog() {
    try {
      const raw = localStorage.getItem(CATALOG_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, index) => normalizeProduct(item, index));
    } catch {
      return [];
    }
  }

  async function loadDefaultCatalog() {
    try {
      const response = await fetch("product_data.json", { cache: "no-store" });
      if (!response.ok) return [];

      const rawData = await response.json();
      const entries = Object.entries(rawData).sort(
        ([fileA], [fileB]) => extractNumber(fileA) - extractNumber(fileB)
      );

      return entries.map(([fileName, title], index) => {
        const seed = extractNumber(fileName) || index + 1;
        const name = cleanTitle(title);
        const itemType = detectItemType(name);
        const size = parseSize(name);
        const category = itemType === "bicycle" ? detectBikeCategory(name, size) : "other";

        return normalizeProduct(
          {
            id: `p-${seed}`,
            sku: fileName,
            name,
            description: buildDescription(itemType, size),
            itemType,
            category,
            image: `downloaded_images/${fileName}`,
            price: estimatePrice(itemType, category, size, seed),
          },
          index
        );
      });
    } catch {
      return [];
    }
  }

  function normalizeProduct(item, index) {
    const source = item || {};
    const seed = extractNumber(source.id || source.sku || `${index + 1}`) || index + 1;

    const name = cleanTitle(source.name || source.title || `محصول ${seed}`);
    const itemType = normalizeItemType(source.itemType || detectItemType(name));
    const size = parseSize(name);

    let category = source.category;
    if (!category) {
      category = itemType === "bicycle" ? detectBikeCategory(name, size) : "other";
    }
    category = normalizeCategory(category, itemType);

    let price = Number(source.price);
    if (!Number.isFinite(price) || price < 0) {
      price = estimatePrice(itemType, category, size, seed);
    }

    const normalized = {
      id: String(source.id || `p-${seed}`),
      sku: String(source.sku || `${seed}.jpg`),
      name,
      description: cleanText(source.description || buildDescription(itemType, size)),
      itemType,
      category,
      image: String(source.image || "").trim(),
      price: roundPrice(price),
    };

    normalized.tag = buildTag(normalized.itemType, normalized.category);
    normalized.searchText = `${normalized.name} ${normalized.description} ${normalized.tag}`.toLowerCase();
    return normalized;
  }

  function sortCatalog(items) {
    return [...items].sort((a, b) => {
      if (a.itemType === "bicycle" && b.itemType !== "bicycle") return -1;
      if (a.itemType !== "bicycle" && b.itemType === "bicycle") return 1;
      return extractNumber(a.id) - extractNumber(b.id);
    });
  }

  function normalizeItemType(value) {
    const map = {
      bicycle: "bicycle",
      scooter: "scooter",
      "ride-on": "ride-on",
      board: "board",
      other: "other",
    };

    return map[value] || "other";
  }

  function normalizeCategory(value, itemType) {
    if (itemType !== "bicycle") return "other";

    const allowed = ["kids", "adult", "mountain", "folding"];
    return allowed.includes(value) ? value : "adult";
  }

  function detectItemType(title) {
    if (title.includes("دوچرخه")) return "bicycle";
    if (title.includes("اسکوتر")) return "scooter";
    if (title.includes("موتور")) return "ride-on";
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

  function buildDescription(itemType, size) {
    if (itemType === "bicycle") {
      return size
        ? `دوچرخه سایز ${size} اینچ از محصولات فروشگاه.`
        : "دوچرخه از محصولات فروشگاه.";
    }

    if (itemType === "scooter") return "اسکوتر از محصولات فروشگاه.";
    if (itemType === "ride-on") return "موتور شارژی از محصولات فروشگاه.";
    if (itemType === "board") return "اسکیت برد از محصولات فروشگاه.";
    return "محصول متفرقه فروشگاه.";
  }

  function buildTag(itemType, category) {
    if (itemType === "bicycle") {
      if (category === "kids") return "دوچرخه کودک";
      if (category === "mountain") return "دوچرخه کوهستان";
      if (category === "folding") return "دوچرخه تاشو";
      return "دوچرخه";
    }

    if (itemType === "scooter") return "اسکوتر";
    if (itemType === "ride-on") return "موتور شارژی";
    if (itemType === "board") return "اسکیت";
    return "سایر";
  }

  function estimatePrice(itemType, category, size, seed) {
    const variation = (seed % 7) * 120000;

    if (itemType === "bicycle") {
      let base = 9800000;

      if (size && size <= 16) base = 4200000;
      else if (size && size <= 20) base = 5900000;
      else if (size && size <= 24) base = 7700000;
      else if (size && size <= 26) base = 10200000;
      else if (size && size > 26) base = 12800000;

      if (category === "mountain") base += 1800000;
      if (category === "folding") base += 1100000;

      return roundPrice(base + variation);
    }

    if (itemType === "scooter") return roundPrice(6400000 + variation);
    if (itemType === "ride-on") return roundPrice(10900000 + variation);
    if (itemType === "board") return roundPrice(2900000 + variation);
    return roundPrice(3500000 + variation);
  }

  function parseSize(text) {
    const matched = String(text).match(/سایز\s*([0-9]+(?:\.[0-9]+)?)/);
    if (matched) return Number(matched[1]);

    const fallback = String(text).match(/\b(12|16|20|24|26|27\.5|29)\b/);
    return fallback ? Number(fallback[1]) : null;
  }

  function cleanTitle(value) {
    return cleanText(value)
      .replace(/\(\s*پس کرایه\s*\)/g, "")
      .replace(/\(\s*دو کمک\s*\)/g, "")
      .trim();
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractNumber(value) {
    const matched = String(value).match(/\d+/);
    return matched ? Number(matched[0]) : 0;
  }

  function roundPrice(value) {
    return Math.round(Number(value || 0) / 10000) * 10000;
  }

  window.CatalogStore = {
    loadCatalog,
    saveCatalog,
    resetCatalog,
    createProductTemplate,
    normalizeProduct,
    buildTag,
  };
})();
