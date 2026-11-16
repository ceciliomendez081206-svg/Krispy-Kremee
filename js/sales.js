pages.sales = () => {
  const saleDate = document.getElementById("saleDate")?.value || localDate();
  const activeSalesEvents = eventsOn(saleDate);
  const eventSummary = activeSalesEvents.length
    ? `Automatically linked to: ${activeSalesEvents.map((event) => escapeHTML(event.name)).join(", ")}`
    : "No active promotion or event on this date; this sale will be recorded as a normal day.";
  const range = periodRange(salesPeriod);
  const sales = salesForRange(range.start, range.end)
    .filter((sale) => salesFilter === "all" || sale.productId === salesFilter)
    .sort((left, right) => right.date.localeCompare(left.date));
  const group = new Map();
  sales.forEach((sale) => {
    const product = productById(sale.productId);
    if (!product) return;
    const current = group.get(product.id) || { name: product.name, quantity: 0, revenue: 0 };
    current.quantity += Number(sale.quantity);
    current.revenue += Number(sale.revenue || 0);
    group.set(product.id, current);
  });
  return `${header("Sales Management", "Record product sales and review daily, weekly, or monthly history", `${formatDate(range.start)} – ${formatDate(range.end)}`)}
    <div class="card"><h3>Record Daily Sale</h3>
      <form class="form-grid" onsubmit="recordSale(event)">
        <label>Product<select id="saleProduct" required>${productOptions("", "finished")}</select></label>
        <label>Quantity sold<input id="saleQuantity" type="number" min="1" step="1" required></label>
        <label>Sale date<input id="saleDate" type="date" value="${saleDate}" onchange="render()" required></label>
        <div class="wide note" aria-live="polite">${eventSummary}</div>
        <button class="btn" type="submit">Record Sale</button>
      </form>
    </div>
    <div class="toolbar">
      <label>View period<select onchange="setSalesPeriod(this.value)"><option value="daily" ${salesPeriod === "daily" ? "selected" : ""}>Daily</option><option value="weekly" ${salesPeriod === "weekly" ? "selected" : ""}>Weekly</option><option value="monthly" ${salesPeriod === "monthly" ? "selected" : ""}>Monthly</option></select></label>
      <label>Product<select onchange="setSalesFilter(this.value)"><option value="all">All products</option>${productOptions(salesFilter, "finished")}</select></label>
    </div>
    <div class="grid g3">
      <div class="card stat"><div class="lbl">Total Sales</div><div class="val green">${formatCurrency(totalSales(sales))}</div></div>
      <div class="card stat"><div class="lbl">Total Quantity Sold</div><div class="val">${formatNumber(totalUnits(sales))}</div></div>
      <div class="card stat"><div class="lbl">Product Records</div><div class="val">${sales.length}</div></div>
    </div>
    <div class="card"><h3>Quantity Sold by Product</h3><div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Quantity Sold</th><th>Sales (PHP)</th></tr></thead><tbody>
      ${[...group.values()].map((item) => `<tr><td>${escapeHTML(item.name)}</td><td>${item.quantity}</td><td>${formatCurrency(item.revenue)}</td></tr>`).join("") || '<tr><td colspan="3">No sales recorded in this period.</td></tr>'}
    </tbody></table></div></div>
    <div class="card"><h3>Sales History</h3><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Sales (PHP)</th><th>Day Type</th></tr></thead><tbody>
      ${sales.map((sale) => `<tr><td>${formatDate(sale.date)}</td><td>${escapeHTML(productById(sale.productId)?.name || "Removed item")}</td><td>${sale.quantity}</td><td>${formatCurrency(sale.revenue)}</td><td>${saleHasEvent(sale) ? "Event" : "Normal"}</td></tr>`).join("") || '<tr><td colspan="5">No sales recorded in this period.</td></tr>'}
    </tbody></table></div></div>`;
};

function periodRange(period) {
  const today = new Date(`${localDate()}T12:00:00`);
  if (period === "monthly") {
    return { start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, end: localDate() };
  }
  if (period === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { start: localDate(start), end: localDate() };
  }
  return { start: localDate(), end: localDate() };
}

function recordSale(event) {
  event.preventDefault();
  const productId = document.getElementById("saleProduct").value;
  const product = productById(productId);
  const quantity = Number(document.getElementById("saleQuantity").value);
  const date = document.getElementById("saleDate").value;
  if (date > localDate()) {
    toast("Sales cannot be recorded for a future date.");
    return;
  }
  if (quantity > stockTotals(productId).usable) {
    toast(`Only ${stockTotals(productId).usable} usable units are available.`);
    return;
  }
  consumeStock(productId, quantity);
  data.sales.push({
    id: crypto.randomUUID(),
    productId,
    quantity,
    date,
    eventIds: eventsOn(date).map((activeEvent) => activeEvent.id),
    revenue: quantity * product.price,
  });
  saveData();
  render();
  toast("Sale recorded and inventory updated.");
}

function consumeStock(productId, quantity) {
  let remaining = quantity;
  const batches = productBatches(productId)
    .filter((batch) => !batch.damaged && !batchIsExpired(batch))
    .sort((left, right) => batchExpiry(left).localeCompare(batchExpiry(right)));
  batches.forEach((batch) => {
    const used = Math.min(batchQuantity(batch), remaining);
    batch.quantity -= used;
    remaining -= used;
  });
}

function setSalesPeriod(period) {
  salesPeriod = period;
  render();
}

function setSalesFilter(productId) {
  salesFilter = productId;
  render();
}
