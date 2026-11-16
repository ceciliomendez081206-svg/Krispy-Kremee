# Smart Stall - Krispy Kreme Inventory and Ordering System

Open html/index.html in a browser to start. Demo accounts:
- Admin: `admin` / `admin123`
- Staff: `staff` / `staff123`

Files
- html/                         All application pages
- css/                          Shared and page-specific stylesheets
- js/core.js                    Shared data, authentication, and helpers
- js/                           Application code organized by feature
- js/settings.js                Appearance and account settings
- js/dashboard.js               Dashboard
- js/inventory.js               Inventory and raw materials
- js/sales.js                   Sales history and recording
- js/forecasting.js             Forecasts and quantity recommendations
- js/deliveries.js              Delivery tracking
- js/freshness.js               Freshness and waste tracking
- js/calendar.js                Promotions and events
- js/reports.js                 Reports and exports
- assets/krispy-kreme-logo.webp Krispy Kreme logo image

Notes
- Login state is kept in the browser session; logging out returns to html/index.html.
- Demo data and accounts persist in browser local storage.
- Settings can switch between light and dark themes and update the signed-in demo account.
- Moving-average forecasts use recent recorded sales that are not linked to calendar events. Promotion and peak-season uplifts apply for each scheduled event's full date range.
- Promotions automatically move between scheduled, active, and ended based on their start and end dates.
- Daily production recommendations can be adjusted and printed for a selected date.
- Finished goods and operational supplies are kept separate from raw materials. Raw-material batches include expiry monitoring and production usage is deducted from the earliest-expiring usable batch first.
- Each product stores its shelf life in hours; batch expiry is calculated from its prepared or received time. Freshness monitoring shows time remaining, today's expired quantity, and stock expiring within three hours.
- Inventory is tracked by batch; expired and damaged stock is excluded from usable inventory.
- The shared logo image is used on the login screen and every app page.
- This is a front-end prototype, not a secure production system. Authentication runs in the browser, and local storage is not suitable for real credentials or sensitive business data.
