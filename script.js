/* ============================================
   All-Science Sims — Main Script (merged)
   ============================================
   Structure based on Branch B:
     - category filtering via data-category
     - norm() decodes HTML entities (&amp; -> &)
     - live result count + no-results message
   Behaviors imported from Branch A:
     - stub cards (no real href) show an alert instead of 404
     - star toggling saves to localStorage
   ============================================ */

(function () {
  'use strict';

  // ---------- Constants ----------
  const STORAGE_KEY = 'all-science-sims:starred';

  // ---------- Star / Favorites Logic ----------

  /**
   * Load starred sim IDs from localStorage.
   * @returns {Set<string>}
   */
  function loadStarred() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (err) {
      console.warn('Could not load starred sims:', err);
      return new Set();
    }
  }

  /**
   * Save starred sim IDs to localStorage.
   * @param {Set<string>} set
   */
  function saveStarred(set) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch (err) {
      console.warn('Could not save starred sims:', err);
    }
  }

  /**
   * Apply the visual "starred" state to an icon.
   * @param {HTMLElement} icon
   * @param {boolean} isStarred
   */
  function setStarVisual(icon, isStarred) {
    if (isStarred) {
      icon.classList.remove('far');
      icon.classList.add('fas', 'starred');
      icon.style.color = '#f5b342';
      icon.title = 'Unstar this simulation';
    } else {
      icon.classList.remove('fas', 'starred');
      icon.classList.add('far');
      icon.style.color = '#b0c8da';
      icon.title = 'Star this simulation';
    }
  }

  /**
   * Initialize star icons based on saved state and wire up click handlers.
   */
  function initStars() {
    const starred = loadStarred();
    const stars = document.querySelectorAll('.star-icon');

    stars.forEach((star) => {
      const card = star.closest('.sim-card');
      const simId = card ? card.dataset.simId : null;
      if (!simId) return;

      // Apply saved state on load
      setStarVisual(star, starred.has(simId));

      // Toggle on click
      star.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent the card's open handler from firing
        e.preventDefault();
        const isNowStarred = !starred.has(simId);

        if (isNowStarred) {
          starred.add(simId);
        } else {
          starred.delete(simId);
        }

        setStarVisual(star, isNowStarred);
        saveStarred(starred);
      });
    });
  }

  // ---------- Open Simulation Logic ----------
  //
  // Hybrid behavior:
  //   - If the card has a real <a class="open-link" href="...">, navigate there.
  //   - If not (stub card), show an alert naming the sim and its ID.
  //
  // Whole card is clickable + keyboard-accessible (Enter / Space),
  // except when the click target is the star icon.

  /**
   * Activate a sim card: navigate to its page, or alert if it's a stub.
   * @param {HTMLElement} card
   */
  function activateCard(card) {
    const simId = card.dataset.simId;
    const link = card.querySelector('.open-link');
    const hasRealHref = link && link.tagName === 'A' && link.getAttribute('href');

    if (hasRealHref) {
      window.location.href = link.getAttribute('href');
      return;
    }

    const name = (card.querySelector('h3')?.innerText || 'this simulation').trim();
    alert(
      `🚧 "${name}" is not wired up yet.\n\n` +
      `Sim ID: ${simId || 'unknown'}\n\n` +
      `This card still points to a placeholder. The real sim page hasn't been added yet.`
    );
  }

  /**
   * Wire up all sim cards: whole-card click, Enter/Space, and
   * let the browser handle real <a class="open-link"> clicks natively.
   */
  function initOpenLinks() {
    document.querySelectorAll('.sim-card').forEach((card) => {
      card.style.cursor = 'pointer';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');

      card.addEventListener('click', (e) => {
        // Let the star handle its own click
        if (e.target.closest('.star-icon')) return;

        // If the user actually clicked the anchor, let the browser navigate
        const anchor = e.target.closest('a.open-link');
        if (anchor && anchor.getAttribute('href')) return;

        e.preventDefault();
        activateCard(card);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateCard(card);
        }
      });
    });
  }

  // ---------- Category Filtering ----------

  function initCategoryFilter() {
    const grid = document.getElementById('simsGrid');
    const pills = document.querySelectorAll('#subjectGrid .subject-pill');
    const cards = grid ? grid.querySelectorAll('.sim-card') : [];
    const noResults = document.getElementById('noResults');
    const resultCount = document.getElementById('resultCount');
    const resultsBar = document.getElementById('resultsBar');

    if (!grid || !pills.length) return;

    // Normalize: decode HTML entities (&amp; -> &) + trim
    function norm(s) {
      if (!s) return '';
      const txt = document.createElement('textarea');
      txt.innerHTML = s;
      return txt.value.trim();
    }

    function applyFilter(category) {
      const target = norm(category);
      let visibleCount = 0;

      cards.forEach((card) => {
        const cardCat = norm(card.dataset.category);
        const show = target === 'all' || cardCat === target;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
      }

      if (resultsBar) {
        const label =
          target === 'all'
            ? 'simulations available · ready to explore'
            : `simulation${visibleCount === 1 ? '' : 's'} in "${target}" · click All to reset`;

        resultsBar.innerHTML =
          `<i class="fas fa-flask"></i> <span>Results</span> ` +
          `<span id="resultCount">${visibleCount}</span> ${label}`;
      }

      pills.forEach((p) => {
        p.classList.toggle('active', norm(p.dataset.category) === target);
      });
    }

    pills.forEach((pill) => {
      pill.addEventListener('click', () => applyFilter(pill.dataset.category));
    });

    // Run once on load so the count reflects what's actually rendered
    applyFilter('all');

    // Expose for debugging / future use
    window.filterByCategory = applyFilter;
  }

  // ---------- Login Button ----------

  function initLogin() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    loginBtn.addEventListener('click', () => {
      // TODO: Replace with real auth flow.
      alert(
        '🔐 Login / history feature coming soon.\n\n' +
        'For now, your stars are saved on this device.'
      );
    });
  }

  // ---------- Init ----------

  function init() {
    try { initStars(); } catch (e) { console.error('initStars failed:', e); }
    try { initOpenLinks(); } catch (e) { console.error('initOpenLinks failed:', e); }
    try { initLogin(); } catch (e) { console.error('initLogin failed:', e); }
    try { initCategoryFilter(); } catch (e) { console.error('initCategoryFilter failed:', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();