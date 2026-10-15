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
   * Handle clicking an "Open sim" link.
   * Currently a placeholder — replace with real navigation later.
   * @param {Event} e
   */
  function handleOpenSim(e) {
    e.preventDefault();
    const card = e.currentTarget.closest('.sim-card');
    const simName = card ? card.querySelector('h3')?.innerText : 'this simulation';
    const simId = card ? card.dataset.simId : 'unknown';

    // TODO: Replace with real navigation, e.g.:
    // window.location.href = `sims/${simId}.html`;
    alert(
      `🚧 "${simName}" is not wired up yet.\n\n` +
      `Sim ID: ${simId}\n\n` +
      `This is a starting point — you can add the actual sim page later!`
    );
  }

  /**
   * Wire up all "Open sim" links.
   */
  function initOpenLinks() {
    openLinks.forEach((link) => {
      link.addEventListener('click', handleOpenSim);
    });
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
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();