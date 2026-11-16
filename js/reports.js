pages.reports = () => {
  const rows = reportRows(reportType);
  return `${header("Reports", "Review and print sales, inventory, forecasts, orders, waste, and delivery performance")}
    <div class="toolbar">
      <label>Report type<select onchange="setReportType(this.value)">
        ${[["sales", "Sales"], ["inventory", "Inventory"], ["forecast", "Forecast"], ["orders", "Recommended quantities"], ["waste", "Waste"], ["delivery", "Delivery performance"]].map(([value, label]) => `<option value="${value}" ${reportType === value ? "selected" : ""}>${label}</option>`).join("")}
      </select></label>
      ${reportType === "sales" ? `<label>Sales period<select onchange="setReportPeriod(this.value)"><option value="daily" ${reportPeriod === "daily" ? "selected" : ""}>Daily</option><option value="weekly" ${reportPeriod === "weekly" ? "selected" : ""}>Weekly</option><option value="monthly" ${reportPeriod === "monthly" ? "selected" : ""}>Monthly</option></select></label>` : ""}
      <button class="btn-outline" onclick="printReport()">Print</button>
      <button class="btn" onclick="downloadReport()">Download CSV</button>
    </div>
    ${reportSummary()}
    <div id="reportContent" class="tbl-wrap"><table id="reportTable"><thead><tr>${rows.headers.map((headerText) => `<th>${escapeHTML(headerText)}</th>`).join("")}</tr></thead><tbody>
      ${rows.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${rows.headers.length}">No ${escapeHTML(reportType)} data available.</td></tr>`}
    </tbody></table></div>`;
};

function donutChart(title, segments, centerValue, centerLabel, emptyMessage) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let current = 0;
  const gradient = total
    ? segments.map((segment) => {
      const start = current / total * 100;
      current += segment.value;
      return `${segment.color} ${start}% ${current / total * 100}%`;
    }).join(", ")
    : "var(--border) 0% 100%";
  const chartDescription = segments.map((segment) => `${segment.label}: ${formatNumber(segment.value)}`).join(", ");
  return `<section class="card report-panel">
    <h3>${escapeHTML(title)}</h3>
    ${total ? `<div class="donut-layout">
      <div class="donut" style="--donut-gradient:conic-gradient(${gradient})" role="img" aria-label="${escapeHTML(chartDescription)}">
        <div class="donut-hole"><strong>${escapeHTML(centerValue)}</strong><span>${escapeHTML(centerLabel)}</span></div>
      </div>
      <ul class="donut-legend">${segments.map((segment) => `<li>
        <i style="--legend-color:${segment.color}"></i><span>${escapeHTML(segment.label)}</span>
        <b>${formatNumber(segment.value)}</b><small>${Math.round(segment.value / total * 100)}%</small>
      </li>`).join("")}</ul>
    </div>` : `<p class="chart-empty">${escapeHTML(emptyMessage)}</p>`}
  </section>`;
}

function salesWasteChart(start, end, period, periodLabel) {
  const buckets = [];
  if (period === "monthly") {
    for (let bucketStart = start; bucketStart <= end; bucketStart = addDays(bucketStart, 7)) {
      const bucketEnd = bucketStart > addDays(end, -6) ? end : addDays(bucketStart, 6);
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        label: `${new Date(`${bucketStart}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}–${new Date(`${bucketEnd}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
      });
    }
  } else {
    for (let date = start; date <= end; date = addDays(date, 1)) {
      buckets.push({
        start: date,
        end: date,
        label: period === "daily"
          ? "Today"
          : new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", { weekday: "short" }),
      });
    }
  }
  const values = buckets.map((bucket) => {
    const sales = totalUnits(salesForRange(bucket.start, bucket.end));
    const waste = data.waste
      .filter((entry) => entry.date >= bucket.start && entry.date <= bucket.end)
      .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    return { ...bucket, sales, waste };
  });
  const maximum = Math.max(1, ...values.flatMap(({ sales, waste }) => [sales, waste]));
  return `<section class="card report-panel sales-chart-panel">
    <h3>Sales Summary <span>(Units Sold vs. Wasted · ${escapeHTML(periodLabel)})</span></h3>
    <div class="sales-chart-legend"><span><i></i>Units sold</span><span class="waste-key"><i></i>Units wasted</span></div>
    <div class="column-chart" style="--column-count:${values.length}" role="list">${values.map(({ label, sales, waste }) => {
      return `<div class="column-chart-day" role="listitem" aria-label="${label}: ${formatNumber(sales)} units sold, ${formatNumber(waste)} units wasted">
        <div class="column-pair">
          <span class="column-bar sales-column" style="height:${sales / maximum * 100}%" title="${formatNumber(sales)} units sold"></span>
          <span class="column-bar waste-column" style="height:${waste / maximum * 100}%" title="${formatNumber(waste)} units wasted"></span>
        </div><span class="column-label">${escapeHTML(label)}</span>
      </div>`;
    }).join("")}</div>
  </section>`;
}

