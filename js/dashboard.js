pages.dashboard = () => {
  const todaySales = salesForRange(localDate(), localDate());
  const stock = data.products.map((product) => ({ product, ...stockTotals(product.id) }));
  const lowStock = stock.filter(({ product, usable }) => usable <= Number(product.minStock || 0));
  const lowRawMaterials = data.rawMaterials.filter((material) => (
    rawMaterialTotals(material.id).usable <= Number(material.minStock || 0)
  ));
  const nearExpiry = data.batches.filter((batch) => (
    batchQuantity(batch) > 0
      && !batch.damaged
      && batchExpiry(batch)
      && !batchIsExpired(batch)
      && new Date(batchExpiry(batch)).getTime() <= Date.now() + 48 * 60 * 60 * 1000
  )).length + data.rawMaterialBatches.filter((batch) => (
    batchQuantity(batch) > 0
      && batch.expiryDate >= localDate()
      && batch.expiryDate <= addDays(localDate(), 7)
  )).length;
  const delayed = data.deliveries.filter((delivery) => deliveryStatus(delivery) === "Delayed");
  const recommendationDate = addDays(localDate(), 1);
  const recommendations = sellableProducts().reduce((sum, product) => {
    const base = forecastFor(product.id, recommendationDate).base;
    return sum + Math.max(0, base + adjustmentFor(product, recommendationDate) - stockTotals(product.id).usable);
  }, 0);
  const upcoming = data.events
    .filter((event) => eventStatus(event) !== "Ended")
    .sort((left, right) => (left.startDate || left.date).localeCompare(right.startDate || right.date))[0];
  const salesTrend = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(localDate(), index - 6);
    return {
      label: new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      value: totalSales(salesForRange(date, date)),
    };
  });
  const salesMixByProduct = new Map();
  salesForRange(addDays(localDate(), -6), localDate()).forEach((sale) => {
    const product = productById(sale.productId);
    if (!product) return;
    salesMixByProduct.set(product.id, {
      label: product.name,
      value: (salesMixByProduct.get(product.id)?.value || 0) + Number(sale.quantity || 0),
    });
  });
  const salesMixColors = ["var(--green)", "var(--red)", "var(--amber)", "var(--blue)", "var(--purple)"];
  const salesMix = [...salesMixByProduct.values()]
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({ ...item, color: salesMixColors[index % salesMixColors.length] }));
  const salesMixTotal = salesMix.reduce((sum, item) => sum + item.value, 0);
  return `${header("Dashboard", "Today's store overview", formatDate(localDate()))}
    <div class="grid g4">
      <div class="card stat"><div class="lbl">Total Sales Today</div><div class="val green">${formatCurrency(totalSales(todaySales))}</div><div class="sm">${todaySales.length} product sale records</div></div>
      <div class="card stat"><div class="lbl">Doughnuts / Items Sold</div><div class="val">${formatNumber(totalUnits(todaySales))}</div><div class="sm">units recorded today</div></div>
      <div class="card stat"><div class="lbl">Usable Inventory</div><div class="val">${formatNumber(stock.reduce((sum, item) => sum + item.usable, 0))}</div><div class="sm">units available to sell or use</div></div>
      <div class="card stat"><div class="lbl">Low / Out of Stock</div><div class="val ${lowStock.length + lowRawMaterials.length ? "red" : "green"}">${lowStock.length + lowRawMaterials.length}</div><div class="sm">${[...lowStock.map(({ product }) => product.name), ...lowRawMaterials.map((material) => material.name)].map(escapeHTML).join(", ") || "All items stocked"}</div></div>
    </div>
    <div class="grid g4">
      <div class="card stat"><div class="lbl">Near Expiry / Removal</div><div class="val amber">${nearExpiry}</div><div class="sm">raw material batches within 7 days; finished batches within 2 days</div></div>
      <div class="card stat"><div class="lbl">Next Promotion / Event</div><div class="val" style="font-size:20px">${upcoming ? escapeHTML(upcoming.name) : "None scheduled"}</div><div class="sm">${upcoming ? `${formatDate(upcoming.startDate || upcoming.date)} · ${eventStatus(upcoming)}` : "Add an event in the calendar"}</div></div>
      <div class="card stat"><div class="lbl">Delayed Deliveries</div><div class="val ${delayed.length ? "red" : "green"}">${delayed.length}</div><div class="sm">pending deliveries past expected date</div></div>
      <div class="card stat"><div class="lbl">Recommended to Prepare / Order</div><div class="val">${formatNumber(recommendations)}</div><div class="sm">units for tomorrow, net of usable stock</div></div>
    </div>
    <div class="grid g2">
      ${barChart("Sales revenue · last 7 days", salesTrend, formatCurrency)}
      ${donutChart("Sales Mix · Last 7 Days", salesMix, formatNumber(salesMixTotal), "units sold", "No sales recorded in the last 7 days.")}
    </div>
    <div class="grid g2">
      <div class="card"><h3>Current Inventory</h3>${inventoryTable()}</div>
      <div class="card"><h3>Quick Actions</h3>
        <div class="action-list">
          <a class="btn" href="sales-history.html">Record a Sale</a>
          <a class="btn-outline" href="order-recommendation.html">Review Quantity Recommendations</a>
          <a class="btn-outline" href="freshness-monitoring.html">Record Waste / Removal</a>
        </div>
      </div>
    </div>`;
};
