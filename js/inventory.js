function inventoryTable() {
  return `<h4>Finished Goods &amp; Operational Inventory</h4><div class="tbl-wrap"><table><thead><tr><th>Product / Supply</th><th>Usable</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${data.products.map((product) => {
      const stock = stockTotals(product.id);
      return `<tr><td>${escapeHTML(product.name)}</td><td>${stock.usable}</td><td>${stock.total}</td><td>${badge(stockStatus(product)[0])}</td></tr>`;
    }).join("")}
  </tbody></table></div><h4>Raw Materials</h4><div class="tbl-wrap"><table><thead><tr><th>Material</th><th>Usable</th><th>On Hand</th><th>Next Expiry</th></tr></thead><tbody>
    ${data.rawMaterials.map((material) => {
      const stock = rawMaterialTotals(material.id);
      return `<tr><td>${escapeHTML(material.name)}</td><td>${formatNumber(stock.usable)} ${escapeHTML(material.unit)}</td><td>${formatNumber(stock.total)} ${escapeHTML(material.unit)}</td><td>${formatDate(stock.nextExpiry)}</td></tr>`;
    }).join("") || '<tr><td colspan="4">No raw materials recorded.</td></tr>'}
  </tbody></table></div>`;
}

pages.inventory = () => `${header("Inventory Management", "Manage finished products, operational supplies, and expiring raw materials")}
  <div class="tabs inventory-tabs" aria-label="Inventory categories">
    <a class="tab" href="#finished-goods">Finished Goods</a>
    <a class="tab" href="#operational-inventory">Operational Inventory</a>
    <a class="tab" href="#raw-materials">Raw Material Inventory</a>
  </div>
  <section id="finished-goods" class="card inventory-section">
    <h3>Finished Goods</h3>
    <p class="note">Donuts and other sellable products are tracked as finished goods, not raw materials.</p>
    <div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Beginning</th><th>Received</th><th>Sold</th><th>Usable</th><th>On Hand</th><th>Expired</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${data.products.filter((product) => product.inventoryType !== "operational").map((product) => inventoryProductRow(product)).join("") || '<tr><td colspan="9">No finished goods recorded.</td></tr>'}
    </tbody></table></div>
  </section>
  <section id="operational-inventory" class="card inventory-section">
    <h3>Operational Inventory</h3>
    <p class="note">Cups, lids, packaging, and other items used in daily store operations.</p>
    <div class="card">
      <h3>${editProductId ? "Update Inventory Item" : "Add Operational Item or Finished Good"}</h3>
      <form class="form-grid" onsubmit="saveProduct(event)">
        <input id="productId" type="hidden" value="${escapeHTML(editProductId)}">
        <label>Item name<input id="productName" required maxlength="80"></label>
        <label>Inventory category<select id="productType"><option value="operational">Operational supply</option><option value="finished">Finished good</option></select></label>
        <label>Starting quantity<input id="productQuantity" type="number" min="0" step="1" value="0" ${editProductId ? "disabled" : ""} required></label>
        <label>Minimum stock<input id="productMinimum" type="number" min="0" step="1" value="10" required></label>
        <label>Unit price (PHP)<input id="productPrice" type="number" min="0" step="0.01" value="0" required></label>
        <label>Shelf life (hours; 0 = not perishable)<input id="productLife" type="number" min="0" step="1" value="12" required></label>
        <button class="btn" type="submit">${editProductId ? "Save Changes" : "Add Item"}</button>
        ${editProductId ? '<button class="btn-outline" type="button" onclick="cancelProductEdit()">Cancel</button>' : ""}
      </form>
    </div>
    <div class="card"><h3>Record Received Stock</h3>
      <form class="form-grid" onsubmit="recordStock(event)">
        <label>Item<select id="receivedProduct" required>${productOptions()}</select></label>
        <label>Quantity received<input id="receivedQuantity" type="number" min="1" step="1" required></label>
        <label>Prepared / received time<input id="receivedDate" type="datetime-local" value="${localDateTime()}" required></label>
        <button class="btn" type="submit">Add Stock</button>
      </form>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Item</th><th>Beginning</th><th>Received</th><th>Sold / Used</th><th>Usable</th><th>On Hand</th><th>Expired</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${data.products.filter((product) => product.inventoryType === "operational").map((product) => inventoryProductRow(product)).join("") || '<tr><td colspan="9">No operational supplies recorded.</td></tr>'}
    </tbody></table></div>
    ${note("Product shelf life is stored in hours and determines each batch expiry from its prepared / received time. Only unexpired, undamaged batches are counted as usable. Finished product sales consume the oldest usable stock first.")}
  </section>
  <section id="raw-materials" class="card inventory-section">
    <h3>Raw Material Inventory</h3>
    <p class="note">Ingredients and production supplies are tracked separately from finished goods. Batches approaching expiry are highlighted so older stock can be used first.</p>
    <div class="card"><h3>Add Raw Material</h3>
      <form class="form-grid" onsubmit="saveRawMaterial(event)">
        <label>Material name<input id="rawMaterialName" required maxlength="80"></label>
        <label>Unit (e.g. kg, L, pack)<input id="rawMaterialUnit" required maxlength="20"></label>
        <label>Starting quantity<input id="rawMaterialQuantity" type="number" min="0" step="0.01" value="0" required></label>
        <label>Minimum stock<input id="rawMaterialMinimum" type="number" min="0" step="0.01" value="1" required></label>
        <label>Expiry date<input id="rawMaterialExpiry" type="date" value="${addDays(localDate(), 30)}" required></label>
        <button class="btn" type="submit">Add Raw Material</button>
      </form>
    </div>
    ${data.rawMaterials.length ? `<div class="card"><h3>Receive Raw Materials</h3>
      <form class="form-grid" onsubmit="receiveRawMaterial(event)">
        <label>Material<select id="receivedRawMaterial" required>${rawMaterialOptions()}</select></label>
        <label>Quantity received<input id="receivedRawQuantity" type="number" min="0.01" step="0.01" required></label>
        <label>Received date<input id="receivedRawDate" type="date" value="${localDate()}" required></label>
        <label>Expiry date<input id="receivedRawExpiry" type="date" value="${addDays(localDate(), 30)}" required></label>
        <button class="btn" type="submit">Receive Material</button>
      </form>
    </div>` : ""}
    ${data.rawMaterials.length ? `<div class="card"><h3>Record Production Usage</h3>
      <form class="form-grid" onsubmit="consumeRawMaterial(event)">
        <label>Material<select id="usedRawMaterial" required>${rawMaterialOptions()}</select></label>
        <label>Quantity used<input id="usedRawQuantity" type="number" min="0.01" step="0.01" required></label>
        <label>Usage date<input id="usedRawDate" type="date" value="${localDate()}" required></label>
        <button class="btn" type="submit">Record Usage</button>
      </form>
    </div>` : ""}
    <div class="tbl-wrap"><table><thead><tr><th>Material</th><th>Unit</th><th>Usable</th><th>On Hand</th><th>Expired</th><th>Next Expiry</th><th>Status</th></tr></thead><tbody>
      ${data.rawMaterials.map((material) => {
        const stock = rawMaterialTotals(material.id);
        const status = stock.usable <= 0 ? "Out of Stock" : stock.usable <= Number(material.minStock || 0) ? "Low Stock" : "Available";
        const expiryStatus = stock.nextExpiry && stock.nextExpiry <= addDays(localDate(), 7) ? "Near Expiry" : "";
        return `<tr><td>${escapeHTML(material.name)}</td><td>${escapeHTML(material.unit)}</td><td>${formatNumber(stock.usable)}</td><td>${formatNumber(stock.total)}</td><td>${formatNumber(stock.expired)}</td><td>${stock.nextExpiry ? `${formatDate(stock.nextExpiry)} ${expiryStatus ? badge(expiryStatus) : ""}` : "—"}</td><td>${badge(status)}</td></tr>`;
      }).join("") || '<tr><td colspan="7">No raw materials recorded.</td></tr>'}
    </tbody></table></div>
    <div class="tbl-wrap"><table><thead><tr><th>Material</th><th>Batch quantity</th><th>Received</th><th>Expiry</th><th>Status</th></tr></thead><tbody>
      ${data.rawMaterialBatches.slice().sort((left, right) => left.expiryDate.localeCompare(right.expiryDate)).map((batch) => {
        const material = rawMaterialById(batch.rawMaterialId);
        if (!material) return "";
        const status = batch.expiryDate < localDate()
          ? "Expired"
          : batch.expiryDate <= addDays(localDate(), 7) ? "Near Expiry" : "Available";
        return `<tr><td>${escapeHTML(material.name)}</td><td>${formatNumber(batchQuantity(batch))} ${escapeHTML(material.unit)}</td><td>${formatDate(batch.receivedDate)}</td><td>${formatDate(batch.expiryDate)}</td><td>${badge(status)}</td></tr>`;
      }).join("") || '<tr><td colspan="5">No raw material batches recorded.</td></tr>'}
    </tbody></table></div>
    <div class="tbl-wrap"><table><thead><tr><th>Usage date</th><th>Raw material</th><th>Quantity used</th></tr></thead><tbody>
      ${data.rawMaterialUsage.slice().sort((left, right) => right.date.localeCompare(left.date)).map((usage) => {
        const material = rawMaterialById(usage.rawMaterialId);
        return material ? `<tr><td>${formatDate(usage.date)}</td><td>${escapeHTML(material.name)}</td><td>${formatNumber(usage.quantity)} ${escapeHTML(material.unit)}</td></tr>` : "";
      }).join("") || '<tr><td colspan="3">No production usage recorded.</td></tr>'}
    </tbody></table></div>
  </section>`;

