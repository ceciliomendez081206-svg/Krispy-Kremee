pages.calendar = () => {
  const [year, month] = calendarMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => '<div class="cell empty"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${calendarMonth}-${String(day).padStart(2, "0")}`;
    const matching = eventsOn(date);
    cells.push(`<div class="cell"><b>${day}</b>${matching.map((event) => `<div class="calendar-event">${escapeHTML(event.name)} (${event.adjustment >= 0 ? "+" : ""}${event.adjustment}%)</div>`).join("")}</div>`);
  }
  return `${header("Sales Drivers & Calendar", "Schedule promotions and events that influence demand", new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" }))}
    <div class="grid g2">
      <div class="card"><div class="toolbar"><button class="btn-outline" onclick="changeMonth(-1)">Previous</button><b>${new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</b><button class="btn-outline" onclick="changeMonth(1)">Next</button></div>
        <div class="cal">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="dh">${day}</div>`).join("")}${cells.join("")}</div>
      </div>
      <div class="card"><h3>Add Sales Driver / Event</h3>
        <form class="form-grid" onsubmit="addEvent(event)">
          <label>Event name<input id="eventName" required maxlength="80"></label>
          <label>Start date<input id="eventStartDate" type="date" value="${localDate()}" required></label>
          <label>End date<input id="eventEndDate" type="date" value="${localDate()}" required></label>
          <label>Event type<select id="eventType"><option>Promotion</option><option>Holiday</option><option>School opening</option><option>Special occasion</option><option>Peak season</option><option>Other</option></select></label>
          <label>Expected demand adjustment (%)<input id="eventAdjustment" type="number" min="-100" max="500" step="1" value="10" required></label>
          <label class="wide">Promotion details<input id="eventDetails" maxlength="160" placeholder="Offer, audience, or notes"></label>
          <button class="btn" type="submit">Add Event</button>
        </form>
      </div>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Promo / Event Period</th><th>Event</th><th>Type</th><th>Demand Adjustment</th><th>Automatic Status</th><th>Promotion Details</th><th>Action</th></tr></thead><tbody>
      ${data.events.slice().sort((a, b) => (a.startDate || a.date).localeCompare(b.startDate || b.date)).map((event) => `<tr><td>${formatDate(event.startDate || event.date)}${(event.endDate || event.date) !== (event.startDate || event.date) ? ` – ${formatDate(event.endDate)}` : ""}</td><td>${escapeHTML(event.name)}</td><td>${escapeHTML(event.type)}</td><td>${event.adjustment >= 0 ? "+" : ""}${event.adjustment}%</td><td>${badge(eventStatus(event))}</td><td>${escapeHTML(event.details)}</td><td><button class="btn-outline" onclick="deleteEvent('${event.id}')">Delete</button></td></tr>`).join("") || '<tr><td colspan="7">No events scheduled.</td></tr>'}
    </tbody></table></div>
    ${note("Promotions automatically show as Scheduled before their start date, Active from the start through end date, and Ended afterward. Active events apply to forecasts on every date in their period; event-linked sales are excluded from the normal-day moving average.")}`;
};

function addEvent(event) {
  event.preventDefault();
  const startDate = document.getElementById("eventStartDate").value;
  const endDate = document.getElementById("eventEndDate").value;
  if (endDate < startDate) {
    toast("The event end date cannot be before its start date.");
    return;
  }
  data.events.push({
    id: crypto.randomUUID(),
    name: document.getElementById("eventName").value.trim(),
    date: startDate,
    startDate,
    endDate,
    type: document.getElementById("eventType").value,
    adjustment: Number(document.getElementById("eventAdjustment").value),
    details: document.getElementById("eventDetails").value.trim(),
  });
  saveData();
  render();
  toast("Calendar event saved.");
}

function deleteEvent(id) {
  data.events = data.events.filter((event) => event.id !== id);
  saveData();
  render();
  toast("Event removed.");
}

function changeMonth(offset) {
  const [year, month] = calendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  calendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  render();
}
