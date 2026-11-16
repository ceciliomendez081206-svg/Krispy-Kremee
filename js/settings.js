pages.settings = () => {
  const user = currentUser();
  return `${header("Settings", "Manage your appearance and account")}
    <div class="card">
      <h3>Appearance</h3>
      <form class="form-grid" onsubmit="saveAppearance(event)">
        <label for="theme">Theme
          <select id="theme">
            <option value="light" ${document.body.dataset.theme === "light" ? "selected" : ""}>Light</option>
            <option value="dark" ${document.body.dataset.theme === "dark" ? "selected" : ""}>Dark</option>
          </select>
        </label>
        <button class="btn" type="submit">Save Appearance</button>
      </form>
    </div>
    <div class="card">
      <h3>Account</h3>
      <form class="form-grid" onsubmit="saveAccountSettings(event)">
        <label for="currentPassword">Current password
          <input id="currentPassword" type="password" autocomplete="current-password" required>
        </label>
        <label for="accountUsername">Username
          <input id="accountUsername" value="${escapeHTML(user.username)}" minlength="3" maxlength="40" autocomplete="username" required>
        </label>
        <label for="newPassword">New password
          <input id="newPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Leave blank to keep current">
        </label>
        <label for="confirmPassword">Confirm new password
          <input id="confirmPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Leave blank to keep current">
        </label>
        <button class="btn" type="submit">Save Account</button>
      </form>
      ${note("Account settings are stored in this browser for this demo.")}
    </div>`;
};

function saveAppearance(event) {
  event.preventDefault();
  const theme = document.getElementById("theme").value;
  if (theme !== "light" && theme !== "dark") {
    toast("Choose a valid theme.");
    return;
  }
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  toast("Appearance saved.");
}

function saveAccountSettings(event) {
  event.preventDefault();
  const accounts = getAccounts();
  const signedInUsername = sessionStorage.getItem(SESSION_KEY);
  const account = accounts.find((entry) => entry.username === signedInUsername);
  if (!account) {
    logout();
    return;
  }
  const currentPassword = document.getElementById("currentPassword").value;
  const username = document.getElementById("accountUsername").value.trim();
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (account.password !== currentPassword) {
    toast("Current password is incorrect.");
    return;
  }
  if (username.length < 3 || username.length > 40) {
    toast("Username must be 3 to 40 characters.");
    return;
  }
  if (accounts.some((entry) => entry !== account && entry.username.toLowerCase() === username.toLowerCase())) {
    toast("That username is already in use.");
    return;
  }
  if (newPassword && newPassword.length < 6) {
    toast("New password must be at least 6 characters.");
    return;
  }
  if (newPassword !== confirmPassword) {
    toast("New password and confirmation do not match.");
    return;
  }
  account.username = username;
  if (newPassword) account.password = newPassword;
  saveAccounts(accounts);
  sessionStorage.setItem(SESSION_KEY, account.username);
  render();
  toast("Account settings saved.");
}
