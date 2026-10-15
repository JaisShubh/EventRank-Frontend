/**
 * EventRank Auth Manager
 * Manages JWT tokens, user metadata, and UI authentication headers.
 */

const Auth = {
  getToken() {
    return localStorage.getItem("eventrank_token");
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem("eventrank_user") || "null");
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(this.getToken());
  },

  saveSession(token, user) {
    if (!token || !user) {
      throw new Error("A valid access token and user are required to save a session.");
    }
    localStorage.setItem("eventrank_token", token);
    localStorage.setItem("eventrank_user", JSON.stringify(user));
    this.updateNavbar();
  },

  async logout() {
    try {
      await API.logout();
    } catch (e) {
      console.warn("Logout error:", e);
    }
    localStorage.removeItem("eventrank_token");
    localStorage.removeItem("eventrank_user");
    showToast("Logged out successfully.", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 600);
  },

  updateNavbar() {
    const navActions = document.getElementById("nav-auth-actions");
    if (!navActions) return;

    const user = this.getUser();

    if (user) {
      const name = user.user_metadata?.name || user.email?.split("@")[0] || "Student";
      const initial = name.charAt(0).toUpperCase();

      navActions.innerHTML = `
        <a href="dashboard.html" class="user-badge">
          <div class="user-avatar">${escapeHTML(initial)}</div>
          <span>${escapeHTML(name)}</span>
        </a>
        <button id="nav-logout-btn" class="btn btn-outline btn-sm">Log Out</button>
      `;

      document.getElementById("nav-logout-btn")?.addEventListener("click", () => this.logout());
    } else {
      navActions.innerHTML = `
        <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
        <a href="login.html?tab=signup" class="btn btn-primary btn-sm">Sign Up</a>
      `;
    }
  },

  init() {
    this.updateNavbar();
  }
};

// Auto-initialize navbar on load
document.addEventListener("DOMContentLoaded", () => {
  Auth.init();
});

window.Auth = Auth;
