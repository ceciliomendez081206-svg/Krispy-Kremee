function deliveryStatus(delivery) {
  if (delivery.status === "Received") return "Received";
  return delivery.expectedDate < localDate() ? "Delayed" : "Pending";
}

pages.deliveries = () => `${header("Delivery Monitoring", "Schedule incoming supplies and record receiving")}
  <div class="card"><h3>Record Delivery</h3>
    <form class="form-grid" onsubmit="addDelivery(event)">
      <label>Supplier / source<input id="deliverySupplier" required maxlength="80" value="Commissary"></label>
      <label>Product<select id="deliveryProduct" required>${productOptions()}</select></label>
      <label>Quantity expected<input id="deliveryExpectedQuantity" type="number" min="1" step="1" required></label>
      <label>Expected delivery date<input id="deliveryExpectedDate" type="date" value="${addDays(localDate(), 1)}" required></label>
      <button class="btn" type="submit">Add Delivery</button>
    </form>
  </div>
  <div class="tbl-wrap"><table><thead><tr><th>Supplier</th><th>Product</th><th>Expected Date</th><th>Actual Date</th><th>Expected Qty</th><th>Received Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${data.deliveries.map((delivery) => {
      const status = deliveryStatus(delivery);
      return `<tr><td>${escapeHTML(delivery.supplier)}</td><td>${escapeHTML(productById(delivery.productId)?.name || "Unknown item")}</td><td>${formatDate(delivery.expectedDate)}</td><td>${formatDate(delivery.actualDate)}</td><td>${delivery.expectedQuantity}</td><td>${delivery.receivedQuantity ?? "—"}</td><td>${badge(status)}${status === "Delayed" ? '<div class="red">Delay alert</div>' : ""}</td><td>${status !== "Received" ? `<div class="receive-controls"><input class="quantity-input" id="received-${delivery.id}" type="number" min="0" step="1" value="${delivery.expectedQuantity}" aria-label="Quantity received"><button class="btn-outline" onclick="receiveDelivery('${delivery.id}')">Log Receiving</button></div>` : "Complete"}</td></tr>`;
    }).join("") || '<tr><td colspan="8">No delivery records yet.</td></tr>'}
  </tbody></table></div>`;

function addDelivery(event) {
  event.preventDefault();
  data.deliveries.push({
    id: crypto.randomUUID(),
    supplier: document.getElementById("deliverySupplier").value.trim(),
    productId: document.getElementById("deliveryProduct").value,
    expectedQuantity: Number(document.getElementById("deliveryExpectedQuantity").value),
    receivedQuantity: 0,
    expectedDate: document.getElementById("deliveryExpectedDate").value,
    actualDate: "",
    status: "Pending",
  });
  saveData();
  render();
  toast("Delivery added.");
}

function receiveDelivery(id) {
  const delivery = data.deliveries.find((entry) => entry.id === id);
  if (!delivery || delivery.status === "Received") return;
  const received = Number(document.getElementById(`received-${id}`).value);
  if (!Number.isInteger(received) || received < 0) {
    toast("Enter a valid received quantity.");
    return;
  }
  const product = productById(delivery.productId);
  delivery.receivedQuantity = received;
  delivery.actualDate = localDate();
  delivery.status = "Received";
  if (received > 0) {
    const preparedAt = localDateTime();
    const expiresAt = expiryFor(preparedAt, product);
    data.batches.push({
      id: crypto.randomUUID(),
      productId: delivery.productId,
      quantity: received,
      receivedQuantity: received,
      receivedDate: preparedAt.slice(0, 10),
      preparedAt,
      expiresAt,
      expiryDate: expiresAt.slice(0, 10),
      damaged: false,
      deliveryId: id,
    });
  }
  saveData();
  render();
  toast("Delivery received and inventory updated.");
}
