/**
 * EventRank Reviews, Check-in & AI Insights Controller
 * Manages event detail pages, sentiment analysis, GPS geofenced check-in, and review submissions.
 */

const EventDetailController = {
  eventId: null,
  eventData: null,
  qrTimer: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.eventId = urlParams.get("id");

    if (!this.eventId) {
      showToast("No event specified. Redirecting to discovery...", "error");
      setTimeout(() => window.location.href = "index.html", 1500);
      return;
    }

    await this.loadEventDetails();
    await this.loadInsights();
    await this.loadReviews();
    this.checkUserCheckinStatus();
    this.startRotatingQr();
  },

  async loadEventDetails() {
    const { data, error } = await API.getEvent(this.eventId);
    if (error || !data?.event) {
      document.getElementById("event-title").innerText = "Event Not Found";
      showToast(error || "Event not found", "error");
      return;
    }

    this.eventData = data.event;
    const ev = this.eventData;

    document.getElementById("event-title").innerText = ev.title;
    document.getElementById("event-desc").innerText = ev.description || "No description provided.";
    document.getElementById("event-category").innerText = ev.category || "Campus";
    document.getElementById("event-organizer").innerText = ev.organizer || "Campus Club";
    document.getElementById("event-venue").innerText = ev.venue || "Venue TBA";

    // Format start time
    if (ev.start_time) {
      try {
        const d = new Date(ev.start_time);
        document.getElementById("event-time").innerText = d.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch {
        document.getElementById("event-time").innerText = ev.start_time;
      }
    }

    // Set Scores
    const scoreVal = ev.score !== null && ev.score !== undefined ? Number(ev.score).toFixed(1) : "7.0";
    document.getElementById("score-value").innerText = scoreVal;
    document.getElementById("stat-reviews-count").innerText = ev.review_count || 0;
    document.getElementById("stat-turnout-count").innerText = ev.turnout_count || 0;
    document.getElementById("stat-composite-rank").innerText = `${Math.round(ev.composite_score || 70)}/100`;

    // Turnout gauge
    const turnoutRatio = Math.min(100, Math.round(((ev.turnout_count || 0) / 100) * 100));
    const gauge = document.getElementById("turnout-progress-bar");
    if (gauge) {
      gauge.style.width = `${Math.max(10, turnoutRatio)}%`;
    }
  },

  async loadInsights() {
    const { data } = await API.getEventInsights(this.eventId);
    if (!data) return;

    // Sentiment breakdown
    const counts = data.sentiment_overview?.counts || { positive: 0, neutral: 0, negative: 0 };
    const total = (counts.positive + counts.neutral + counts.negative) || 1;

    const posPct = Math.round((counts.positive / total) * 100);
    const neuPct = Math.round((counts.neutral / total) * 100);
    const negPct = Math.round((counts.negative / total) * 100);

    const bar = document.getElementById("sentiment-bar");
    if (bar) {
      bar.innerHTML = `
        <div class="positive" style="width: ${posPct}%;" title="${posPct}% Positive"></div>
        <div class="neutral" style="width: ${neuPct}%;" title="${neuPct}% Neutral"></div>
        <div class="negative" style="width: ${negPct}%;" title="${negPct}% Negative"></div>
      `;
    }

    const legend = document.getElementById("sentiment-legend");
    if (legend) {
      legend.innerHTML = `
        <span style="color: var(--emerald);">Positive: ${posPct}%</span>
        <span style="color: var(--amber);">Neutral: ${neuPct}%</span>
        <span style="color: var(--rose);">Negative: ${negPct}%</span>
      `;
    }

    // Pros & Cons
    const prosList = document.getElementById("pros-list");
    const consList = document.getElementById("cons-list");

    if (prosList) {
      const pros = data.pros_and_cons?.pros || ["Great overall organization"];
      prosList.innerHTML = pros.map(p => `
        <li class="bullet-item pro">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>${escapeHTML(p)}</span>
        </li>
      `).join("");
    }

    if (consList) {
      const cons = data.pros_and_cons?.cons || ["No major complaints reported"];
      consList.innerHTML = cons.map(c => `
        <li class="bullet-item con">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>${escapeHTML(c)}</span>
        </li>
      `).join("");
    }
  },

  async loadReviews() {
    const list = document.getElementById("reviews-list");
    if (!list) return;

    const { data, error } = await API.getReviews(this.eventId);
    const reviews = data?.reviews || [];

    if (reviews.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 30px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <p style="color: var(--text-dim); margin-bottom: 12px;">No reviews yet for this event.</p>
          <button onclick="EventDetailController.openReviewModal()" class="btn btn-outline btn-sm">Be the first to review</button>
        </div>
      `;
      return;
    }

    list.innerHTML = reviews.map(r => {
      const isVerified = r.verified_attendee;
      const sentiment = r.sentiment?.label;
      const sentimentBadge = sentiment === 'positive'
        ? `<span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--emerald-light); color: var(--emerald);">Positive Sentiment</span>`
        : sentiment === 'negative'
        ? `<span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--rose-light); color: var(--rose);">Critical</span>`
        : '';

      return `
        <div class="review-item">
          <div class="review-header">
            <div class="reviewer-info">
              <span style="font-weight: 700; color: #fff;">Student Reviewer</span>
              ${isVerified ? `
                <span class="badge-verified">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Verified Attendee
                </span>
              ` : ''}
              ${sentimentBadge}
            </div>
            <span class="rating-badge">★ ${Number(r.rating).toFixed(1)} / 10</span>
          </div>
          <p class="review-comment">${escapeHTML(r.comment || "(No written comment)")}</p>
        </div>
      `;
    }).join("");
  },

  async checkUserCheckinStatus() {
    const statusBtn = document.getElementById("checkin-btn");
    if (!statusBtn) return;

    if (!Auth.isLoggedIn()) {
      statusBtn.innerHTML = `<span>🔒 Log in to Check In via GPS</span>`;
      statusBtn.onclick = () => window.location.href = "login.html";
      return;
    }

    const { data } = await API.getCheckinStatus(this.eventId);
    if (data?.checked_in) {
      statusBtn.className = "btn btn-verified btn-block";
      statusBtn.innerHTML = `<span>✓ You are Checked In (Verified Attendee)</span>`;
      statusBtn.disabled = true;
    } else {
      statusBtn.className = "btn btn-primary btn-block";
      statusBtn.innerHTML = `<span>Scan the current venue QR code to check in</span>`;
      statusBtn.disabled = true;
    }
  },

  async performGpsCheckin() {
    if (!Auth.isLoggedIn()) {
      showToast("Please log in to verify your attendance.", "error");
      setTimeout(() => window.location.href = "login.html", 1000);
      return;
    }

    showToast("Scan the current venue QR code to check in with your location.", "info");
  },

  startRotatingQr() {
    const qrImg = document.getElementById("qr-image");
    const countdown = document.getElementById("qr-countdown-sec");
    if (!qrImg) return;

    const refreshQr = async () => {
      const { data } = await API.getQrData(this.eventId);
      if (data) {
        qrImg.src = API.getQrImageUrl(this.eventId);
        let rem = data.expires_in_seconds || 30;
        if (countdown) countdown.innerText = `${rem}s`;
      }
    };

    refreshQr();
    this.qrTimer = setInterval(refreshQr, 15000);
  },

  openReviewModal() {
    if (!Auth.isLoggedIn()) {
      showToast("Please log in to write a review.", "info");
      setTimeout(() => window.location.href = "login.html", 1000);
      return;
    }
    const modal = document.getElementById("review-modal");
    if (modal) modal.classList.add("active");
  },

  closeReviewModal() {
    const modal = document.getElementById("review-modal");
    if (modal) modal.classList.remove("active");
  },

  async submitReview(e) {
    e.preventDefault();
    const ratingInput = document.getElementById("review-rating");
    const commentInput = document.getElementById("review-comment");

    const rating = parseFloat(ratingInput.value);
    const comment = commentInput.value.trim();

    if (!rating || rating < 1 || rating > 10) {
      showToast("Please select a rating between 1.0 and 10.0", "error");
      return;
    }

    const { data, error } = await API.createReview(this.eventId, { rating, comment });
    if (error) {
      showToast(error, "error");
    } else {
      showToast("Review submitted successfully!", "success");
      this.closeReviewModal();
      commentInput.value = "";
      await this.loadReviews();
      await this.loadInsights();
      await this.loadEventDetails();
    }
  }
};

window.EventDetailController = EventDetailController;