function inventoryProductRow(product) {
  const stock = stockTotals(product.id);
  const received = receivedQuantity(product.id);
  const sold = data.sales.filter((sale) => sale.productId === product.id).reduce((sum, sale) => sum + Number(sale.quantity), 0);
  return `<tr><td>${escapeHTML(product.name)}</td><td>${Number(product.openingStock || 0)}</td><td>${received}</td><td>${sold}</td><td>${stock.usable}</td><td>${stock.total}</td><td>${stock.expired}</td><td>${badge(stockStatus(product)[0])}</td><td><button class="btn-outline" onclick="editProduct('${product.id}')">Edit</button></td></tr>`;
}

function productOptions(selected = "", inventoryType = "") {
  return data.products
    .filter((product) => !inventoryType || product.inventoryType === inventoryType)
    .map((product) => `<option value="${escapeHTML(product.id)}" ${product.id === selected ? "selected" : ""}>${escapeHTML(product.name)}</option>`)
    .join("");
}

function rawMaterialOptions(selected = "") {
  return data.rawMaterials.map((material) => (
    `<option value="${escapeHTML(material.id)}" ${material.id === selected ? "selected" : ""}>${escapeHTML(material.name)} (${escapeHTML(material.unit)})</option>`
  )).join("");
}

function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  const name = document.getElementById("productName").value.trim();
  if (data.products.some((product) => product.name.toLowerCase() === name.toLowerCase() && product.id !== id)) {
    toast("A product with that name already exists.");
    return;
  }
  const values = {
    name,
    inventoryType: document.getElementById("productType").value,
    minStock: Number(document.getElementById("productMinimum").value),
    price: Number(document.getElementById("productPrice").value),
    shelfLife: Number(document.getElementById("productLife").value),
  };
  if (id) {
    const product = productById(id);
    Object.assign(product, values);
    productBatches(id).forEach((batch) => {
      batch.expiresAt = expiryFor(batch.preparedAt, product);
      batch.expiryDate = batch.expiresAt.slice(0, 10);
    });
  } else {
    const productId = crypto.randomUUID();
    const quantity = Number(document.getElementById("productQuantity").value);
    data.products.push({ id: productId, ...values, openingStock: quantity });
    if (quantity) {
      const preparedAt = localDateTime();
      const expiresAt = expiryFor(preparedAt, values);
      data.batches.push({
        id: crypto.randomUUID(),
        productId,
        quantity,
        receivedQuantity: quantity,
        receivedDate: preparedAt.slice(0, 10),
        preparedAt,
        expiresAt,
        expiryDate: expiresAt.slice(0, 10),
        damaged: false,
        opening: true,
      });
    }
  }
  editProductId = "";
  saveData();
  render();
  toast("Inventory item saved.");
}

