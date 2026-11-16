pages.forecasting = () => {
  const targetDate = document.getElementById("forecastDate")?.value || addDays(localDate(), 1);
  const windowSize = Number(document.getElementById("forecastWindow")?.value || 7);
  const upcomingEvents = eventsOn(targetDate);
  return `${header("Demand Forecasting", "Moving-average estimate from historical normal-day sales", formatDate(targetDate))}
    <div class="card"><h3>Forecast Settings</h3>
      <div class="form-grid">
        <label>Forecast date<input id="forecastDate" type="date" value="${targetDate}" onchange="render()"></label>
        <label>Moving average window<select id="forecastWindow" onchange="render()"><option value="3" ${windowSize === 3 ? "selected" : ""}>Previous 3 sales days</option><option value="7" ${windowSize === 7 ? "selected" : ""}>Previous 7 sales days</option></select></label>
      </div>
      <p class="note">Method: arithmetic moving average of the most recent recorded sales days before the forecast date. Sales linked to a calendar event are excluded from the base.</p>
    </div>
    ${upcomingEvents.length ? `<div class="card pale"><h3>Demand drivers on ${formatDate(targetDate)}</h3>${upcomingEvents.map((event) => `<p>${escapeHTML(event.name)}: ${event.adjustment >= 0 ? "+" : ""}${event.adjustment}% · ${escapeHTML(event.details || "")}</p>`).join("")}</div>` : ""}
    <div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Historical Days</th><th>Sales Quantities</th><th>Moving Average</th><th>Base Quantity</th><th>Method</th></tr></thead><tbody>
      ${sellableProducts().map((product) => {
        const forecast = forecastFor(product.id, targetDate, windowSize);
        return `<tr><td>${escapeHTML(product.name)}</td><td>${forecast.days.length}</td><td>${forecast.days.map(formatNumber).join(", ") || "No history"}</td><td>${forecast.average.toFixed(1)}</td><td><b>${forecast.base}</b></td><td>Simple moving average (${windowSize} days)</td></tr>`;
      }).join("")}
    </tbody></table></div>
    ${note("Forecasts are estimates based on recorded sample history. Record actual daily sales to improve future forecasts.")}`;
};

pages.order = () => {
  const targetDate = document.getElementById("recommendationDate")?.value || addDays(localDate(), 1);
  const events = eventsOn(targetDate);
  const peakEvents = events.filter(isPeakSeasonEvent);
  return `${header("Daily Quantity Recommendation", "Plan production from sales history, active promotions, and seasonal demand", formatDate(targetDate))}
    <div class="card recommendation-settings">
      <div class="toolbar"><label>Production date<input id="recommendationDate" type="date" value="${targetDate}" onchange="render()"></label><button class="btn" type="button" onclick="window.print()">Print Daily Recommendation</button></div>
      <p class="note">Daily production is estimated from the selected date's recent normal-day sales. Forecasts increase automatically for promotions active on that date and peak-season events.</p>
    </div>
    <div class="card pale"><h3>${peakEvents.length ? "Peak Season Demand Adjustment" : "Sales Drivers Considered"}</h3>${events.length ? events.map((event) => `<p><b>${escapeHTML(event.name)}</b> (${escapeHTML(event.type)}): ${event.adjustment >= 0 ? "+" : ""}${event.adjustment}% demand · ${formatDate(event.startDate || event.date)}${(event.endDate || event.date) !== (event.startDate || event.date) ? ` – ${formatDate(event.endDate)}` : ""} · ${escapeHTML(event.details || "")}</p>`).join("") : "<p>No promotions or peak-season events are active. Historical base forecast is used.</p>"}${peakEvents.length ? `<p><b>${peakEvents.length} peak-season driver${peakEvents.length === 1 ? "" : "s"} included</b> for holidays, special occasions, or other configured peak periods.</p>` : ""}</div>
    <div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Base Quantity</th><th>Other Driver</th><th>Peak Season</th><th>Adjusted Demand</th><th>Usable Stock</th><th>Recommended Production</th><th class="screen-only">Review / Adjust</th></tr></thead><tbody>
      ${sellableProducts().map((product) => {
        const base = forecastFor(product.id, targetDate, 7).base;
        const adjustment = adjustmentFor(product, targetDate);
        const peakAdjustment = peakSeasonAdjustmentFor(product, targetDate);
        const adjusted = Math.max(0, base + adjustment);
        const usable = stockTotals(product.id).usable;
        const recommended = Math.max(0, adjusted - usable);
        const otherAdjustment = adjustment - peakAdjustment;
        return `<tr><td>${escapeHTML(product.name)}</td><td>${base}</td><td>${otherAdjustment >= 0 ? "+" : ""}${otherAdjustment}</td><td>${peakAdjustment >= 0 ? "+" : ""}${peakAdjustment}</td><td>${adjusted}</td><td>${usable}</td><td><input class="quantity-input" type="number" min="0" step="1" id="recommend-${product.id}" value="${recommended}" aria-label="Recommended production quantity for ${escapeHTML(product.name)}"></td><td class="screen-only"><button class="btn-outline" onclick="acceptRecommendation('${product.id}')">Accept</button></td></tr>`;
      }).join("")}
    </tbody></table></div>
    <div class="toolbar screen-only"><button class="btn" onclick="acceptAllRecommendations()">Accept All Recommendations</button></div>
    ${note("Formula: recommended production = max(0, historical demand + active event and peak-season adjustments − usable finished stock). Adjust quantities before accepting; accepting creates pending delivery records.")}`;
};

function acceptRecommendation(productId) {
  const product = productById(productId);
  const targetDate = document.getElementById("recommendationDate").value;
  const quantity = Number(document.getElementById(`recommend-${productId}`).value);
  if (!Number.isInteger(quantity) || quantity < 0) {
    toast("Enter a non-negative whole-number quantity.");
    return;
  }
  data.orders.push({ id: crypto.randomUUID(), productId, quantity, date: targetDate, createdAt: localDate() });
  if (quantity > 0) {
    data.deliveries.push({
      id: crypto.randomUUID(),
      supplier: "Commissary",
      productId,
      expectedQuantity: quantity,
      receivedQuantity: 0,
      expectedDate: targetDate,
      actualDate: "",
      status: "Pending",
    });
  }
  saveData();
  toast(`Recommendation accepted for ${product.name}.`);
}

function acceptAllRecommendations() {
  const targetDate = document.getElementById("recommendationDate").value;
  const products = sellableProducts();
  const quantities = products.map((product) => ({
    product,
    quantity: Number(document.getElementById(`recommend-${product.id}`).value),
  }));
  if (quantities.some(({ quantity }) => !Number.isInteger(quantity) || quantity < 0)) {
    toast("Enter non-negative whole-number quantities before accepting.");
    return;
  }
  quantities.forEach(({ product, quantity }) => {
    data.orders.push({ id: crypto.randomUUID(), productId: product.id, quantity, date: targetDate, createdAt: localDate() });
    if (quantity > 0) {
      data.deliveries.push({
        id: crypto.randomUUID(),
        supplier: "Commissary",
        productId: product.id,
        expectedQuantity: quantity,
        receivedQuantity: 0,
        expectedDate: targetDate,
        actualDate: "",
        status: "Pending",
      });
    }
  });
  saveData();
  toast("All recommendations accepted.");
}
