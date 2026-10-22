/* ============================================
   All-Science Sims — Main Script
   ============================================ */

(function () {
  'use strict';

  // ---------- Constants ----------
  const STORAGE_KEY = 'all-science-sims:starred';

  // ---------- Star / Favorites Logic ----------

  function loadStarred() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (err) {
      console.warn('Could not load starred sims:', err);
      return new Set();
    }
  }

  function saveStarred(set) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch (err) {
      console.warn('Could not save starred sims:', err);
    }
  }

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

  function initStars() {
    const starred = loadStarred();
    const stars = document.querySelectorAll('.star-icon');

    stars.forEach((star) => {
      const card = star.closest('.sim-card');
      const simId = card ? card.dataset.simId : null;
      if (!simId) return;

      setStarVisual(star, starred.has(simId));

      star.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isNowStarred = !starred.has(simId);
        if (isNowStarred) starred.add(simId);
        else starred.delete(simId);
        setStarVisual(star, isNowStarred);
        saveStarred(starred);
      });
    });
  }

  // ---------- Open Simulation (event delegation) ----------
  // Only intercept `.open-link` elements that are SPANS (stubs).
  // Anchors with a real href navigate normally.

  function initOpenLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.open-link');
      if (!link) return;
      // If it's an <a> with an href → let the browser navigate
      if (link.tagName === 'A' && link.getAttribute('href')) return;
      // If it has no href → stub card, show alert
      e.preventDefault();
      const card = link.closest('.sim-card');
      const simName = card ? (card.querySelector('h3')?.innerText || 'this simulation') : 'this simulation';
      const simId = card ? card.dataset.simId : 'unknown';
      alert(
        `🚧 "${simName}" is not wired up yet.\n\n` +
        `Sim ID: ${simId}\n\n` +
        `This card still points to a placeholder. The real sim page hasn't been added yet.`
      );
    });
  }

  // ---------- Login Button ----------

  function initLogin() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;
    loginBtn.addEventListener('click', () => {
      alert(
        '🔐 Login / history feature coming soon.\n\n' +
        'For now, your stars are saved on this device.'
      );
    });
  }

  // ---------- Subject Filtering ----------

  function initSubjectFilter() {
    const pills = document.querySelectorAll('.subject-pill');
    const cards = document.querySelectorAll('.sim-card');
    const resultsBar = document.querySelector('.results-bar');

    if (!pills.length) return;

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const subject = pill.dataset.subject;
        let visible = 0;

        cards.forEach((card) => {
          const matches = subject === 'all' || card.dataset.subject === subject;
          card.style.display = matches ? '' : 'none';
          if (matches) visible++;
        });

        if (resultsBar) {
          const label = pill.textContent.trim();
          resultsBar.innerHTML =
            `<i class="fas fa-flask"></i> <span>Results</span> ` +
            `${visible} simulation${visible === 1 ? '' : 's'} in ${label}` +
            (subject === 'all' ? ' · ready to explore' : '');
        }

        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  }

  // ---------- Init ----------

  function init() {
    try { initStars(); } catch (e) { console.error('initStars failed:', e); }
    try { initOpenLinks(); } catch (e) { console.error('initOpenLinks failed:', e); }
    try { initLogin(); } catch (e) { console.error('initLogin failed:', e); }
    try { initSubjectFilter(); } catch (e) { console.error('initSubjectFilter failed:', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();