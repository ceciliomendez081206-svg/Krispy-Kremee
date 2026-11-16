pages.freshness = () => {
  const batches = data.batches.filter((batch) => batchQuantity(batch) > 0);
  const now = new Date();
  const today = localDate(now);
  const expiredToday = batches.reduce((sum, batch) => {
    const expiry = batchExpiry(batch);
    return expiry && expiry.slice(0, 10) === today && batchIsExpired(batch, now)
      ? sum + batchQuantity(batch)
      : sum;
  }, 0);
  const expiringSoon = batches.reduce((sum, batch) => {
    const expiry = batchExpiry(batch);
    const remaining = expiry ? new Date(expiry).getTime() - now.getTime() : Infinity;
    return !batch.damaged && remaining > 0 && remaining <= 3 * 60 * 60 * 1000
      ? sum + batchQuantity(batch)
      : sum;
  }, 0);
  const sortedBatches = data.batches.slice().sort((left, right) => (
    (batchExpiry(left) || "9999").localeCompare(batchExpiry(right) || "9999")
  ));
  return `${header("Waste & Freshness Monitoring", "Monitor batch age and remove expired or damaged stock")}
    <div class="grid g2">
      <div class="card stat"><div class="lbl">Units expired today</div><div class="val ${expiredToday ? "red" : "green"}">${formatNumber(expiredToday)}</div><div class="sm">remaining stock that expired since midnight</div></div>
      <div class="card stat"><div class="lbl">Expiring within 3 hours</div><div class="val ${expiringSoon ? "amber" : "green"}">${formatNumber(expiringSoon)}</div><div class="sm">usable units to prioritize</div></div>
    </div>
    <div class="card"><h3>Record Waste or Removal</h3>
      <form class="form-grid" onsubmit="recordWaste(event)">
        <label>Batch<select id="wasteBatch" required>${sortedBatches.map((batch) => `<option value="${batch.id}">${escapeHTML(productById(batch.productId)?.name || "Unknown")} — ${batchQuantity(batch)} units · ${timeUntilExpiry(batchExpiry(batch), now)}</option>`).join("")}</select></label>
        <label>Quantity affected<input id="wasteQuantity" type="number" min="1" step="1" required></label>
        <label>Reason<select id="wasteReason" required><option>Expired</option><option>Damaged</option><option>Unsold / removed</option><option>Other</option></select></label>
        <label>Removal date<input id="wasteDate" type="date" value="${localDate()}" required></label>
        <button class="btn" type="submit" ${batches.length ? "" : "disabled"}>Record Waste / Remove Stock</button>
      </form>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Prepared</th><th>Expiry</th><th>Quantity Remaining</th><th>Freshness</th><th>Action</th></tr></thead><tbody>
      ${sortedBatches.map((batch) => {
        const expiry = batchExpiry(batch);
        const expired = batchIsExpired(batch, now);
        const near = expiry && !expired && new Date(expiry).getTime() <= now.getTime() + 3 * 60 * 60 * 1000;
        const freshness = !batchQuantity(batch) ? "Removed" : batch.damaged ? "Damaged" : expired ? "Expired" : near ? "Near Expiry" : "Fresh";
        const action = batchQuantity(batch)
          ? `<button class="btn-outline" onclick="toggleDamaged('${batch.id}', ${!batch.damaged})">${batch.damaged ? "Restore usable" : "Mark damaged"}</button>`
          : "—";
        return `<tr><td>${escapeHTML(productById(batch.productId)?.name || "Unknown item")}</td><td>${formatDateTime(batch.preparedAt || batch.receivedDate)}</td><td>${expiry ? formatDateTime(expiry) : "—"}</td><td>${formatNumber(batchQuantity(batch))} units</td><td>${badge(freshness)}<div class="sm">${timeUntilExpiry(expiry, now)}</div></td><td>${action}</td></tr>`;
      }).join("") || '<tr><td colspan="6">No stock batches recorded.</td></tr>'}
    </tbody></table></div>
    <div class="card"><h3>Waste Records</h3><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Reason</th></tr></thead><tbody>
      ${data.waste.map((entry) => `<tr><td>${formatDate(entry.date)}</td><td>${escapeHTML(productById(entry.productId)?.name || "Unknown item")}</td><td>${entry.quantity}</td><td>${escapeHTML(entry.reason)}</td></tr>`).join("") || '<tr><td colspan="4">No waste recorded.</td></tr>'}
    </tbody></table></div></div>
    ${note("Expired and damaged stock is excluded from usable inventory. Recording waste removes the affected quantity from stock.")}`;
};

function recordWaste(event) {
  event.preventDefault();
  const batch = data.batches.find((entry) => entry.id === document.getElementById("wasteBatch").value);
  const quantity = Number(document.getElementById("wasteQuantity").value);
  const date = document.getElementById("wasteDate").value;
  if (date > localDate()) {
    toast("Waste or removal date cannot be in the future.");
    return;
  }
  if (!batch || quantity > batchQuantity(batch)) {
    toast("Waste quantity exceeds the selected batch's remaining stock.");
    return;
  }
  batch.quantity -= quantity;
  data.waste.push({
    id: crypto.randomUUID(),
    productId: batch.productId,
    batchId: batch.id,
    quantity,
    reason: document.getElementById("wasteReason").value,
    date,
  });
  saveData();
  render();
  toast("Waste recorded and inventory updated.");
}

function toggleDamaged(id, markDamaged) {
  const batch = data.batches.find((entry) => entry.id === id);
  if (!batch) return;
  batch.damaged = markDamaged;
  saveData();
  render();
  toast(markDamaged ? "Batch excluded from usable stock." : "Batch marked usable.");
}
