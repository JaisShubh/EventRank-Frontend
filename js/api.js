/**
 * EventRank API Client & Toast Utility
 * Handles communication with the Flask backend running on http://127.0.0.1:5000
 */

const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  && window.location.port !== "5000";
const API_BASE = window.API_BASE_URL || (isLocalFrontend
  ? "http://127.0.0.1:5000"
  : window.location.origin);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// --- Toast Notifications ---
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "✓ " : type === "error" ? "✕ " : "ℹ ";
  toast.innerText = `${icon} ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Base Fetch Wrapper ---
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = localStorage.getItem("eventrank_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const errorMsg = data?.error || `Request failed (${res.status})`;
      return { data: null, error: errorMsg, status: res.status };
    }

    return { data, error: null, status: res.status };
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    return { data: null, error: "Unable to connect to EventRank server. Is backend running?", status: 0 };
  }
}

// --- API Service Methods ---
const API = {
  // Auth
  signup: (payload) => apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  getMe: () => apiRequest("/auth/me", { method: "GET" }),

  // Events
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/events${query ? `?${query}` : ""}`, { method: "GET" });
  },
  getEvent: (id) => apiRequest(`/events/${id}`, { method: "GET" }),
  createEvent: (payload) => apiRequest("/events", { method: "POST", body: JSON.stringify(payload) }),
  updateEvent: (id, payload) => apiRequest(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteEvent: (id) => apiRequest(`/events/${id}`, { method: "DELETE" }),
  getCategories: () => apiRequest("/events/categories", { method: "GET" }),
  getRecommendations: (interests) => apiRequest(`/events/recommendations?interests=${encodeURIComponent(interests)}`, { method: "GET" }),

  // Reviews & AI Insights
  getReviews: (eventId) => apiRequest(`/events/${eventId}/reviews`, { method: "GET" }),
  createReview: (eventId, payload) => apiRequest(`/events/${eventId}/reviews`, { method: "POST", body: JSON.stringify(payload) }),
  deleteReview: (eventId, reviewId) => apiRequest(`/events/${eventId}/reviews/${reviewId}`, { method: "DELETE" }),
  getEventInsights: (eventId) => apiRequest(`/events/${eventId}/insights`, { method: "GET" }),
  getGlobalInsights: () => apiRequest("/insights", { method: "GET" }),

  // Check-ins & QR
  getQrData: (eventId) => apiRequest(`/events/${eventId}/qr-data`, { method: "GET" }),
  getQrImageUrl: (eventId) => `${API_BASE}/events/${eventId}/qr.png?t=${Date.now()}`,
  checkin: (payload) => apiRequest("/checkin", { method: "POST", body: JSON.stringify(payload) }),
  getCheckinStatus: (eventId) => apiRequest(`/checkin/status?event_id=${eventId}`, { method: "GET" }),
  getEventCheckins: (eventId) => apiRequest(`/events/${eventId}/checkins`, { method: "GET" })
};

// Expose globally
window.API = API;
window.showToast = showToast;
window.escapeHTML = escapeHTML;