function editProduct(id) {
  const product = productById(id);
  if (!product) return;
  editProductId = id;
  render();
  document.getElementById("productName").value = product.name;
  document.getElementById("productType").value = product.inventoryType || "finished";
  document.getElementById("productMinimum").value = product.minStock;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productLife").value = product.shelfLife;
}

function cancelProductEdit() {
  editProductId = "";
  render();
}

function recordStock(event) {
  event.preventDefault();
  const product = productById(document.getElementById("receivedProduct").value);
  const quantity = Number(document.getElementById("receivedQuantity").value);
  const preparedAt = document.getElementById("receivedDate").value;
  if (!preparedAt || Number.isNaN(new Date(preparedAt).getTime())) {
    toast("Enter a valid preparation or received time.");
    return;
  }
  const expiresAt = expiryFor(preparedAt, product);
  data.batches.push({
    id: crypto.randomUUID(),
    productId: product.id,
    quantity,
    receivedDate: preparedAt.slice(0, 10),
    preparedAt,
    expiresAt,
    expiryDate: expiresAt.slice(0, 10),
    damaged: false,
  });
  saveData();
  render();
  toast("Received stock added to usable inventory.");
}

function saveRawMaterial(event) {
  event.preventDefault();
  const name = document.getElementById("rawMaterialName").value.trim();
  if (data.rawMaterials.some((material) => material.name.toLowerCase() === name.toLowerCase())) {
    toast("A raw material with that name already exists.");
    return;
  }
  const expiryDate = document.getElementById("rawMaterialExpiry").value;
  const quantity = Number(document.getElementById("rawMaterialQuantity").value);
  const material = {
    id: crypto.randomUUID(),
    name,
    unit: document.getElementById("rawMaterialUnit").value.trim(),
    minStock: Number(document.getElementById("rawMaterialMinimum").value),
  };
  data.rawMaterials.push(material);
  if (quantity > 0) {
    data.rawMaterialBatches.push({
      id: crypto.randomUUID(),
      rawMaterialId: material.id,
      quantity,
      receivedDate: localDate(),
      expiryDate,
    });
  }
  saveData();
  render();
  toast("Raw material inventory updated.");
}

