const STORAGE_KEY = "smartStallData";
const ACCOUNTS_KEY = "smartStallAccounts";
const SESSION_KEY = "ss_user";
const THEME_KEY = "smartStallTheme";
const THEME_DEFAULT_MIGRATION_KEY = "smartStallThemeDefaultLightV1";
const productsSeed = [
  { id: "glazed", name: "Original Glazed", price: 45, minStock: 20, shelfLife: 12, stock: 24, inventoryType: "finished" },
  { id: "donut-b", name: "Chocolate Iced Glazed", price: 45, minStock: 20, shelfLife: 12, stock: 60, inventoryType: "finished" },
  { id: "donut-c", name: "Chocolate Iced Glazed with Sprinkles", price: 45, minStock: 20, shelfLife: 12, stock: 55, inventoryType: "finished" },
  { id: "donut-d", name: "Maple Iced Glazed", price: 45, minStock: 20, shelfLife: 12, stock: 18, inventoryType: "finished" },
  { id: "glazed-chocolate-cake", name: "Glazed Chocolate Cake", price: 45, minStock: 20, shelfLife: 12, stock: 0, inventoryType: "finished" },
  { id: "boston-kreme", name: "Chocolate Iced Custard Filling (Boston Kreme)", price: 45, minStock: 20, shelfLife: 12, stock: 0, inventoryType: "finished" },
  { id: "coffee", name: "Signature Brewed & Americano", price: 80, minStock: 15, shelfLife: 24, stock: 30, inventoryType: "finished" },
  { id: "sea-salt-kreme-latte", name: "Sea Salt Kreme Latte", price: 80, minStock: 15, shelfLife: 24, stock: 0, inventoryType: "finished" },
  { id: "sea-salt-matcha-kreme-latte", name: "Sea Salt Matcha Kreme Latte", price: 80, minStock: 15, shelfLife: 24, stock: 0, inventoryType: "finished" },
  { id: "choco-hazelnut-latte", name: "Choco Hazelnut Latte", price: 80, minStock: 15, shelfLife: 24, stock: 0, inventoryType: "finished" },
  { id: "signature-cold-brew", name: "Signature Cold Brew", price: 80, minStock: 15, shelfLife: 24, stock: 0, inventoryType: "finished" },
  { id: "cups", name: "Cups", price: 0, minStock: 20, shelfLife: 0, stock: 35, inventoryType: "operational" },
  { id: "lids", name: "Lids", price: 0, minStock: 20, shelfLife: 0, stock: 70, inventoryType: "operational" },
  { id: "napkins", name: "Napkins", price: 0, minStock: 20, shelfLife: 0, stock: 40, inventoryType: "operational" },
  { id: "straws", name: "Straws", price: 0, minStock: 20, shelfLife: 0, stock: 90, inventoryType: "operational" },
];
const rawMaterialsSeed = [
  { name: "Flour", unit: "kg", minStock: 10, stock: 25, shelfLifeDays: 90 },
  { name: "Sugar", unit: "kg", minStock: 5, stock: 15, shelfLifeDays: 180 },
  { name: "Yeast", unit: "pack", minStock: 5, stock: 12, shelfLifeDays: 30 },
];
const seedSalesPerDay = [45, 50, 55, 48, 52, 50, 51];
const initialUsers = [
  { username: "admin", password: "admin123", role: "Admin", active: true },
  { username: "staff", password: "staff123", role: "Staff", active: true },
];

const pages = {};
let reportType = "sales";
let reportPeriod = "daily";
let salesPeriod = "daily";
let salesFilter = "all";
let calendarMonth = localDate().slice(0, 7);
let editProductId = "";

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addDays(date, days) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return localDate(result);
}

function addHours(dateTime, hours) {
  const result = new Date(dateTime);
  result.setTime(result.getTime() + Number(hours) * 60 * 60 * 1000);
  return localDateTime(result);
}

