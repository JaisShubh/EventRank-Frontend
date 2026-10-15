/**
 * EventRank Events Manager
 * Handles discovery, search, filter chips, personalized recommendations, and event card rendering.
 */

const EventsManager = {
  currentCategory: "all",
  searchQuery: "",
  sortBy: "score",

  async loadEvents() {
    const grid = document.getElementById("events-grid");
    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0;">
        <div style="font-size: 24px; color: var(--primary); margin-bottom: 12px;">⏳</div>
        <div style="font-size: 16px; color: var(--text-muted);">Discovering campus events...</div>
      </div>
    `;

    const params = {
      sort: this.sortBy
    };
    if (this.currentCategory && this.currentCategory !== "all") {
      params.category = this.currentCategory;
    }
    if (this.searchQuery) {
      params.q = this.searchQuery;
    }

    const { data, error } = await API.getEvents(params);

    if (error) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <div style="font-size: 24px; margin-bottom: 12px; color: var(--rose);">⚠️</div>
          <p style="color: var(--text-muted); margin-bottom: 16px;">${escapeHTML(error)}</p>
          <button onclick="EventsManager.loadEvents()" class="btn btn-secondary btn-sm">Try Again</button>
        </div>
      `;
      return;
    }

    const events = data?.events || [];
    this.renderEvents(events);
    this.renderLeaderboard(events);
  },

  renderEvents(events) {
    const grid = document.getElementById("events-grid");
    if (!grid) return;

    if (events.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 32px; margin-bottom: 12px;">🎪</div>
          <h3 style="margin-bottom: 8px;">No events found</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">No events match your current search or category filter.</p>
          <button onclick="EventsManager.seedDemoData()" class="btn btn-primary btn-sm">✨ Seed Demo Campus Events</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map((ev, index) => {
      const eventId = Number.parseInt(ev.id, 10);
      const score = ev.score !== null && ev.score !== undefined ? Number(ev.score).toFixed(1) : "7.0";
      const composite = ev.composite_score ? Math.round(ev.composite_score) : Math.round(Number(score) * 10);
      const isPredicted = ev.is_predicted;

      // Format date
      let dateStr = "Upcoming";
      if (ev.start_time) {
        try {
          const d = new Date(ev.start_time);
          dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch {
          dateStr = ev.start_time;
        }
      }

      return `
        <div class="event-card">
          <div class="event-card-header">
            <div class="event-card-pattern"></div>
            <span class="event-category-badge">${escapeHTML(ev.category || "Campus")}</span>
            <div class="event-rank-pill" title="${isPredicted ? 'Predicted based on organizer track record' : 'Calculated from credibility-weighted reviews'}">
              <span class="rank-score">${score}</span>
              <span class="rank-label">${isPredicted ? 'PREDICTED' : 'EVENTRANK'}</span>
            </div>
          </div>
          <div class="event-card-body">
            <div class="event-organizer">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <span>${escapeHTML(ev.organizer || "Campus Club")}</span>
            </div>
            <h3 class="event-title">${escapeHTML(ev.title)}</h3>
            <p class="event-desc">${escapeHTML(ev.description || "Join fellow students for this campus event. Physical check-ins verified via GPS & rotating QR.")}</p>

            <div class="event-meta">
              <div class="meta-item">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span>${escapeHTML(dateStr)}</span>
              </div>
              <div class="meta-item">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>${escapeHTML(ev.venue || "Campus Venue")}</span>
              </div>
            </div>
          </div>
          <div class="event-card-footer">
            <div class="turnout-indicator">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${ev.turnout_count || 0} Checked In</span>
            </div>
            <a href="event.html?id=${eventId}" class="btn btn-secondary btn-sm">Explore & Check In →</a>
          </div>
        </div>
      `;
    }).join("");
  },

  renderLeaderboard(events) {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;

    const sorted = [...events].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

    if (sorted.length === 0) {
      list.innerHTML = `<p style="color: var(--text-dim); font-size: 13px;">No events scored yet.</p>`;
      return;
    }

    list.innerHTML = sorted.map((ev, i) => `
      <a href="event.html?id=${Number.parseInt(ev.id, 10)}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface); border-radius: var(--radius-sm); margin-bottom: 8px; border: 1px solid var(--border-subtle); text-decoration: none;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 800; font-size: 14px; color: ${i === 0 ? 'var(--amber)' : i === 1 ? 'var(--cyan)' : 'var(--text-dim)'}; width: 18px;">#${i + 1}</span>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #fff;">${escapeHTML(ev.title)}</div>
            <div style="font-size: 11px; color: var(--text-dim);">${escapeHTML(ev.category || 'General')} • ${escapeHTML(ev.organizer || 'Club')}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 800; color: var(--amber); font-size: 14px;">${Number(ev.score || 7.0).toFixed(1)}</span>
          <div style="font-size: 10px; color: var(--text-dim);">${ev.turnout_count || 0} attendees</div>
        </div>
      </a>
    `).join("");
  },

  async loadCategories() {
    const chipsContainer = document.getElementById("category-chips");
    if (!chipsContainer) return;

    const { data } = await API.getCategories();
    const categories = ["all", ...(data?.categories || ["Coding", "Hackathon", "Music", "Cultural", "Workshop", "Tech Talk"])];

    chipsContainer.innerHTML = categories.map(cat => `
      <button class="category-chip ${cat === this.currentCategory ? 'active' : ''}" data-category="${escapeHTML(cat)}">
        ${cat === 'all' ? '✨ All Events' : escapeHTML(cat)}
      </button>
    `).join("");

    chipsContainer.querySelectorAll(".category-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        chipsContainer.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentCategory = btn.dataset.category;
        this.loadEvents();
      });
    });
  },

  async seedDemoData() {
    showToast("Generating verified campus demo events...", "info");

    const demoEvents = [
      {
        title: "HackCampus 2026: 24-Hour AI Buildathon",
        description: "Join 200+ student developers building fullstack AI agents with LLMs, Python and Cloud. Keynote by tech founders.",
        category: "Hackathon",
        organizer: "Developer Student Club",
        venue: "Main Auditorium, Block C",
        start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
        lat: 12.9716,
        lng: 77.5946
      },
      {
        title: "Acoustic Unplugged: Campus Open Mic Night",
        description: "Live student band performances, stand-up comedy and acoustic jam sessions under the amphitheatre lights.",
        category: "Music",
        organizer: "Cultural Society",
        venue: "Open Air Amphitheatre",
        start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
        lat: 12.9720,
        lng: 77.5950
      },
      {
        title: "Tech Horizon: Generative AI & Systems Architecture",
        description: "Industry panel with senior engineers from Google and Microsoft discussing agentic workflows and production scaling.",
        category: "Tech Talk",
        organizer: "ACM Student Chapter",
        venue: "Seminar Hall 2",
        start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
        lat: 12.9712,
        lng: 77.5940
      },
      {
        title: "RoboClash: Autonomous Bot Racing & Battle",
        description: "Line-following drones, battle-bots arena fights, and micro-controller hardware challenges with cash prizes.",
        category: "Robotics",
        organizer: "Robotics & IoT Club",
        venue: "Mechanical Workshop Lab",
        start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
        lat: 12.9725,
        lng: 77.5935
      }
    ];

    let createdCount = 0;
    for (const ev of demoEvents) {
      const res = await API.createEvent(ev);
      if (res.data) createdCount++;
    }

    showToast(`Created ${createdCount} realistic demo events!`, "success");
    setTimeout(() => {
      this.loadCategories();
      this.loadEvents();
    }, 800);
  },

  init() {
    this.loadCategories();
    this.loadEvents();

    // Bind search
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          this.loadEvents();
        }, 300);
      });
    }

    // Bind sort select
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.loadEvents();
      });
    }
  }
};

window.EventsManager = EventsManager;