function receiveRawMaterial(event) {
  event.preventDefault();
  const receivedDate = document.getElementById("receivedRawDate").value;
  const expiryDate = document.getElementById("receivedRawExpiry").value;
  if (expiryDate < receivedDate) {
    toast("Expiry date cannot be before the received date.");
    return;
  }
  data.rawMaterialBatches.push({
    id: crypto.randomUUID(),
    rawMaterialId: document.getElementById("receivedRawMaterial").value,
    quantity: Number(document.getElementById("receivedRawQuantity").value),
    receivedDate,
    expiryDate,
  });
  saveData();
  render();
  toast("Raw material batch received.");
}

function consumeRawMaterial(event) {
  event.preventDefault();
  const rawMaterialId = document.getElementById("usedRawMaterial").value;
  const quantity = Number(document.getElementById("usedRawQuantity").value);
  const date = document.getElementById("usedRawDate").value;
  if (date > localDate()) {
    toast("Production usage cannot be recorded for a future date.");
    return;
  }
  const stock = rawMaterialTotals(rawMaterialId);
  if (quantity > stock.usable) {
    toast(`Only ${formatNumber(stock.usable)} usable units are available.`);
    return;
  }
  let remaining = quantity;
  rawMaterialBatches(rawMaterialId)
    .filter((batch) => batch.expiryDate >= localDate())
    .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate))
    .forEach((batch) => {
      const used = Math.min(batchQuantity(batch), remaining);
      batch.quantity -= used;
      remaining -= used;
    });
  data.rawMaterialUsage.push({ id: crypto.randomUUID(), rawMaterialId, quantity, date });
  saveData();
  render();
  toast("Production usage recorded; earliest-expiring stock was used first.");
}