function expiryFor(preparedAt, product) {
  return Number(product.shelfLife) > 0 ? addHours(preparedAt, product.shelfLife) : "";
}

function makeInitialData() {
  const preparedAt = localDateTime();
  const products = productsSeed.map(({ stock, ...product }) => ({ ...product, openingStock: stock }));
  const batches = productsSeed.map((product) => ({
    id: crypto.randomUUID(),
    productId: product.id,
    quantity: product.stock,
    receivedDate: preparedAt.slice(0, 10),
    preparedAt,
    expiresAt: expiryFor(preparedAt, product),
    expiryDate: expiryFor(preparedAt, product).slice(0, 10),
    damaged: false,
    opening: true,
  }));
  const rawMaterials = rawMaterialsSeed.map(({ stock, shelfLifeDays, ...material }) => ({
    id: crypto.randomUUID(),
    ...material,
    shelfLifeDays,
  }));
  const rawMaterialBatches = rawMaterialsSeed.map((material, index) => ({
    id: crypto.randomUUID(),
    rawMaterialId: rawMaterials[index].id,
    quantity: material.stock,
    receivedDate: localDate(),
    expiryDate: addDays(localDate(), material.shelfLifeDays),
  }));
  const sales = [];
  productsSeed.forEach((product) => {
    const salesIndex = ["glazed", "donut-b", "donut-c", "donut-d", "coffee"].indexOf(product.id);
    for (let day = 7; day >= 1; day -= 1) {
      const quantity = salesIndex >= 0
        ? Math.max(1, seedSalesPerDay[7 - day] - salesIndex * 5)
        : 0;
      if (quantity) {
        sales.push({
          id: crypto.randomUUID(),
          productId: product.id,
          quantity,
          date: addDays(localDate(), -day),
          eventIds: [],
          revenue: quantity * product.price,
        });
      }
    }
  });
  return {
    products,
    batches,
    rawMaterials,
    rawMaterialBatches,
    rawMaterialUsage: [],
    sales,
    events: [
      {
        id: crypto.randomUUID(),
        name: "Free donut with coffee",
        date: addDays(localDate(), 1),
        startDate: addDays(localDate(), 1),
        endDate: addDays(localDate(), 3),
        type: "Promotion",
        adjustment: 10,
        details: "Demo promotion",
      },
      {
        id: crypto.randomUUID(),
        name: "School opening",
        date: addDays(localDate(), 2),
        startDate: addDays(localDate(), 2),
        endDate: addDays(localDate(), 2),
        type: "School opening",
        adjustment: 5,
        details: "Demo event",
      },
    ],
    deliveries: [],
    waste: [],
    orders: [],
  };
}

