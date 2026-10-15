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

    stars.forEach((star) => {
      const card = star.closest('.sim-card');
      const simId = card ? card.dataset.simId : null;
      if (!simId) return;

      setStarVisual(star, starred.has(simId));

      star.addEventListener('click', (e) => {
        e.stopPropagation();
        const isNowStarred = !starred.has(simId);

        if (isNowStarred) starred.add(simId);
        else starred.delete(simId);

        setStarVisual(star, isNowStarred);
        saveStarred(starred);
      });
    });
  }

  // ---------- Open Simulation Logic ----------

  /**
   * Only wire up the alert for <span> open-links (i.e. sims that
   * don't have a real page yet). <a> open-links navigate normally.
   */
  function initOpenLinks() {
    const stubLinks = document.querySelectorAll('span.open-link');

    stubLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const card = link.closest('.sim-card');
        const simName = card ? card.querySelector('h3')?.innerText : 'this simulation';
        const simId = card ? card.dataset.simId : 'unknown';

        alert(
          `🚧 "${simName}" is not wired up yet.\n\n` +
          `Sim ID: ${simId}\n\n` +
          `This is a starting point — you can add the actual sim page later!`
        );
      });
    });
  }

  // ---------- Login Button ----------

  function initLogin() {
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
    initStars();
    initOpenLinks();
    initLogin();
    initSubjectFilter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();