function reportSummary() {
  const selectedPeriod = reportType === "sales" ? reportPeriod : "weekly";
  const range = reportType === "sales"
    ? periodRange(reportPeriod)
    : { start: addDays(localDate(), -6), end: localDate() };
  const periodLabel = reportType !== "sales" || selectedPeriod === "weekly"
    ? "Last 7 Days"
    : selectedPeriod === "monthly" ? "Month to Date" : "Selected Day";
  const periodDescription = periodLabel.toLowerCase();
  const periodSales = salesForRange(range.start, range.end);
  const soldUnits = totalUnits(periodSales);
  const wastedUnits = data.waste
    .filter((entry) => entry.date >= range.start && entry.date <= range.end)
    .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const flowSegments = [
    { label: "Units sold", value: soldUnits, color: "var(--green)" },
    { label: "Units wasted", value: wastedUnits, color: "var(--red)" },
  ];

  const deliveries = data.deliveries;
  const received = deliveries.filter((delivery) => delivery.status === "Received");
  const verifiedReceived = received.filter((delivery) => delivery.actualDate);
  const onTime = verifiedReceived.filter((delivery) => delivery.actualDate <= delivery.expectedDate).length;
  const lateReceived = verifiedReceived.length - onTime;
  const pending = deliveries.filter((delivery) => delivery.status !== "Received").length;
  const delayedPending = deliveries.filter((delivery) => (
    delivery.status !== "Received" && deliveryStatus(delivery) === "Delayed"
  )).length;
  const unverifiedReceived = received.length - verifiedReceived.length;
  const resolvedDeliveries = onTime + lateReceived + delayedPending;
  const onTimeRate = resolvedDeliveries ? Math.round(onTime / resolvedDeliveries * 100) : 0;
  const deliverySegments = [
    { label: "On time", value: onTime, color: "var(--green)" },
    { label: "Delayed", value: lateReceived + delayedPending, color: "var(--red)" },
    { label: "Pending", value: pending - delayedPending, color: "var(--amber)" },
    { label: "Timing not recorded", value: unverifiedReceived, color: "var(--purple)" },
  ];

  const productSales = new Map();
  data.products.forEach((product) => productSales.set(product.id, 0));
  periodSales.forEach((sale) => {
    if (!productSales.has(sale.productId)) return;
    productSales.set(sale.productId, (productSales.get(sale.productId) || 0) + Number(sale.quantity || 0));
  });
  const rankedProducts = [...productSales.entries()]
    .map(([id, quantity]) => ({ name: productById(id).name, quantity }))
    .sort((left, right) => right.quantity - left.quantity);
  const topProducts = rankedProducts.filter((product) => product.quantity > 0).slice(0, 3);
  const leastProducts = rankedProducts.slice(-3).reverse();
  const lowStock = data.products.filter((product) => stockTotals(product.id).usable <= Number(product.minStock || 0));
  const wastedByProduct = new Map();
  data.waste.filter((entry) => entry.date >= range.start && entry.date <= range.end).forEach((entry) => {
    const label = productById(entry.productId)?.name || "Removed item";
    wastedByProduct.set(label, (wastedByProduct.get(label) || 0) + Number(entry.quantity || 0));
  });
  const mostWaste = [...wastedByProduct.entries()].sort((left, right) => right[1] - left[1])[0];
  const insights = [
    topProducts.length
      ? `${topProducts[0].name} is the top seller for the ${periodDescription} (${formatNumber(topProducts[0].quantity)} units).`
      : `No sales were recorded for the ${periodDescription}.`,
    lowStock.length
      ? `${lowStock.length} item${lowStock.length === 1 ? " is" : "s are"} at or below minimum stock: ${lowStock.map((product) => product.name).join(", ")}.`
      : "All products are above their minimum stock levels.",
    mostWaste
      ? `${mostWaste[0]} has the most recorded waste for the ${periodDescription} (${formatNumber(mostWaste[1])} units).`
      : `No waste was recorded for the ${periodDescription}.`,
    resolvedDeliveries
      ? `On-time rate is ${onTimeRate}% (${onTime} of ${resolvedDeliveries} resolved deliveries; overdue pending deliveries count as delayed).`
      : received.length
        ? "Received deliveries are missing actual dates, so their on-time performance cannot be verified."
      : "No delivery outcomes can be measured yet.",
  ];
  return `<div class="report-chart-grid">
      ${donutChart(`Sales & Waste · ${periodLabel}`, flowSegments, formatNumber(flowSegments.reduce((sum, segment) => sum + segment.value, 0)), "units recorded", `No sales or waste recorded for the ${periodDescription}.`)}
      ${salesWasteChart(range.start, range.end, selectedPeriod, periodLabel)}
      ${donutChart("Delivery Performance · All Records", deliverySegments, resolvedDeliveries ? `${onTimeRate}%` : "—", "resolved on time", "No delivery data available.")}
    </div>
    <div class="report-detail-grid">
      <section class="card report-panel selling-panel">
        <h3>Top / Least Selling Items <small>${periodLabel}</small></h3>
        <div class="selling-columns">
          <div><h4>Top selling</h4>${topProducts.length ? `<ol>${topProducts.map((item) => `<li>${escapeHTML(item.name)} <span>${formatNumber(item.quantity)}</span></li>`).join("")}</ol>` : '<p class="chart-empty">No sales recorded.</p>'}</div>
          <div><h4>Least selling</h4>${leastProducts.length ? `<ol>${leastProducts.map((item) => `<li>${escapeHTML(item.name)} <span>${formatNumber(item.quantity)}</span></li>`).join("")}</ol>` : '<p class="chart-empty">No sales recorded.</p>'}</div>
        </div>
      </section>
      <section class="card report-panel insights-panel">
        <h3>Key Insights</h3>
        <ul>${insights.map((insight) => `<li>${escapeHTML(insight)}</li>`).join("")}</ul>
      </section>
    </div>`;
}

