/* ============================================
   All-Science Sims — Main Script
   ============================================ */

(function () {
  'use strict';

  // ---------- Constants ----------
  const STORAGE_KEY = 'all-science-sims:starred';

  // ---------- DOM References ----------
  const loginBtn = document.getElementById('loginBtn');
  const stars = document.querySelectorAll('.star-icon');
  const openLinks = document.querySelectorAll('.open-link');

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

    stars.forEach((star) => {
      const card = star.closest('.sim-card');
      const simId = card ? card.dataset.simId : null;
      if (!simId) return;

      // Apply saved state on load
      setStarVisual(star, starred.has(simId));

      // Toggle on click
      star.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent triggering the card's open-link
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

  /**
   * Navigate to the experiment page.
   */
  function handleOpenSim(e) {
    e.preventDefault();
    const card = e.currentTarget.closest('.sim-card');
    const simId = card ? card.dataset.simId : null;
    if (!simId) return;
    window.location.href = `sims/${simId}.html`;
  }

  /**
   * Wire up all sim cards → navigate to their page.
   */
  function initOpenLinks() {
    document.querySelectorAll('.sim-card').forEach((card) => {
      card.style.cursor = 'pointer';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      card.addEventListener('click', (e) => {
        if (e.target.closest('.star-icon')) return; // let star handle itself
        handleOpenSim(e);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenSim(e);
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

    // Normalize: decode HTML entities + trim
    function norm(s) {
      if (!s) return '';
      const txt = document.createElement('textarea');
      txt.innerHTML = s;                 // decodes &amp; -> &
      return txt.value.trim();
    }

    function applyFilter(category) {
      const target = norm(category);
      let visibleCount = 0;

      cards.forEach(card => {
        const cardCat = norm(card.dataset.category);
        const show = target === 'all' || cardCat === target;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
      }

      if (resultCount) {
        resultCount.textContent = visibleCount;
      }

      if (resultsBar) {
        const label = target === 'all'
          ? 'simulations available · ready to explore'
          : `simulation${visibleCount === 1 ? '' : 's'} in "${target}" · click All to reset`;
        resultsBar.innerHTML =
          `<i class="fas fa-flask"></i> <span>Results</span> ` +
          `<span id="resultCount">${visibleCount}</span> ${label}`;
      }

      pills.forEach(p => {
        p.classList.toggle('active', norm(p.dataset.category) === target);
      });
    }

    pills.forEach(pill => {
      pill.addEventListener('click', () => applyFilter(pill.dataset.category));
    });

    // Run once on load so the count reflects what's actually rendered
    applyFilter('all');

    window.filterByCategory = applyFilter;
  }

  // ---------- Login Button ----------

  /**
   * Handle login button click (placeholder).
   */
  function initLogin() {
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
    initStars();
    initOpenLinks();
    initLogin();
    initCategoryFilter();
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();