function getData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const data = makeInitialData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }
  const data = JSON.parse(stored);
  data.rawMaterials ||= [];
  data.rawMaterialBatches ||= [];
  data.rawMaterialUsage ||= [];
  data.batches ||= [];
  let migratedData = false;
  const productNameMigrations = {
    "donut-b": ["Donut B", "Chocolate Iced Glazed"],
    "donut-c": ["Donut C", "Chocolate Iced Glazed with Sprinkles"],
    "donut-d": ["Donut D", "Maple Iced Glazed"],
    coffee: ["Coffee", "Signature Brewed & Americano"],
  };
  const addedProductIds = new Set([
    "glazed-chocolate-cake",
    "boston-kreme",
    "sea-salt-kreme-latte",
    "sea-salt-matcha-kreme-latte",
    "choco-hazelnut-latte",
    "signature-cold-brew",
  ]);
  data.products.forEach((product) => {
    const nameMigration = productNameMigrations[product.id];
    if (nameMigration && product.name === nameMigration[0]) {
      product.name = nameMigration[1];
      migratedData = true;
    }
    if (!product.inventoryType) {
      product.inventoryType = ["cups", "lids", "napkins", "straws"].includes(product.id)
        ? "operational"
        : "finished";
      migratedData = true;
    }
    if (!Number.isFinite(Number(product.shelfLife))) {
      product.shelfLife = 0;
      migratedData = true;
    }
  });
  productsSeed.forEach(({ stock, ...product }, index) => {
    if (!addedProductIds.has(product.id) || data.products.some((entry) => entry.id === product.id)) return;
    const nextSeedProduct = productsSeed
      .slice(index + 1)
      .find((seedProduct) => data.products.some((entry) => entry.id === seedProduct.id));
    const insertionIndex = nextSeedProduct
      ? data.products.findIndex((entry) => entry.id === nextSeedProduct.id)
      : data.products.length;
    data.products.splice(insertionIndex, 0, { ...product, openingStock: stock });
    migratedData = true;
  });
  data.batches.forEach((batch) => {
    const product = data.products.find((entry) => entry.id === batch.productId);
    if (!batch.preparedAt) {
      batch.preparedAt = `${batch.receivedDate || localDate()}T12:00`;
      migratedData = true;
    }
    if (batch.expiresAt === undefined) {
      batch.expiresAt = product
        ? expiryFor(batch.preparedAt, product)
        : batch.expiryDate ? `${batch.expiryDate}T23:59` : "";
      migratedData = true;
    }
    if (batch.expiresAt) batch.expiryDate = batch.expiresAt.slice(0, 10);
  });
  data.events.forEach((event) => {
    event.startDate ||= event.date;
    event.endDate ||= event.date;
  });
  if (migratedData) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getAccounts() {
  const stored = localStorage.getItem(ACCOUNTS_KEY);
  if (stored) return JSON.parse(stored);
  const accounts = initialUsers.map((user) => ({ ...user }));
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function applyTheme() {
  if (localStorage.getItem(THEME_DEFAULT_MIGRATION_KEY) !== "complete") {
    localStorage.setItem(THEME_KEY, "light");
    localStorage.setItem(THEME_DEFAULT_MIGRATION_KEY, "complete");
  }
  document.body.dataset.theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

let data = getData();
applyTheme();

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatCurrency(value) {
  return `PHP ${formatNumber(value)}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function batchExpiry(batch) {
  return batch.expiresAt || (batch.expiryDate ? `${batch.expiryDate}T23:59` : "");
}

function batchIsExpired(batch, now = new Date()) {
  const expiry = batchExpiry(batch);
  return Boolean(expiry && new Date(expiry).getTime() <= now.getTime());
}

function timeUntilExpiry(value, now = new Date()) {
  if (!value) return "No expiry";
  const difference = new Date(value).getTime() - now.getTime();
  const totalMinutes = Math.ceil(Math.abs(difference) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const duration = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes || (!days && !hours) ? `${minutes}m` : "",
  ].filter(Boolean).join(" ");
  return difference <= 0 ? `Expired ${duration} ago` : `Expires in ${duration}`;
}

function currentUser() {
  const username = sessionStorage.getItem(SESSION_KEY);
  return getAccounts().find((user) => user.username === username) || null;
}

function login() {
  const username = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value;
  const user = getAccounts().find((entry) => (
    entry.username.toLowerCase() === username.toLowerCase()
      && entry.password === password
  ));
  if (!user) {
    document.getElementById("loginErr").textContent = "Username or password is incorrect.";
    return;
  }
  sessionStorage.setItem(SESSION_KEY, user.username);
  location.href = "dashboard.html";
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.href = "index.html";
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function header(title, subtitle, right = "") {
  const user = currentUser();
  return `
    <div class="topbar">
      <div><h1>${escapeHTML(title)}</h1><div class="sub">${escapeHTML(subtitle)}</div></div>
      <div class="who">${escapeHTML(user?.username || "Guest")} · ${escapeHTML(user?.role || "")}
        ${right ? `<div class="date">${escapeHTML(right)}</div>` : ""}
      </div>
    </div>`;
}

function note(message) {
  return `<div class="note">${escapeHTML(message)}</div>`;
}

function productById(id) {
  return data.products.find((product) => product.id === id);
}

function sellableProducts() {
  return data.products.filter((product) => product.inventoryType !== "operational");
}

function rawMaterialById(id) {
  return data.rawMaterials.find((material) => material.id === id);
}

function rawMaterialBatches(materialId) {
  return data.rawMaterialBatches.filter((batch) => batch.rawMaterialId === materialId);
}

function rawMaterialTotals(materialId) {
  const batches = rawMaterialBatches(materialId);
  const total = batches.reduce((sum, batch) => sum + batchQuantity(batch), 0);
  const usable = batches.reduce((sum, batch) => (
    sum + (batch.expiryDate >= localDate() ? batchQuantity(batch) : 0)
  ), 0);
  const expired = total - usable;
  const nextExpiry = batches
    .filter((batch) => batchQuantity(batch) && batch.expiryDate >= localDate())
    .map((batch) => batch.expiryDate)
    .sort()[0] || "";
  return { total, usable, expired, nextExpiry };
}

function batchQuantity(batch) {
  return Math.max(0, Number(batch.quantity) || 0);
}

function productBatches(productId) {
  return data.batches.filter((batch) => batch.productId === productId);
}

function stockTotals(productId) {
  const batches = productBatches(productId);
  const total = batches.reduce((sum, batch) => sum + batchQuantity(batch), 0);
  const usable = batches.reduce((sum, batch) => {
    const expired = batchIsExpired(batch);
    return sum + (!batch.damaged && !expired ? batchQuantity(batch) : 0);
  }, 0);
  const expired = batches.reduce((sum, batch) => (
    sum + (batchIsExpired(batch) ? batchQuantity(batch) : 0)
  ), 0);
  const damaged = batches.reduce((sum, batch) => (
    sum + (batch.damaged ? batchQuantity(batch) : 0)
  ), 0);
  return { total, usable, expired, damaged };
}

function receivedQuantity(productId) {
  const deliveryReceipts = data.deliveries
    .filter((delivery) => delivery.productId === productId && delivery.status === "Received")
    .reduce((sum, delivery) => sum + Number(delivery.receivedQuantity || 0), 0);
  const stockReceipts = data.batches
    .filter((batch) => batch.productId === productId && !batch.opening && !batch.deliveryId)
    .reduce((sum, batch) => sum + Number(batch.receivedQuantity ?? batch.quantity ?? 0), 0);
  return deliveryReceipts + stockReceipts;
}

function stockStatus(product) {
  const usable = stockTotals(product.id).usable;
  if (usable <= 0) return ["Out of Stock", "b-red"];
  if (usable <= Number(product.minStock || 0)) return ["Low Stock", "b-amber"];
  return ["Available", "b-green"];
}

function salesForRange(start, end) {
  return data.sales.filter((sale) => sale.date >= start && sale.date <= end);
}

function totalSales(sales) {
  return sales.reduce((sum, sale) => sum + Number(sale.revenue || 0), 0);
}

function totalUnits(sales) {
  return sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
}

function barChart(title, items, formatter = formatNumber) {
  const maximum = Math.max(1, ...items.flatMap((item) => [
    Number(item.value) || 0,
    Number(item.secondaryValue) || 0,
  ]));
  const hasSecondary = items.some((item) => item.secondaryValue !== undefined);
  return `<section class="card chart-card" aria-label="${escapeHTML(title)}">
    <h3>${escapeHTML(title)}</h3>
    ${items.length ? `${hasSecondary ? `<div class="chart-legend"><span><i class="chart-key"></i>Expected</span><span><i class="chart-key secondary"></i>Received</span></div>` : ""}
      <div class="bar-chart" role="list">${items.map((item) => {
        const value = Number(item.value) || 0;
        const secondaryValue = Number(item.secondaryValue) || 0;
        const width = Math.max(0, value) / maximum * 100;
        const secondaryWidth = Math.max(0, secondaryValue) / maximum * 100;
        return `<div class="bar-chart-row" role="listitem">
          <span class="bar-chart-label" title="${escapeHTML(item.label)}">${escapeHTML(item.label)}</span>
          <div class="bar-chart-bars">
            <div class="bar-track" role="img" aria-label="${escapeHTML(item.label)}: ${escapeHTML(formatter(value))}">
              <span class="bar-fill" style="width:${width}%"></span>
            </div>
            ${hasSecondary ? `<div class="bar-track" role="img" aria-label="${escapeHTML(item.label)} received: ${escapeHTML(formatter(secondaryValue))}">
              <span class="bar-fill secondary" style="width:${secondaryWidth}%"></span>
            </div>` : ""}
          </div>
          <span class="bar-chart-value">${escapeHTML(formatter(value))}${hasSecondary ? `<small>${escapeHTML(formatter(secondaryValue))}</small>` : ""}</span>
        </div>`;
      }).join("")}</div>` : '<p class="chart-empty">No data available for this period.</p>'}
  </section>`;
}

function forecastFor(productId, targetDate = localDate(), period = 7) {
  const normalSales = data.sales
    .filter((sale) => sale.productId === productId && sale.date < targetDate && !saleHasEvent(sale))
    .sort((left, right) => right.date.localeCompare(left.date));
  const byDay = new Map();
  normalSales.forEach((sale) => {
    byDay.set(sale.date, (byDay.get(sale.date) || 0) + Number(sale.quantity));
  });
  const days = [...byDay.values()].slice(0, period);
  const average = days.length
    ? days.reduce((sum, quantity) => sum + quantity, 0) / days.length
    : 0;
  return { average, base: Math.ceil(average), days };
}

function saleHasEvent(sale) {
  return Boolean(sale.eventId || (Array.isArray(sale.eventIds) && sale.eventIds.length));
}

function eventsOn(date) {
  return data.events.filter((event) => (
    (event.startDate || event.date) <= date && (event.endDate || event.date) >= date
  ));
}

function eventStatus(event, date = localDate()) {
  const startDate = event.startDate || event.date;
  const endDate = event.endDate || event.date;
  if (date < startDate) return "Scheduled";
  if (date > endDate) return "Ended";
  return "Active";
}

function isPeakSeasonEvent(event) {
  return ["Holiday", "Special occasion", "School opening", "Peak season"].includes(event.type);
}

function adjustmentFor(product, date) {
  return eventsOn(date).reduce((sum, event) => (
    sum + Math.ceil(forecastFor(product.id, date, 7).base * Number(event.adjustment || 0) / 100)
  ), 0);
}

function peakSeasonAdjustmentFor(product, date) {
  return eventsOn(date).filter(isPeakSeasonEvent).reduce((sum, event) => (
    sum + Math.ceil(forecastFor(product.id, date, 7).base * Number(event.adjustment || 0) / 100)
  ), 0);
}
function badge(status) {
  const classes = {
    Available: "b-green",
    Active: "b-green",
    Scheduled: "b-blue",
    Ended: "b-gray",
    "Low Stock": "b-amber",
    "Out of Stock": "b-red",
    Pending: "b-blue",
    Received: "b-green",
    Delayed: "b-red",
    Fresh: "b-green",
    "Near Expiry": "b-amber",
    Expired: "b-red",
    Damaged: "b-gray",
  };
  return `<span class="badge ${classes[status] || "b-gray"}">${escapeHTML(status)}</span>`;
}

function render() {
  const user = currentUser();
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    location.replace("index.html");
    return;
  }
  const content = document.getElementById("content");
  if (!content || !pages[PAGE]) return;
  document.querySelectorAll(".sidebar [data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === PAGE);
  });
  content.innerHTML = pages[PAGE]();
}