function reportRows(type) {
  if (type === "sales") {
    const range = periodRange(reportPeriod);
    const byDate = new Map();
    salesForRange(range.start, range.end).forEach((sale) => {
      const current = byDate.get(sale.date) || { quantity: 0, revenue: 0 };
      current.quantity += Number(sale.quantity);
      current.revenue += Number(sale.revenue || 0);
      byDate.set(sale.date, current);
    });
    return {
      headers: ["Date", "Total quantity sold", "Total sales (PHP)"],
      rows: [...byDate.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, totals]) => [formatDate(date), totals.quantity, totals.revenue]),
    };
  }
  if (type === "inventory") {
    return {
      headers: ["Category", "Item", "Unit", "Beginning stock", "Received", "Sold / used", "Usable stock", "Total stock", "Expiry / status"],
      rows: [
        ...data.products.map((product) => {
        const stock = stockTotals(product.id);
          return [
            product.inventoryType === "operational" ? "Operational inventory" : "Finished goods",
            product.name,
            "unit",
            product.openingStock || 0,
            receivedQuantity(product.id),
            data.sales.filter((sale) => sale.productId === product.id).reduce((sum, sale) => sum + sale.quantity, 0),
            stock.usable,
            stock.total,
            stockStatus(product)[0],
          ];
        }),
        ...data.rawMaterials.map((material) => {
          const stock = rawMaterialTotals(material.id);
          const used = data.rawMaterialUsage
            .filter((usage) => usage.rawMaterialId === material.id)
            .reduce((sum, usage) => sum + Number(usage.quantity || 0), 0);
          return [
            "Raw material",
            material.name,
            material.unit,
            0,
            stock.total + used,
            used,
            stock.usable,
            stock.total,
            stock.nextExpiry ? `${formatDate(stock.nextExpiry)}${stock.expired ? ` · ${stock.expired} expired` : ""}` : `${stock.expired} expired`,
          ];
        }),
      ],
    };
  }
  if (type === "forecast") {
    return {
      headers: ["Product", "Forecast method", "Average sales", "Base quantity"],
      rows: sellableProducts().map((product) => {
        const forecast = forecastFor(product.id, addDays(localDate(), 1), 7);
        return [product.name, "7-day simple moving average", forecast.average.toFixed(1), forecast.base];
      }),
    };
  }
  if (type === "orders") {
    return {
      headers: ["Date", "Product", "Accepted quantity"],
      rows: data.orders.map((order) => [formatDate(order.date), productById(order.productId)?.name || "Unknown item", order.quantity]),
    };
  }
  if (type === "waste") {
    return {
      headers: ["Date", "Product", "Quantity", "Reason"],
      rows: data.waste.map((entry) => [formatDate(entry.date), productById(entry.productId)?.name || "Unknown item", entry.quantity, entry.reason]),
    };
  }
  if (type === "delivery") {
    return {
      headers: ["Supplier", "Product", "Expected date", "Actual date", "Expected quantity", "Received quantity", "Status"],
      rows: data.deliveries.map((delivery) => [delivery.supplier, productById(delivery.productId)?.name || "Unknown item", formatDate(delivery.expectedDate), formatDate(delivery.actualDate), delivery.expectedQuantity, delivery.receivedQuantity || 0, deliveryStatus(delivery)]),
    };
  }
  throw new Error(`Unsupported report type: ${type}`);
}

function setReportType(type) {
  reportType = type;
  render();
}

function setReportPeriod(period) {
  reportPeriod = period;
  render();
}

function downloadReport() {
  const report = reportRows(reportType);
  const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [report.headers, ...report.rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.href = url;
  link.download = `smart-stall-${reportType}-${localDate()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printReport() {
  window.print();
}
