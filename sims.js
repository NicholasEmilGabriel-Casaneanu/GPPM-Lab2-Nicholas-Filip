/* ============================================
   All-Science Sims — Interactive Simulations
   ============================================ */

(function () {
  'use strict';

  // ---------- Modal Infrastructure ----------

  let modalOverlay = null;
  let modalTitle = null;
  let modalTag = null;
  let modalBody = null;
  let currentCleanup = null;

  function ensureModal() {
    if (modalOverlay) return;

    modalOverlay = document.createElement('div');
    modalOverlay.className = 'sim-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="sim-modal" role="dialog" aria-modal="true">
        <div class="sim-modal-header">
          <div>
            <span class="sim-modal-tag"></span>
            <h2></h2>
          </div>
          <button class="sim-modal-close" aria-label="Close simulation">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="sim-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    modalTitle = modalOverlay.querySelector('.sim-modal-header h2');
    modalTag = modalOverlay.querySelector('.sim-modal-tag');
    modalBody = modalOverlay.querySelector('.sim-modal-body');

    modalOverlay.querySelector('.sim-modal-close').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
      }
    });
  }

  function openModal(title, tag, builderFn) {
    ensureModal();
    modalTitle.textContent = title;
    modalTag.textContent = tag;
    modalBody.innerHTML = '';
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    currentCleanup = builderFn(modalBody) || null;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
  }

  // ---------- Helpers ----------

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'className') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v !== undefined && v !== null) {
        node.setAttribute(k, v);
      }
    });
    children.forEach((c) => {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function makeControl(label, min, max, step, value, onInput) {
    const group = el('div', { className: 'sim-control-group' });
    const valueSpan = el('span', { className: 'range-value', text: value });
    const input = el('input', {
      type: 'range', min, max, step, value,
    });
    input.addEventListener('input', () => {
      valueSpan.textContent = input.value;
      onInput(parseFloat(input.value));
    });
    group.appendChild(el('label', { text: label }));
    group.appendChild(input);
    group.appendChild(valueSpan);
    return group;
  }

  function makeBtn(text, onClick, secondary = false) {
    return el('button', {
      className: 'sim-btn' + (secondary ? ' secondary' : ''),
      onClick,
    }, [text]);
  }

  // ============================================================
  // 1. PHYSICS — Electric Field & Charges
  // ============================================================
  function buildElectricField(root) {
    const W = 700, H = 420;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // charges: {x, y, q}
    let charges = [
      { x: 250, y: 210, q: +1 },
      { x: 450, y: 210, q: -1 },
    ];
    let dragging = null;
    let mode = 'field'; // 'field' | 'lines'
    let cleanupFns = [];

    const toggles = el('div', { className: 'sim-toggles' });
    ['Field Vectors', 'Field Lines'].forEach((label, i) => {
      const btn = el('button', {
        className: 'sim-toggle' + (i === 0 ? ' active' : ''),
        text: label,
      });
      btn.addEventListener('click', () => {
        toggles.querySelectorAll('.sim-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mode = i === 0 ? 'field' : 'lines';
        draw();
      });
      toggles.appendChild(btn);
    });
    root.appendChild(toggles);

    const readout = el('div', { className: 'sim-readout', html: 'Drag charges to move them. Click on empty space to add a charge.' });
    root.appendChild(readout);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    btnRow.appendChild(makeBtn('Reset', () => {
      charges = [{ x: 250, y: 210, q: +1 }, { x: 450, y: 210, q: -1 }];
      draw();
    }, true));
    root.appendChild(btnRow);

    function fieldAt(px, py) {
      let ex = 0, ey = 0;
      charges.forEach(c => {
        const dx = px - c.x, dy = py - c.y;
        const r2 = dx * dx + dy * dy + 100;
        const r = Math.sqrt(r2);
        const mag = c.q * 8000 / r2;
        ex += mag * dx / r;
        ey += mag * dy / r;
      });
      return { ex, ey };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#f4f8fb';
      ctx.fillRect(0, 0, W, H);

      if (mode === 'field') {
        const step = 22;
        for (let x = step / 2; x < W; x += step) {
          for (let y = step / 2; y < H; y += step) {
            const { ex, ey } = fieldAt(x, y);
            const mag = Math.sqrt(ex * ex + ey * ey);
            if (mag < 0.01) continue;
            const len = Math.min(12, 4 + Math.log(1 + mag) * 2.5);
            const ux = ex / mag, uy = ey / mag;
            ctx.strokeStyle = `rgba(60,120,170,${Math.min(0.8, 0.15 + mag * 0.02)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + ux * len, y + uy * len);
            ctx.stroke();
            // arrowhead
            const ax = x + ux * len, ay = y + uy * len;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - ux * 4 - uy * 2.5, ay - uy * 4 + ux * 2.5);
            ctx.lineTo(ax - ux * 4 + uy * 2.5, ay - uy * 4 - ux * 2.5);
            ctx.closePath();
            ctx.fillStyle = `rgba(60,120,170,${Math.min(0.8, 0.15 + mag * 0.02)})`;
            ctx.fill();
          }
        }
      } else {
        // Field lines: trace from each positive charge
        ctx.strokeStyle = 'rgba(60,120,170,0.6)';
        ctx.lineWidth = 1.2;
        charges.forEach(c => {
          if (c.q <= 0) return;
          const n = 16;
          for (let i = 0; i < n; i++) {
            const angle = (i / n) * Math.PI * 2;
            let x = c.x + Math.cos(angle) * 6;
            let y = c.y + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let s = 0; s < 400; s++) {
              const { ex, ey } = fieldAt(x, y);
              const mag = Math.sqrt(ex * ex + ey * ey);
              if (mag < 0.001) break;
              x += (ex / mag) * 3;
              y += (ey / mag) * 3;
              ctx.lineTo(x, y);
              if (x < -50 || x > W + 50 || y < -50 || y > H + 50) break;
              // check if near negative charge
              let hit = false;
              charges.forEach(cc => {
                if (cc.q < 0 && Math.hypot(x - cc.x, y - cc.y) < 8) hit = true;
              });
              if (hit) break;
            }
            ctx.stroke();
          }
        });
      }

      // draw charges
      charges.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = c.q > 0 ? '#e74c3c' : '#3498db';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.q > 0 ? '+' : '−', c.x, c.y + 1);
      });
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function onDown(e) {
      e.preventDefault();
      const { x, y } = getPos(e);
      // find charge under cursor
      for (const c of charges) {
        if (Math.hypot(x - c.x, y - c.y) < 20) {
          dragging = c;
          return;
        }
      }
      // add new charge: alternate sign based on last
      const q = charges.length ? -charges[charges.length - 1].q : +1;
      charges.push({ x, y, q });
      draw();
    }
    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      dragging.x = Math.max(15, Math.min(W - 15, x));
      dragging.y = Math.max(15, Math.min(H - 15, y));
      draw();
    }
    function onUp() { dragging = null; }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    cleanupFns.push(() => {
      window.removeEventListener('mouseup', onUp);
    });

    draw();
    return () => cleanupFns.forEach(fn => fn());
  }

  // ============================================================
  // 2. CHEMISTRY — Acid-Base Titration
  // ============================================================
  function buildTitration(root) {
    const W = 700, H = 320;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let acidStrength = 'strong'; // 'strong' | 'weak'
    let addedVolume = 0;
    const maxVolume = 50;

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Base added (mL)', 0, maxVolume, 0.5, 0, v => {
      addedVolume = v;
      draw();
    }));
    root.appendChild(controls);

    const toggleRow = el('div', { className: 'sim-toggles', style: { marginTop: '1rem' } });
    ['Strong Acid', 'Weak Acid'].forEach((label, i) => {
      const btn = el('button', {
        className: 'sim-toggle' + (i === 0 ? ' active' : ''),
        text: label,
      });
      btn.addEventListener('click', () => {
        toggleRow.querySelectorAll('.sim-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        acidStrength = i === 0 ? 'strong' : 'weak';
        draw();
      });
      toggleRow.appendChild(btn);
    });
    root.appendChild(toggleRow);

    function computePH(v) {
      // simplified model: strong acid fully dissociates, weak acid partial
      const Ca = 0.1, Cb = 0.1;
      const Va = 25;
      const total = Va + v;
      if (v < Va) {
        const remaining = Ca * Va - Cb * v;
        const conc = remaining / total;
        return -Math.log10(conc);
      } else if (v === Va) {
        return acidStrength === 'strong' ? 7.0 : 8.5;
      } else {
        const excess = Cb * v - Ca * Va;
        const conc = excess / total;
        return 14 + Math.log10(conc);
      }
    }

    function computeWeakPH(v) {
      // weak acid: Ka = 1.8e-5
      const Ka = 1.8e-5, Ca = 0.1, Cb = 0.1, Va = 25;
      const total = Va + v;
      if (v === 0) {
        const x = Math.sqrt(Ka * Ca);
        return -Math.log10(x);
      }
      if (v < Va) {
        // buffer region: Henderson–Hasselbalch
        const acidMoles = Ca * Va - Cb * v;
        const baseMoles = Cb * v;
        if (baseMoles < 1e-9) return -Math.log10(Math.sqrt(Ka * Ca));
        return 4.74 + Math.log10(baseMoles / acidMoles);
      } else if (v === Va) {
        // equivalence: salt of weak acid
        const saltConc = Ca * Va / total;
        const Kb = 1e-14 / Ka;
        const x = Math.sqrt(Kb * saltConc);
        return 14 + Math.log10(x);
      } else {
        const excess = Cb * v - Ca * Va;
        const conc = excess / total;
        return 14 + Math.log10(conc);
      }
    }

    function currentPH(v) {
      return acidStrength === 'strong' ? computePH(v) : computeWeakPH(v);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fbfdff';
      ctx.fillRect(0, 0, W, H);

      const pad = { l: 50, r: 20, t: 20, b: 40 };
      const gw = W - pad.l - pad.r;
      const gh = H - pad.t - pad.b;

      // grid
      ctx.strokeStyle = '#e4eef7';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = pad.t + (i / 10) * gh;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      }
      for (let i = 0; i <= 5; i++) {
        const x = pad.l + (i / 5) * gw;
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      }

      // axes
      ctx.strokeStyle = '#9db8cc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, H - pad.b);
      ctx.lineTo(W - pad.r, H - pad.b);
      ctx.stroke();

      // labels
      ctx.fillStyle = '#3a5b70';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      for (let p = 0; p <= 14; p += 2) {
        const y = pad.t + (1 - p / 14) * gh;
        ctx.fillText(p.toString(), pad.l - 8, y + 4);
      }
      ctx.textAlign = 'center';
      for (let v = 0; v <= maxVolume; v += 10) {
        const x = pad.l + (v / maxVolume) * gw;
        ctx.fillText(v.toString(), x, H - pad.b + 18);
      }
      ctx.save();
      ctx.translate(15, H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1b4a6b';
      ctx.font = '600 12px sans-serif';
      ctx.fillText('pH', 0, 0);
      ctx.restore();
      ctx.fillStyle = '#1b4a6b';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Volume of base (mL)', W / 2, H - 6);

      // curve
      ctx.strokeStyle = '#2c7aa0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const v = (i / steps) * maxVolume;
        const ph = currentPH(v);
        const x = pad.l + (v / maxVolume) * gw;
        const y = pad.t + (1 - Math.max(0, Math.min(14, ph)) / 14) * gh;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // current marker
      const cph = currentPH(addedVolume);
      const cx = pad.l + (addedVolume / maxVolume) * gw;
      const cy = pad.t + (1 - Math.max(0, Math.min(14, cph)) / 14) * gh;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // equivalence marker
      const eqPH = currentPH(25);
      const eqx = pad.l + (25 / maxVolume) * gw;
      const eqy = pad.t + (1 - Math.max(0, Math.min(14, eqPH)) / 14) * gh;
      ctx.strokeStyle = 'rgba(39,174,96,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(eqx, pad.t);
      ctx.lineTo(eqx, H - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);

      // readout
      const indicator = cph < 6.0 ? '🔴 Methyl red (red)' :
                        cph < 7.6 ? '🟡 Bromothymol blue (greenish)' : '🔵 Phenolphthalein (pink)';
      readout.innerHTML = `
        <strong>Current pH:</strong> <span class="value">${cph.toFixed(2)}</span> &nbsp;·&nbsp;
        <strong>Volume:</strong> <span class="value">${addedVolume.toFixed(1)} mL</span><br>
        <strong>Acid type:</strong> ${acidStrength === 'strong' ? 'Strong (HCl)' : 'Weak (CH₃COOH)'} &nbsp;·&nbsp;
        <strong>Indicator:</strong> ${indicator}
      `;
    }

    draw();
    return () => {};
  }

  // ============================================================
  // 3. BIOLOGY — DNA Transcription & Translation
  // ============================================================
  function buildDNA(root) {
    let dna = 'ATGCGATCGATCGGCTAGCTAGCTAGCTAGC';
    let position = 0;

    const display = el('div', { className: 'dna-display' });
    root.appendChild(display);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const inputRow = el('div', { className: 'sim-controls' });
    const inputGroup = el('div', { className: 'sim-control-group', style: { flex: '2' } });
    inputGroup.appendChild(el('label', { text: 'DNA Template Strand (5\' → 3\')' }));
    const dnaInput = el('input', {
      type: 'text',
      value: dna,
      style: {
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        border: '1px solid #cfdde9',
        fontSize: '0.95rem',
        fontFamily: 'Courier New, monospace',
        letterSpacing: '0.1em',
      },
    });
    dnaInput.addEventListener('input', () => {
      dna = dnaInput.value.toUpperCase().replace(/[^ATGC]/g, '');
      dnaInput.value = dna;
      position = 0;
      render();
    });
    inputGroup.appendChild(dnaInput);
    inputRow.appendChild(inputGroup);
    root.appendChild(inputRow);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    btnRow.appendChild(makeBtn('▶ Transcribe', () => {
      if (position >= dna.length) return;
      position = Math.min(dna.length, position + 1);
      render();
    }));
    btnRow.appendChild(makeBtn('▶▶ All', () => {
      position = dna.length;
      render();
    }, true));
    btnRow.appendChild(makeBtn('↺ Reset', () => {
      position = 0;
      render();
    }, true));
    root.appendChild(btnRow);

    const codonMap = {
      'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
      'CUU': 'Leu', 'CUC': 'Leu', 'CUA': 'Leu', 'CUG': 'Leu',
      'AUU': 'Ile', 'AUC': 'Ile', 'AUA': 'Ile', 'AUG': 'Met (Start)',
      'GUU': 'Val', 'GUC': 'Val', 'GUA': 'Val', 'GUG': 'Val',
      'UCU': 'Ser', 'UCC': 'Ser', 'UCA': 'Ser', 'UCG': 'Ser',
      'CCU': 'Pro', 'CCC': 'Pro', 'CCA': 'Pro', 'CCG': 'Pro',
      'ACU': 'Thr', 'ACC': 'Thr', 'ACA': 'Thr', 'ACG': 'Thr',
      'GCU': 'Ala', 'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala',
      'UAU': 'Tyr', 'UAC': 'Tyr', 'UAA': 'Stop', 'UAG': 'Stop',
      'CAU': 'His', 'CAC': 'His', 'CAA': 'Gln', 'CAG': 'Gln',
      'AAU': 'Asn', 'AAC': 'Asn', 'AAA': 'Lys', 'AAG': 'Lys',
      'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
      'UGU': 'Cys', 'UGC': 'Cys', 'UGA': 'Stop', 'UGG': 'Trp',
      'CGU': 'Arg', 'CGC': 'Arg', 'CGA': 'Arg', 'CGG': 'Arg',
      'AGU': 'Ser', 'AGC': 'Ser', 'AGA': 'Arg', 'AGG': 'Arg',
      'GGU': 'Gly', 'GGC': 'Gly', 'GGA': 'Gly', 'GGG': 'Gly',
    };

    function render() {
      // Build DNA display
      const displayed = dna.split('').map((base, i) => {
        const active = i < position ? ' style="opacity:1"' : ' style="opacity:0.35"';
        return `<span class="base base-${base}"${active}>${base}</span>`;
      }).join('');
      display.innerHTML = displayed;

      // Build mRNA (complement: A→U, T→A, G→C, C→G)
      const mrna = dna.split('').map(b => {
        if (b === 'A') return 'U';
        if (b === 'T') return 'A';
        if (b === 'G') return 'C';
        if (b === 'C') return 'G';
        return '';
      }).join('');

      const transcribed = mrna.slice(0, position);
      const mrnaDisplay = mrna.split('').map((base, i) => {
        const active = i < position ? ' style="opacity:1"' : ' style="opacity:0.35"';
        return `<span class="base base-${base}"${active}>${base}</span>`;
      }).join('');

      // Translate
      let protein = '';
      for (let i = 0; i + 3 <= transcribed.length; i += 3) {
        const codon = transcribed.slice(i, i + 3);
        const aa = codonMap[codon] || '?';
        protein += aa + ' · ';
        if (aa === 'Stop') break;
      }
      if (!protein) protein = '(no complete codons yet)';

      readout.innerHTML = `
        <strong>DNA:</strong> ${dna.length} bases &nbsp;·&nbsp;
        <strong>Position:</strong> <span class="value">${position}</span> / ${dna.length}<br>
        <strong>mRNA:</strong><br>
        <div style="font-family:'Courier New',monospace;letter-spacing:0.15em;margin:0.5rem 0;">${mrnaDisplay || '(empty)'}</div>
        <strong>Protein:</strong> ${protein}
      `;
    }

    render();
    return () => {};
  }

  // ============================================================
  // 4. EARTH & SPACE — Moon Phases
  // ============================================================
  function buildMoonPhases(root) {
    const W = 700, H = 420;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let angle = 0; // 0 = new moon
    let dragging = false;

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Orbit angle (°)', 0, 360, 1, 0, v => {
      angle = v * Math.PI / 180;
      draw();
    }));
    root.appendChild(controls);

    function getPhaseName(a) {
      // normalize
      let deg = ((a * 180 / Math.PI) % 360 + 360) % 360;
      if (deg < 22.5 || deg >= 337.5) return 'New Moon';
      if (deg < 67.5) return 'Waxing Crescent';
      if (deg < 112.5) return 'First Quarter';
      if (deg < 157.5) return 'Waxing Gibbous';
      if (deg < 202.5) return 'Full Moon';
      if (deg < 247.5) return 'Waning Gibbous';
      if (deg < 292.5) return 'Last Quarter';
      return 'Waning Crescent';
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a1a2a';
      ctx.fillRect(0, 0, W, H);

      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 80; i++) {
        const x = (i * 97) % W;
        const y = (i * 53) % H;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Sun direction (from left)
      const sunX = 40;
      const sunY = H / 2;
      // Sun glow
      const grad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80);
      grad.addColorStop(0, 'rgba(255,220,120,0.9)');
      grad.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdc78';
      ctx.fill();
      ctx.fillStyle = '#0a1a2a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUN', sunX, sunY + 4);

      // Earth at center
      const earthX = W / 2 + 80;
      const earthY = H / 2;
      ctx.beginPath();
      ctx.arc(earthX, earthY, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#2a6fa8';
      ctx.fill();
      ctx.strokeStyle = '#5ba3d0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // continent hints
      ctx.fillStyle = '#3fa86a';
      ctx.beginPath();
      ctx.arc(earthX - 8, earthY - 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(earthX + 6, earthY + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', earthX, earthY + 44);

      // Moon orbit
      const orbitR = 120;
      const moonX = earthX + Math.cos(angle) * orbitR;
      const moonY = earthY + Math.sin(angle) * orbitR;

      // Orbit path
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(earthX, earthY, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moon - illuminated side faces sun (left)
      // Compute phase: 0 = new moon (moon between earth and sun)
      // Sun is to the LEFT of earth.
      // At angle = 180° (π), moon is on the LEFT of earth → toward sun → new moon.
      // At angle = 0°, moon is on RIGHT of earth → away from sun → full moon.
      // Redefine: we want angle=0 → new moon.
      // So orbit angle = π means new moon in standard math coords.
      // Let's just use: phase = angle - π (so 0 = new moon).

      const phase = angle - Math.PI;

      // Moon position uses original angle but let's offset so angle=0 is new moon (between sun and earth)
      // Sun is at left. "Between" means moon at angle = π (left of earth). So moonX = earthX + cos(π)*R
      // To make angle=0 correspond to new moon, we use effective angle = angle + π.
      const effAngle = angle + Math.PI;
      const mx = earthX + Math.cos(effAngle) * orbitR;
      const my = earthY + Math.sin(effAngle) * orbitR;

      // Draw moon base (dark)
      ctx.beginPath();
      ctx.arc(mx, my, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#3a3a4a';
      ctx.fill();

      // Illuminated portion: light comes from left (sun direction).
      // We'll draw a clipped circle representing the lit half (facing sun)
      // and then clip to moon.
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, 16, 0, Math.PI * 2);
      ctx.clip();
      // Lit side is toward sun (left). Draw a half-plane.
      ctx.fillStyle = '#e8e8f0';
      // The lit side faces the sun. Sun is to the left.
      // The terminator is a line through moon perpendicular to sun direction.
      // Sun direction from moon = (sunX - mx, sunY - my) normalized.
      const dx = sunX - mx;
      const dy = sunY - my;
      const dlen = Math.hypot(dx, dy);
      const ux = dx / dlen, uy = dy / dlen;
      // Lit half: points where dot((p - moon), u) > 0
      // Draw a large rectangle rotated to cover the lit half
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.fillRect(0, -30, 60, 60);
      ctx.restore();

      // moon outline
      ctx.beginPath();
      ctx.arc(mx, my, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Moon label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MOON', mx, my - 24);

      // View from Earth (bottom right corner)
      const viewX = W - 110;
      const viewY = 90;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(viewX, viewY, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render moon as seen from earth
      ctx.save();
      ctx.beginPath();
      ctx.arc(viewX, viewY, 30, 0, Math.PI * 2);
      ctx.clip();
      // base dark
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(viewX - 30, viewY - 30, 60, 60);
      // lit portion
      ctx.fillStyle = '#e8e8f0';
      // phase angle: 0 = new moon (fully dark), π = full moon (fully lit)
      // We draw lit using a combination: the "k" term (cos of phase angle from new).
      // Standard: lit fraction = (1 - cos(phase))/2 where phase 0 = new.
      // Actually for a top-down view: at new moon, moon between earth and sun → dark side faces us.
      // At full moon, earth between sun and moon → lit side faces us.
      // So we need to render based on phase.
      // Compute phase angle φ where φ=0 is new moon (moon between sun & earth).
      // The terminator on the visible disk is an ellipse whose width = 2R * |cos(φ)|.
      // Which side is lit: 
      //   φ in (0, π): waxing → right side lit
      //   φ in (π, 2π): waning → left side lit
      const φ = effAngle - Math.PI; // 0 when effAngle = π (moon at left = new moon)

      // Normalize φ to [0, 2π)
      let phaseAngle = ((φ % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      const R = 30;
      const k = Math.cos(phaseAngle); // +1 at new, -1 at full (careful: our φ=0 is new)
      // Actually at phaseAngle=0 (new), lit fraction = 0.
      // At phaseAngle=π (full), lit fraction = 1.
      // The half-width of the terminator ellipse = R * |k| where k = -cos(phaseAngle).
      // Hmm, let's just do it visually:
      // If phaseAngle < π: waxing, right side lit
      // Else: waning, left side lit

      // Simpler approach: draw lit region as a path
      ctx.fillStyle = '#e8e8f0';
      if (phaseAngle < 0.02 || phaseAngle > 2 * Math.PI - 0.02) {
        // new moon - nothing lit
      } else if (Math.abs(phaseAngle - Math.PI) < 0.02) {
        // full moon
        ctx.beginPath();
        ctx.arc(viewX, viewY, R, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // partial: draw a half-circle plus/minus a half-ellipse
        const waxing = phaseAngle < Math.PI;
        // lit fraction
        const litFrac = (1 - Math.cos(phaseAngle)) / 2;
        const ellipseHalfWidth = R * Math.abs(Math.cos(phaseAngle));

        ctx.beginPath();
        if (waxing) {
          // right half lit
          ctx.arc(viewX, viewY, R, -Math.PI / 2, Math.PI / 2);
        } else {
          // left half lit
          ctx.arc(viewX, viewY, R, Math.PI / 2, -Math.PI / 2);
        }
        // Now add the terminator ellipse
        if (litFrac > 0.5) {
          // gibbous: ellipse extends beyond the half circle
          ctx.ellipse(viewX, viewY, ellipseHalfWidth, R, 0, 0, Math.PI * 2);
        } else {
          // crescent: subtract the ellipse
          ctx.ellipse(viewX, viewY, ellipseHalfWidth, R, 0, 0, Math.PI * 2, true);
        }
        ctx.fill();
      }
      ctx.restore();

      // moon outline for the earth-view
      ctx.beginPath();
      ctx.arc(viewX, viewY, 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('View from Earth', viewX, viewY + 50);

      // Update readout
      const phaseName = getPhaseName(effAngle - Math.PI);
      const litPercent = Math.round(((1 - Math.cos(phaseAngle)) / 2) * 100);
      readout.innerHTML = `
        <strong>Phase:</strong> ${phaseName} &nbsp;·&nbsp;
        <strong>Illuminated:</strong> <span class="value">${litPercent}%</span><br>
        <span style="font-size:0.85rem;">Drag the Moon in the orbit, or use the slider. The lit side always faces the Sun.</span>
      `;
    }

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    const earthX = W / 2 + 80;
    const earthY = H / 2;
    const orbitR = 120;

    function onDown(e) {
      e.preventDefault();
      dragging = true;
      onMove(e);
    }
    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      const dx = x - earthX;
      const dy = y - earthY;
      let newAngle = Math.atan2(dy, dx);
      // Convert to our angle convention where angle=0 → new moon
      // new moon means effAngle = π, i.e., angle + π = π → angle = 0
      // So our angle should equal effAngle - π
      // We'll store angle as effAngle - π
      angle = newAngle - Math.PI;
      // normalize to [0, 2π)
      angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      // update slider (find it)
      const slider = root.querySelector('input[type="range"]');
      if (slider) {
        slider.value = Math.round(angle * 180 / Math.PI);
        const valSpan = root.querySelector('.range-value');
        if (valSpan) valSpan.textContent = slider.value;
      }
      draw();
    }
    function onUp() { dragging = false; }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    draw();
    return () => {
      window.removeEventListener('mouseup', onUp);
    };
  }

  // ============================================================
  // 5. COMPUTER SCIENCE — Logic Gates & Circuits
  // ============================================================
  function buildLogicGates(root) {
    let inputA = false;
    let inputB = false;
    let gateType = 'AND';

    const toggles = el('div', { className: 'sim-toggles' });
    ['AND', 'OR', 'XOR', 'NAND', 'NOR'].forEach(type => {
      const btn = el('button', {
        className: 'sim-toggle' + (type === gateType ? ' active' : ''),
        text: type,
      });
      btn.addEventListener('click', () => {
        toggles.querySelectorAll('.sim-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gateType = type;
        render();
      });
      toggles.appendChild(btn);
    });
    root.appendChild(toggles);

    const circuitDiv = el('div');
    root.appendChild(circuitDiv);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const truthDiv = el('div');
    root.appendChild(truthDiv);

    function computeGate(a, b, type) {
      switch (type) {
        case 'AND': return a && b;
        case 'OR': return a || b;
        case 'XOR': return a !== b;
        case 'NAND': return !(a && b);
        case 'NOR': return !(a || b);
      }
    }

    function render() {
      const output = computeGate(inputA, inputB, gateType);

      // Circuit diagram
      circuitDiv.innerHTML = '';
      const grid = el('div', { className: 'logic-grid' });

      const inputA_node = el('div', {
        className: 'logic-node' + (inputA ? ' active' : ''),
        text: 'A',
      });
      inputA_node.addEventListener('click', () => {
        inputA = !inputA;
        render();
      });

      const wireA = el('div', { style: { height: '3px', background: inputA ? '#27ae60' : '#cfdde9', width: '40px' } });

      const gate = el('div', { className: 'logic-node gate', text: gateType });

      const wireB = el('div', { style: { height: '3px', background: inputB ? '#27ae60' : '#cfdde9', width: '40px' } });

      const inputB_node = el('div', {
        className: 'logic-node' + (inputB ? ' active' : ''),
        text: 'B',
      });
      inputB_node.addEventListener('click', () => {
        inputB = !inputB;
        render();
      });

      // Use a simpler layout: A wire gate wire B, then output wire below
      // We'll use a flex column approach for clarity
      const topRow = el('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '1rem 0',
          flexWrap: 'wrap',
        },
      });
      topRow.appendChild(inputA_node);
      topRow.appendChild(wireA);
      topRow.appendChild(gate);
      topRow.appendChild(wireB);
      topRow.appendChild(inputB_node);

      const outRow = el('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0 1rem',
        },
      });
      const outWire = el('div', { style: { height: '3px', background: output ? '#27ae60' : '#cfdde9', width: '40px' } });
      const outNode = el('div', {
        className: 'logic-node' + (output ? ' active' : ''),
        text: 'OUT',
        style: { fontSize: '0.8rem' },
      });
      outRow.appendChild(el('div', { style: { width: '60px' } })); // spacer
      outRow.appendChild(outWire);
      outRow.appendChild(outNode);

      circuitDiv.appendChild(topRow);
      circuitDiv.appendChild(outRow);

      // Readout
      readout.innerHTML = `
        <strong>Gate:</strong> <span class="value">${gateType}</span> &nbsp;·&nbsp;
        <strong>A:</strong> <span class="value">${inputA ? 'TRUE' : 'FALSE'}</span> &nbsp;·&nbsp;
        <strong>B:</strong> <span class="value">${inputB ? 'TRUE' : 'FALSE'}</span> &nbsp;·&nbsp;
        <strong>Output:</strong> <span class="value">${output ? 'TRUE' : 'FALSE'}</span>
      `;

      // Truth table
      truthDiv.innerHTML = '';
      const table = el('table', { className: 'truth-table' });
      const thead = el('thead');
      const hr = el('tr');
      ['A', 'B', 'Output'].forEach(h => hr.appendChild(el('th', { text: h })));
      thead.appendChild(hr);
      table.appendChild(thead);
      const tbody = el('tbody');
      [[false, false], [false, true], [true, false], [true, true]].forEach(([a, b]) => {
        const out = computeGate(a, b, gateType);
        const tr = el('tr', {
          className: (a === inputA && b === inputB) ? 'highlight' : '',
        });
        tr.appendChild(el('td', { text: a ? '1' : '0' }));
        tr.appendChild(el('td', { text: b ? '1' : '0' }));
        tr.appendChild(el('td', { text: out ? '1' : '0' }));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      truthDiv.appendChild(table);
    }

    render();
    return () => {};
  }

  // ============================================================
  // 6. DATA SCIENCE — Bayes' Theorem
  // ============================================================
  function buildBayes(root) {
    let prevalence = 1;   // percent
    let sensitivity = 99; // percent
    let specificity = 95; // percent

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Prevalence (%)', 0.01, 20, 0.01, prevalence, v => {
      prevalence = v;
      render();
    }));
    controls.appendChild(makeControl('Sensitivity (%)', 50, 100, 1, sensitivity, v => {
      sensitivity = v;
      render();
    }));
    controls.appendChild(makeControl('Specificity (%)', 50, 100, 1, specificity, v => {
      specificity = v;
      render();
    }));
    root.appendChild(controls);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const vizDiv = el('div', {
      style: {
        marginTop: '1.2rem',
        display: 'flex',
        justifyContent: 'center',
      },
    });
    root.appendChild(vizDiv);

    function render() {
      const p = prevalence / 100;
      const sens = sensitivity / 100;
      const spec = specificity / 100;

      const pDisease = p;
      const pHealthy = 1 - p;

      const truePos = pDisease * sens;
      const falseNeg = pDisease * (1 - sens);
      const falsePos = pHealthy * (1 - spec);
      const trueNeg = pHealthy * spec;

      const pPositive = truePos + falsePos;
      const posterior = pPositive > 0 ? truePos / pPositive : 0;

      readout.innerHTML = `
        <strong>Posterior probability (has disease given positive test):</strong>
        <span class="value">${(posterior * 100).toFixed(2)}%</span><br>
        <span style="font-size:0.85rem;">
          Out of <strong>${(pPositive * 1000).toFixed(1)}</strong> positive results per 1000 people,
          only <strong>${(truePos * 1000).toFixed(1)}</strong> actually have the disease —
          the rest are false positives.
        </span>
      `;

      // Visual: 1000 dots
      vizDiv.innerHTML = '';
      const total = 1000;
      const truePosN = Math.round(truePos * total);
      const falseNegN = Math.round(falseNeg * total);
      const falsePosN = Math.round(falsePos * total);
      const trueNegN = total - truePosN - falseNegN - falsePosN;

      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 500 260');
      svg.setAttribute('width', '100%');
      svg.setAttribute('style', 'max-width:500px');

      const cols = 50;
      const dotSize = 8;
      const gap = 1.5;
      const startX = 5;
      const startY = 5;

      const groups = [
        { n: truePosN, color: '#e74c3c', label: 'True Positive' },
        { n: falseNegN, color: '#f39c12', label: 'False Negative' },
        { n: falsePosN, color: '#f1c40f', label: 'False Positive' },
        { n: trueNegN, color: '#95a5a6', label: 'True Negative' },
      ];

      let idx = 0;
      groups.forEach(g => {
        for (let i = 0; i < g.n; i++) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          if (row >= 20) break;
          const cx = startX + col * (dotSize + gap) + dotSize / 2;
          const cy = startY + row * (dotSize + gap) + dotSize / 2;
          const circle = document.createElementNS(svgNS, 'circle');
          circle.setAttribute('cx', cx);
          circle.setAttribute('cy', cy);
          circle.setAttribute('r', dotSize / 2);
          circle.setAttribute('fill', g.color);
          svg.appendChild(circle);
          idx++;
        }
      });

      vizDiv.appendChild(svg);

      // Legend
      const legend = el('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '0.8rem',
          fontSize: '0.82rem',
        },
      });
      [
        { color: '#e74c3c', label: `True Positive (${truePosN})` },
        { color: '#f39c12', label: `False Negative (${falseNegN})` },
        { color: '#f1c40f', label: `False Positive (${falsePosN})` },
        { color: '#95a5a6', label: `True Negative (${trueNegN})` },
      ].forEach(item => {
        const span = el('span', {
          style: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
        });
        const swatch = el('span', {
          style: {
            width: '12px',
            height: '12px',
            background: item.color,
            borderRadius: '3px',
            display: 'inline-block',
          },
        });
        span.appendChild(swatch);
        span.appendChild(document.createTextNode(item.label));
        legend.appendChild(span);
      });
      vizDiv.appendChild(legend);
    }

    render();
    return () => {};
  }

  // ============================================================
  // 7. SOCIAL SCIENCE — Schelling's Segregation Model
  // ============================================================
  function buildSchelling(root) {
    const N = 40;
    const cellSize = 14;
    const W = N * cellSize, H = N * cellSize;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let grid = [];
    let threshold = 30; // percent
    let running = false;
    let interval = null;
    let stepCount = 0;

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Tolerance threshold (%)', 10, 70, 1, threshold, v => {
      threshold = v;
    }));
    root.appendChild(controls);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    const playBtn = makeBtn('▶ Play', () => {
      if (running) {
        running = false;
        clearInterval(interval);
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
      } else {
        running = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        interval = setInterval(step, 200);
      }
    });
    btnRow.appendChild(playBtn);
    btnRow.appendChild(makeBtn('↺ Reset', () => {
      running = false;
      clearInterval(interval);
      playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
      initGrid();
    }, true));
    root.appendChild(btnRow);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    function initGrid() {
      grid = [];
      for (let y = 0; y < N; y++) {
        const row = [];
        for (let x = 0; x < N; x++) {
          const r = Math.random();
          row.push(r < 0.45 ? 1 : r < 0.9 ? 2 : 0); // 1 = red, 2 = blue, 0 = empty
        }
        grid.push(row);
      }
      stepCount = 0;
      draw();
    }

    function countSimilar(x, y, type) {
      let similar = 0, total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
          if (grid[ny][nx] === 0) continue;
          total++;
          if (grid[ny][nx] === type) similar++;
        }
      }
      return { similar, total };
    }

    function step() {
      let moved = 0;
      const unhappy = [];
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const t = grid[y][x];
          if (t === 0) continue;
          const { similar, total } = countSimilar(x, y, t);
          if (total > 0 && (similar / total) * 100 < threshold) {
            unhappy.push({ x, y, type: t });
          }
        }
      }
      // Move unhappy agents to random empty cells
      unhappy.forEach(({ x, y }) => {
        // Find empty cell
        let attempts = 0;
        while (attempts < 50) {
          const nx = Math.floor(Math.random() * N);
          const ny = Math.floor(Math.random() * N);
          if (grid[ny][nx] === 0) {
            grid[ny][nx] = grid[y][x];
            grid[y][x] = 0;
            moved++;
            break;
          }
          attempts++;
        }
      });
      stepCount++;
      draw();
      if (moved === 0) {
        running = false;
        clearInterval(interval);
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
      }
    }

    function draw() {
      // Count segregation
      let sameNeighborPairs = 0, totalNeighborPairs = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const t = grid[y][x];
          if (t === 0) continue;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (dx === 1 && dy === 0) continue; // only count right+down to avoid double
              if (dx === 0 && dy === 1) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
              if (grid[ny][nx] === 0) continue;
              totalNeighborPairs++;
              if (grid[ny][nx] === t) sameNeighborPairs++;
            }
          }
        }
      }
      const segIndex = totalNeighborPairs > 0 ? (sameNeighborPairs / totalNeighborPairs) * 100 : 0;

      // Draw
      ctx.fillStyle = '#f4f8fb';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const t = grid[y][x];
          if (t === 0) continue;
          ctx.fillStyle = t === 1 ? '#e74c3c' : '#3498db';
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }

      readout.innerHTML = `
        <strong>Step:</strong> <span class="value">${stepCount}</span> &nbsp;·&nbsp;
        <strong>Segregation index:</strong> <span class="value">${segIndex.toFixed(1)}%</span><br>
        <span style="font-size:0.85rem;">
          Agents only require <strong>${threshold}%</strong> of neighbors to be similar to be happy.
          Watch how individual tolerance produces large-scale segregation.
        </span>
      `;
    }

    initGrid();
    return () => {
      if (interval) clearInterval(interval);
    };
  }

    // ============================================================
  // 8. PHYSICS — Projectile Motion
  // ============================================================
  function buildProjectile(root) {
    const W = 700, H = 380;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let speed = 25;   // m/s
    let angleDeg = 45;
    let gravity = 9.81;
    let showTrail = true;
    let flying = false;
    let t = 0;
    let trail = [];
    let interval = null;

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Initial speed (m/s)', 5, 50, 1, speed, v => { speed = v; reset(); }));
    controls.appendChild(makeControl('Angle (°)', 5, 85, 1, angleDeg, v => { angleDeg = v; reset(); }));
    controls.appendChild(makeControl('Gravity (m/s²)', 1, 25, 0.1, gravity, v => { gravity = v; reset(); }));
    root.appendChild(controls);

    const toggles = el('div', { className: 'sim-toggles', style: { marginTop: '1rem' } });
    const trailBtn = el('button', { className: 'sim-toggle active', text: 'Show trail' });
    trailBtn.addEventListener('click', () => {
      showTrail = !showTrail;
      trailBtn.classList.toggle('active', showTrail);
      draw();
    });
    toggles.appendChild(trailBtn);
    root.appendChild(toggles);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    const fireBtn = makeBtn('🔥 Fire', fire);
    btnRow.appendChild(fireBtn);
    btnRow.appendChild(makeBtn('↺ Reset', reset, true));
    root.appendChild(btnRow);

    // Physics: world units -> pixels. Scale so ~120m fits in W
    const SCALE = 5.5;
    const groundY = H - 30;
    const originX = 40;

    function reset() {
      flying = false;
      t = 0;
      trail = [];
      if (interval) { clearInterval(interval); interval = null; }
      fireBtn.innerHTML = '🔥 Fire';
      draw();
    }

    function fire() {
      if (flying) return;
      reset();
      flying = true;
      fireBtn.innerHTML = '✈ Flying...';
      const vx0 = speed * Math.cos(angleDeg * Math.PI / 180);
      const vy0 = speed * Math.sin(angleDeg * Math.PI / 180);
      const dt = 0.02;
      interval = setInterval(() => {
        t += dt;
        const x = vx0 * t;
        const y = vy0 * t - 0.5 * gravity * t * t;
        trail.push({ x, y });
        if (y <= 0 && t > 0.05) {
          flying = false;
          clearInterval(interval);
          interval = null;
          fireBtn.innerHTML = '🔥 Fire';
        }
        draw();
      }, 16);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#cfe8f8');
      sky.addColorStop(1, '#eef7fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.fillStyle = '#7fb77e';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = '#5a9b58';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // Grid lines (every 10 m)
      ctx.strokeStyle = 'rgba(60,120,170,0.15)';
      ctx.setLineDash([3, 4]);
      for (let m = 0; m <= 120; m += 10) {
        const px = originX + m * SCALE;
        if (px > W) break;
        ctx.beginPath();
        ctx.moveTo(px, 10);
        ctx.lineTo(px, groundY);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Trail
      if (showTrail && trail.length > 1) {
        ctx.strokeStyle = 'rgba(231,76,60,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        trail.forEach((p, i) => {
          const px = originX + p.x * SCALE;
          const py = groundY - p.y * SCALE;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Projectile
      let cur = trail[trail.length - 1];
      if (!cur) cur = { x: 0, y: 0 };
      const px = originX + cur.x * SCALE;
      const py = groundY - cur.y * SCALE;

      // Cannon
      ctx.save();
      ctx.translate(originX, groundY);
      ctx.rotate(-angleDeg * Math.PI / 180);
      ctx.fillStyle = '#3a5b70';
      ctx.fillRect(0, -6, 32, 12);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(originX, groundY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#2c3e50';
      ctx.fill();

      // Projectile ball
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Readout
      const vx0 = speed * Math.cos(angleDeg * Math.PI / 180);
      const vy0 = speed * Math.sin(angleDeg * Math.PI / 180);
      const range = (vx0 * (vy0 + Math.sqrt(vy0 * vy0 + 2 * gravity * 0)) / gravity);
      const maxHeight = (vy0 * vy0) / (2 * gravity);
      const flightTime = 2 * vy0 / gravity;
      readout.innerHTML = `
        <strong>Time:</strong> <span class="value">${t.toFixed(2)} s</span> &nbsp;·&nbsp;
        <strong>Position:</strong> <span class="value">(${cur.x.toFixed(1)}, ${Math.max(0, cur.y).toFixed(1)}) m</span><br>
        <strong>Predicted range:</strong> <span class="value">${range.toFixed(1)} m</span> &nbsp;·&nbsp;
        <strong>Max height:</strong> <span class="value">${maxHeight.toFixed(1)} m</span> &nbsp;·&nbsp;
        <strong>Flight time:</strong> <span class="value">${flightTime.toFixed(2)} s</span>
      `;
    }

    draw();
    return () => { if (interval) clearInterval(interval); };
  }

  // ============================================================
  // 9. CHEMISTRY — Periodic Table Explorer
  // ============================================================
  function buildPeriodicTable(root) {
    const elements = [
      { z: 1, sym: 'H', name: 'Hydrogen', mass: 1.008, cat: 'nonmetal', group: 1, period: 1 },
      { z: 2, sym: 'He', name: 'Helium', mass: 4.003, cat: 'noble', group: 18, period: 1 },
      { z: 3, sym: 'Li', name: 'Lithium', mass: 6.94, cat: 'alkali', group: 1, period: 2 },
      { z: 4, sym: 'Be', name: 'Beryllium', mass: 9.012, cat: 'alkaline', group: 2, period: 2 },
      { z: 5, sym: 'B', name: 'Boron', mass: 10.81, cat: 'metalloid', group: 13, period: 2 },
      { z: 6, sym: 'C', name: 'Carbon', mass: 12.011, cat: 'nonmetal', group: 14, period: 2 },
      { z: 7, sym: 'N', name: 'Nitrogen', mass: 14.007, cat: 'nonmetal', group: 15, period: 2 },
      { z: 8, sym: 'O', name: 'Oxygen', mass: 15.999, cat: 'nonmetal', group: 16, period: 2 },
      { z: 9, sym: 'F', name: 'Fluorine', mass: 18.998, cat: 'halogen', group: 17, period: 2 },
      { z: 10, sym: 'Ne', name: 'Neon', mass: 20.180, cat: 'noble', group: 18, period: 2 },
      { z: 11, sym: 'Na', name: 'Sodium', mass: 22.990, cat: 'alkali', group: 1, period: 3 },
      { z: 12, sym: 'Mg', name: 'Magnesium', mass: 24.305, cat: 'alkaline', group: 2, period: 3 },
      { z: 13, sym: 'Al', name: 'Aluminium', mass: 26.982, cat: 'post', group: 13, period: 3 },
      { z: 14, sym: 'Si', name: 'Silicon', mass: 28.085, cat: 'metalloid', group: 14, period: 3 },
      { z: 15, sym: 'P', name: 'Phosphorus', mass: 30.974, cat: 'nonmetal', group: 15, period: 3 },
      { z: 16, sym: 'S', name: 'Sulfur', mass: 32.06, cat: 'nonmetal', group: 16, period: 3 },
      { z: 17, sym: 'Cl', name: 'Chlorine', mass: 35.45, cat: 'halogen', group: 17, period: 3 },
      { z: 18, sym: 'Ar', name: 'Argon', mass: 39.948, cat: 'noble', group: 18, period: 3 },
      { z: 19, sym: 'K', name: 'Potassium', mass: 39.098, cat: 'alkali', group: 1, period: 4 },
      { z: 20, sym: 'Ca', name: 'Calcium', mass: 40.078, cat: 'alkaline', group: 2, period: 4 },
      { z: 26, sym: 'Fe', name: 'Iron', mass: 55.845, cat: 'transition', group: 8, period: 4 },
      { z: 29, sym: 'Cu', name: 'Copper', mass: 63.546, cat: 'transition', group: 11, period: 4 },
      { z: 30, sym: 'Zn', name: 'Zinc', mass: 65.38, cat: 'transition', group: 12, period: 4 },
      { z: 35, sym: 'Br', name: 'Bromine', mass: 79.904, cat: 'halogen', group: 17, period: 4 },
      { z: 36, sym: 'Kr', name: 'Krypton', mass: 83.798, cat: 'noble', group: 18, period: 4 },
      { z: 47, sym: 'Ag', name: 'Silver', mass: 107.87, cat: 'transition', group: 11, period: 5 },
      { z: 53, sym: 'I', name: 'Iodine', mass: 126.90, cat: 'halogen', group: 17, period: 5 },
      { z: 54, sym: 'Xe', name: 'Xenon', mass: 131.29, cat: 'noble', group: 18, period: 5 },
      { z: 79, sym: 'Au', name: 'Gold', mass: 196.97, cat: 'transition', group: 11, period: 6 },
      { z: 80, sym: 'Hg', name: 'Mercury', mass: 200.59, cat: 'transition', group: 12, period: 6 },
      { z: 82, sym: 'Pb', name: 'Lead', mass: 207.2, cat: 'post', group: 14, period: 6 },
      { z: 92, sym: 'U', name: 'Uranium', mass: 238.03, cat: 'actinide', group: 3, period: 7 },
    ];

    const catColors = {
      alkali: '#ff9f9f',
      alkaline: '#ffc68a',
      transition: '#ffd88a',
      post: '#b8e0b8',
      metalloid: '#a0d8d8',
      nonmetal: '#a0c8ff',
      halogen: '#c8a0ff',
      noble: '#ffa0e0',
      actinide: '#ffb0b0',
    };

    const info = el('div', { className: 'sim-readout', html: 'Click an element to see its details.' });
    root.appendChild(info);

    const tableWrap = el('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(18, minmax(0, 1fr))',
        gap: '3px',
        marginTop: '1rem',
        fontSize: '0.7rem',
      },
    });

    elements.forEach(e => {
      const cell = el('div', {
        style: {
          gridColumn: e.group,
          gridRow: e.period,
          background: catColors[e.cat] || '#ddd',
          borderRadius: '5px',
          padding: '0.3rem 0.15rem',
          textAlign: 'center',
          cursor: 'pointer',
          border: '1px solid rgba(0,0,0,0.08)',
          transition: 'transform 0.1s, box-shadow 0.1s',
          minHeight: '42px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          lineHeight: 1.1,
        },
        html: `<div style="font-size:0.55rem;opacity:0.7;">${e.z}</div><div style="font-weight:700;font-size:0.85rem;">${e.sym}</div>`,
      });
      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.15)';
        cell.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
        cell.style.zIndex = '5';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        cell.style.boxShadow = 'none';
        cell.style.zIndex = '1';
      });
      cell.addEventListener('click', () => {
        info.innerHTML = `
          <strong>${e.name}</strong> (${e.sym})<br>
          <strong>Atomic number:</strong> <span class="value">${e.z}</span> &nbsp;·&nbsp;
          <strong>Atomic mass:</strong> <span class="value">${e.mass}</span> u<br>
          <strong>Category:</strong> <span class="value">${e.cat}</span> &nbsp;·&nbsp;
          <strong>Group:</strong> <span class="value">${e.group}</span> &nbsp;·&nbsp;
          <strong>Period:</strong> <span class="value">${e.period}</span>
        `;
      });
      tableWrap.appendChild(cell);
    });

    root.appendChild(tableWrap);

    // Legend
    const legend = el('div', {
      style: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem', fontSize: '0.75rem' },
    });
    Object.entries(catColors).forEach(([cat, color]) => {
      const item = el('span', { style: { display: 'flex', alignItems: 'center', gap: '0.3rem' } });
      const sw = el('span', { style: { width: '12px', height: '12px', background: color, borderRadius: '3px', display: 'inline-block' } });
      item.appendChild(sw);
      item.appendChild(document.createTextNode(cat));
      legend.appendChild(item);
    });
    root.appendChild(legend);

    return () => {};
  }

  // ============================================================
  // 10. BIOLOGY — Punnett Square / Genetics
  // ============================================================
  function buildPunnett(root) {
    let parent1 = 'Aa';
    let parent2 = 'Aa';

    const controls = el('div', { className: 'sim-controls' });
    const p1Group = el('div', { className: 'sim-control-group' });
    p1Group.appendChild(el('label', { text: 'Parent 1 genotype' }));
    const p1Input = el('input', {
      type: 'text',
      value: parent1,
      maxlength: 2,
      style: { padding: '0.5rem', borderRadius: '8px', border: '1px solid #cfdde9', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.1em', textAlign: 'center' },
    });
    p1Group.appendChild(p1Input);
    controls.appendChild(p1Group);

    const p2Group = el('div', { className: 'sim-control-group' });
    p2Group.appendChild(el('label', { text: 'Parent 2 genotype' }));
    const p2Input = el('input', {
      type: 'text',
      value: parent2,
      maxlength: 2,
      style: { padding: '0.5rem', borderRadius: '8px', border: '1px solid #cfdde9', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.1em', textAlign: 'center' },
    });
    p2Group.appendChild(p2Input);
    controls.appendChild(p2Group);
    root.appendChild(controls);

    p1Input.addEventListener('input', () => {
      parent1 = p1Input.value.replace(/[^AaBbCcDdEe]/g, '').slice(0, 2);
      p1Input.value = parent1;
      render();
    });
    p2Input.addEventListener('input', () => {
      parent2 = p2Input.value.replace(/[^AaBbCcDdEe]/g, '').slice(0, 2);
      p2Input.value = parent2;
      render();
    });

    const gridDiv = el('div', { style: { marginTop: '1.2rem', display: 'flex', justifyContent: 'center' } });
    root.appendChild(gridDiv);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    function render() {
      const a1 = parent1[0] || 'A', a2 = parent1[1] || 'a';
      const b1 = parent2[0] || 'A', b2 = parent2[1] || 'a';

      // Build cross
      const combos = [
        [a1 + b1, a1 + b2],
        [a2 + b1, a2 + b2],
      ];

      // Normalize (uppercase first letter, lowercase second)
      function norm(g) {
        const upper = g[0].toUpperCase();
        const lower = g[1].toLowerCase();
        // sort so dominant first
        const dom = upper === lower.toUpperCase() ? upper : upper;
        return [g[0].toUpperCase(), g[1].toLowerCase()].sort((x, y) => {
          if (x === x.toUpperCase() && y !== y.toUpperCase()) return -1;
          if (y === y.toUpperCase() && x !== x.toUpperCase()) return 1;
          return 0;
        }).join('');
      }

      const normalized = combos.map(row => row.map(norm));

      // Count phenotypes (dominant if at least one uppercase)
      const counts = {};
      normalized.flat().forEach(g => {
        const hasDom = g.split('').some(c => c === c.toUpperCase() && c !== c.toLowerCase());
        const key = hasDom ? 'Dominant (A_)' : 'Recessive (aa)';
        counts[key] = (counts[key] || 0) + 1;
      });

      // Render grid
      gridDiv.innerHTML = '';
      const table = el('table', {
        style: {
          borderCollapse: 'separate',
          borderSpacing: '6px',
          fontSize: '1.2rem',
          fontFamily: 'monospace',
        },
      });

      // Header row
      const header = el('tr');
      header.appendChild(el('td', { style: { width: '60px' } }));
      [b1, b2].forEach(g => {
        header.appendChild(el('td', {
          text: g,
          style: {
            width: '70px',
            height: '70px',
            textAlign: 'center',
            background: '#e4f0f9',
            borderRadius: '12px',
            fontWeight: '700',
            color: '#1b4a6b',
          },
        }));
      });
      table.appendChild(header);

      // Body rows
      [[a1, normalized[0]], [a2, normalized[1]]].forEach(([rowHeader, row]) => {
        const tr = el('tr');
        tr.appendChild(el('td', {
          text: rowHeader,
          style: {
            width: '70px',
            height: '70px',
            textAlign: 'center',
            background: '#e4f0f9',
            borderRadius: '12px',
            fontWeight: '700',
            color: '#1b4a6b',
          },
        }));
        row.forEach(g => {
          const hasDom = g.split('').some(c => c === c.toUpperCase() && c !== c.toLowerCase());
          const bg = hasDom ? '#d4f0d4' : '#ffe0e0';
          tr.appendChild(el('td', {
            text: g,
            style: {
              width: '70px',
              height: '70px',
              textAlign: 'center',
              background: bg,
              borderRadius: '12px',
              fontWeight: '700',
              color: hasDom ? '#1e7a3a' : '#c0392b',
            },
          }));
        });
        table.appendChild(tr);
      });

      gridDiv.appendChild(table);

      readout.innerHTML = `
        <strong>Cross:</strong> ${parent1} × ${parent2}<br>
        ${Object.entries(counts).map(([k, v]) =>
          `<strong>${k}:</strong> <span class="value">${v}/4 (${(v / 4 * 100).toFixed(0)}%)</span>`
        ).join(' &nbsp;·&nbsp; ')}
      `;
    }

    render();
    return () => {};
  }

  // ============================================================
  // 11. EARTH & SPACE — Solar System Orbits
  // ============================================================
  function buildSolarSystem(root) {
    const W = 700, H = 420;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const planets = [
      { name: 'Mercury', a: 45, period: 0.24, color: '#b5a642', r: 3.5 },
      { name: 'Venus',   a: 65, period: 0.62, color: '#e6b800', r: 5 },
      { name: 'Earth',   a: 88, period: 1.00, color: '#3498db', r: 5.5 },
      { name: 'Mars',    a: 112, period: 1.88, color: '#c0392b', r: 4.5 },
      { name: 'Jupiter', a: 155, period: 11.86, color: '#d4a373', r: 9 },
      { name: 'Saturn',  a: 195, period: 29.46, color: '#e0c68a', r: 8, ring: true },
      { name: 'Uranus',  a: 230, period: 84.01, color: '#7fd4d4', r: 6.5 },
      { name: 'Neptune', a: 260, period: 164.8, color: '#4a6fa8', r: 6 },
    ];

    let time = 0; // in Earth years
    let speedMult = 1;
    let running = true;
    let interval = null;

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Sim speed (yr/s)', 0.05, 3, 0.05, 1, v => { speedMult = v; }));
    root.appendChild(controls);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    const playBtn = makeBtn('⏸ Pause', () => {
      running = !running;
      playBtn.innerHTML = running ? '⏸ Pause' : '▶ Play';
    });
    btnRow.appendChild(playBtn);
    btnRow.appendChild(makeBtn('↺ Reset', () => {
      time = 0;
      draw();
    }, true));
    root.appendChild(btnRow);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const cx = W / 2, cy = H / 2;
    const scale = 1.0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Space bg
      const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, W * 0.7);
      grad.addColorStop(0, '#0a1a2a');
      grad.addColorStop(1, '#020510');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 120; i++) {
        const x = (i * 137) % W;
        const y = (i * 73) % H;
        const size = (i % 3) * 0.4 + 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
        ctx.fillRect(x, y, size, size);
      }

      // Sun
      const sunGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 30);
      sunGrad.addColorStop(0, '#fff6b0');
      sunGrad.addColorStop(0.5, '#ffd23f');
      sunGrad.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#fff2a0';
      ctx.fill();

      // Orbit rings + planets
      planets.forEach(p => {
        // Orbit
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, p.a * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Planet position
        const theta = (time / p.period) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(theta) * p.a * scale;
        const py = cy + Math.sin(theta) * p.a * scale;

        // Planet
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Saturn ring
        if (p.ring) {
          ctx.strokeStyle = 'rgba(230,200,120,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px, py, p.r * 1.9, p.r * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Name
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, px, py - p.r - 4);
      });

      // Readout
      readout.innerHTML = `
        <strong>Sim time:</strong> <span class="value">${time.toFixed(2)} Earth years</span><br>
        <span style="font-size:0.85rem;">Each planet orbits at its own rate. Notice how Mercury (0.24 yr) whips around while Neptune (164.8 yr) barely moves.</span>
      `;
    }

    interval = setInterval(() => {
      if (!running) return;
      time += 0.02 * speedMult;
      draw();
    }, 33);

    draw();
    return () => { if (interval) clearInterval(interval); };
  }

  // ============================================================
  // 12. COMPUTER SCIENCE — Binary / Number Base Converter
  // ============================================================
  function buildBinaryConverter(root) {
    let decimal = 42;

    const inputGroup = el('div', { className: 'sim-control-group', style: { marginBottom: '1rem' } });
    inputGroup.appendChild(el('label', { text: 'Decimal value' }));
    const input = el('input', {
      type: 'number',
      min: 0,
      max: 255,
      value: decimal,
      style: { padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #cfdde9', fontSize: '1.1rem', width: '160px' },
    });
    input.addEventListener('input', () => {
      decimal = Math.max(0, Math.min(255, parseInt(input.value) || 0));
      render();
    });
    inputGroup.appendChild(input);
    root.appendChild(inputGroup);

    const sliderGroup = el('div', { className: 'sim-control-group' });
    sliderGroup.appendChild(el('label', { text: 'Or drag slider (0–255)' }));
    const slider = el('input', { type: 'range', min: 0, max: 255, value: decimal });
    slider.addEventListener('input', () => {
      decimal = parseInt(slider.value);
      input.value = decimal;
      render();
    });
    sliderGroup.appendChild(slider);
    root.appendChild(sliderGroup);

    const bitsDiv = el('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        margin: '1.5rem 0',
        flexWrap: 'wrap',
      },
    });
    root.appendChild(bitsDiv);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    function render() {
      const bits = decimal.toString(2).padStart(8, '0');
      bitsDiv.innerHTML = '';
      bits.split('').forEach((b, i) => {
        const placeValue = Math.pow(2, 7 - i);
        const cell = el('div', {
          style: {
            width: '58px',
            padding: '0.7rem 0',
            textAlign: 'center',
            background: b === '1' ? '#2c7aa0' : '#f0f6fb',
            color: b === '1' ? 'white' : '#6b8fa8',
            borderRadius: '12px',
            border: '1px solid ' + (b === '1' ? '#1b5a7a' : '#cfdde9'),
            transition: 'all 0.15s ease',
          },
        });
        cell.appendChild(el('div', {
          text: b,
          style: { fontSize: '1.5rem', fontWeight: '700', fontFamily: 'monospace' },
        }));
        cell.appendChild(el('div', {
          text: placeValue,
          style: { fontSize: '0.65rem', opacity: 0.75, marginTop: '0.2rem' },
        }));
        // Click to toggle bit
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
          const newBits = bits.split('');
          newBits[i] = newBits[i] === '1' ? '0' : '1';
          decimal = parseInt(newBits.join(''), 2);
          input.value = decimal;
          slider.value = decimal;
          render();
        });
        bitsDiv.appendChild(cell);
      });

      const hex = decimal.toString(16).toUpperCase().padStart(2, '0');
      const octal = decimal.toString(8);
      readout.innerHTML = `
        <strong>Binary:</strong> <span class="value">${bits}</span> &nbsp;·&nbsp;
        <strong>Hex:</strong> <span class="value">0x${hex}</span> &nbsp;·&nbsp;
        <strong>Octal:</strong> <span class="value">0o${octal}</span><br>
        <span style="font-size:0.85rem;">Click any bit to toggle it. 1 byte = 8 bits = values 0–255.</span>
      `;
    }

    render();
    return () => {};
  }

  // ============================================================
  // 13. DATA SCIENCE — Linear Regression
  // ============================================================
  function buildLinearRegression(root) {
    const W = 700, H = 360;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let points = [];
    let noise = 12;

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Noise level', 0, 40, 1, noise, v => { noise = v; generate(); }));
    root.appendChild(controls);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    btnRow.appendChild(makeBtn('↺ Regenerate data', generate));
    btnRow.appendChild(makeBtn('➕ Add point (click canvas)', () => {
      // just hint
      alert('Just click anywhere on the canvas to add a point!');
    }, true));
    root.appendChild(btnRow);

    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const gw = W - pad.l - pad.r;
    const gh = H - pad.t - pad.b;

    function generate() {
      points = [];
      const trueSlope = 0.7;
      const trueIntercept = 30;
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 100;
        const y = trueIntercept + trueSlope * x + (Math.random() - 0.5) * noise * 4;
        points.push({ x, y: Math.max(0, Math.min(120, y)) });
      }
      draw();
    }

    function computeRegression() {
      const n = points.length;
      if (n < 2) return { m: 0, b: 0, r2: 0 };
      let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
      points.forEach(p => {
        sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; syy += p.y * p.y;
      });
      const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      const b = (sy - m * sx) / n;
      // R²
      const meanY = sy / n;
      let ssTot = 0, ssRes = 0;
      points.forEach(p => {
        const pred = m * p.x + b;
        ssTot += (p.y - meanY) ** 2;
        ssRes += (p.y - pred) ** 2;
      });
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      return { m, b, r2 };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fbfdff';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = '#e4eef7';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = pad.t + (i / 5) * gh;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        const x = pad.l + (i / 5) * gw;
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = '#9db8cc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, H - pad.b);
      ctx.lineTo(W - pad.r, H - pad.b);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#3a5b70';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('X', W / 2, H - 8);
      ctx.save();
      ctx.translate(14, H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Y', 0, 0);
      ctx.restore();

      // Regression line
      const { m, b, r2 } = computeRegression();
      const x1 = 0, x2 = 100;
      const y1 = m * x1 + b, y2 = m * x2 + b;
      const px1 = pad.l + (x1 / 100) * gw;
      const py1 = pad.t + (1 - y1 / 120) * gh;
      const px2 = pad.l + (x2 / 100) * gw;
      const py2 = pad.t + (1 - y2 / 120) * gh;
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();

      // Points
      points.forEach(p => {
        const px = pad.l + (p.x / 100) * gw;
        const py = pad.t + (1 - p.y / 120) * gh;
        // residual line
        const predY = m * p.x + b;
        const predPy = pad.t + (1 - predY / 120) * gh;
        ctx.strokeStyle = 'rgba(44,122,160,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, predPy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2c7aa0';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      readout.innerHTML = `
        <strong>Best-fit line:</strong> y = <span class="value">${m.toFixed(3)}</span>x + <span class="value">${b.toFixed(2)}</span><br>
        <strong>R²:</strong> <span class="value">${r2.toFixed(4)}</span> &nbsp;·&nbsp;
        <strong>Points:</strong> <span class="value">${points.length}</span><br>
        <span style="font-size:0.85rem;">Dashed lines are residuals. R² close to 1 means the line fits well; close to 0 means it doesn't.</span>
      `;
    }

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      // Convert to data coords
      const x = ((cx - pad.l) / gw) * 100;
      const y = (1 - (cy - pad.t) / gh) * 120;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 120) {
        points.push({ x, y });
        draw();
      }
    });

    canvas.style.cursor = 'crosshair';
    generate();
    return () => {};
  }

  // ============================================================
  // 14. SOCIAL SCIENCE — Population / Predator-Prey (Lotka-Volterra)
  // ============================================================
  function buildPredatorPrey(root) {
    const W = 700, H = 360;
    const canvas = el('canvas', { width: W, height: H });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let alpha = 1.1;   // prey growth
    let beta = 0.4;    // predation rate
    let delta = 0.1;   // predator growth from prey
    let gamma = 0.4;   // predator death
    let prey = 10;
    let pred = 5;
    let history = [];
    let t = 0;
    let running = true;
    let interval = null;

    const controls = el('div', { className: 'sim-controls' });
    controls.appendChild(makeControl('Prey growth α', 0.2, 2, 0.05, alpha, v => { alpha = v; }));
    controls.appendChild(makeControl('Predation β', 0.1, 1, 0.02, beta, v => { beta = v; }));
    controls.appendChild(makeControl('Predator growth δ', 0.02, 0.5, 0.01, delta, v => { delta = v; }));
    controls.appendChild(makeControl('Predator death γ', 0.1, 1, 0.02, gamma, v => { gamma = v; }));
    root.appendChild(controls);

    const btnRow = el('div', { className: 'sim-btn-row', style: { marginTop: '1rem' } });
    const playBtn = makeBtn('⏸ Pause', () => {
      running = !running;
      playBtn.innerHTML = running ? '⏸ Pause' : '▶ Play';
    });
    btnRow.appendChild(playBtn);
    btnRow.appendChild(makeBtn('↺ Reset', () => {
      prey = 10; pred = 5; history = []; t = 0;
      draw();
    }, true));
    root.appendChild(btnRow);

    const readout = el('div', { className: 'sim-readout' });
    root.appendChild(readout);

    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const gw = W - pad.l - pad.r;
    const gh = H - pad.t - pad.b;

    function step() {
      const dt = 0.02;
      const dPrey = alpha * prey - beta * prey * pred;
      const dPred = delta * prey * pred - gamma * pred;
      prey = Math.max(0.1, prey + dPrey * dt);
      pred = Math.max(0.1, pred + dPred * dt);
      t += dt;
      history.push({ t, prey, pred });
      if (history.length > 800) history.shift();
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fbfdff';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = '#e4eef7';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = pad.t + (i / 5) * gh;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        const x = pad.l + (i / 5) * gw;
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = '#9db8cc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, H - pad.b);
      ctx.lineTo(W - pad.r, H - pad.b);
      ctx.stroke();

      // Find max for scaling
      let maxVal = 20;
      history.forEach(h => { maxVal = Math.max(maxVal, h.prey, h.pred); });
      maxVal *= 1.1;

      // Draw lines
      const drawLine = (key, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((h, i) => {
          const x = pad.l + (i / 800) * gw;
          const y = pad.t + (1 - h[key] / maxVal) * gh;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
      drawLine('prey', '#27ae60');
      drawLine('pred', '#c0392b');

      // Labels
      ctx.fillStyle = '#3a5b70';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time →', W / 2, H - 8);
      ctx.save();
      ctx.translate(14, H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Population', 0, 0);
      ctx.restore();

      // Y axis labels
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const v = (i / 5) * maxVal;
        const y = pad.t + (1 - i / 5) * gh;
        ctx.fillText(v.toFixed(0), pad.l - 6, y + 4);
      }

      // Legend
      ctx.textAlign = 'left';
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(W - 130, 20, 12, 12);
      ctx.fillStyle = '#0b2b3f';
      ctx.fillText('Prey', W - 113, 30);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(W - 130, 38, 12, 12);
      ctx.fillStyle = '#0b2b3f';
      ctx.fillText('Predator', W - 113, 48);

      readout.innerHTML = `
        <strong>Time:</strong> <span class="value">${t.toFixed(2)}</span> &nbsp;·&nbsp;
        <strong>Prey:</strong> <span class="value">${prey.toFixed(2)}</span> &nbsp;·&nbsp;
        <strong>Predator:</strong> <span class="value">${pred.toFixed(2)}</span><br>
        <span style="font-size:0.85rem;">The Lotka–Volterra equations produce these characteristic oscillations. Predators rise after prey, then crash when prey runs out.</span>
      `;
    }

    interval = setInterval(() => {
      if (running) step();
    }, 33);

    draw();
    return () => { if (interval) clearInterval(interval); };
  }

  // ============================================================
  // Registry
  // ============================================================
  const SIMS = {
    'electric-field': {
      title: 'Electric Field & Charges',
      tag: 'Physics',
      build: buildElectricField,
    },
    'acid-base-titration': {
      title: 'Acid-Base Titration',
      tag: 'Chemistry 🧪 Lab',
      build: buildTitration,
    },
    'dna-transcription': {
      title: 'DNA Transcription & Translation',
      tag: 'Biology',
      build: buildDNA,
    },
    'moon-phases': {
      title: 'Moon Phases',
      tag: 'Earth & Space 🧪 Lab',
      build: buildMoonPhases,
    },
    'logic-gates': {
      title: 'Logic Gates & Circuits',
      tag: 'Computer Science',
      build: buildLogicGates,
    },
    'bayes-theorem': {
      title: "Bayes' Theorem",
      tag: 'Data Science',
      build: buildBayes,
    },
    'schelling-segregation': {
      title: "Schelling's Segregation Model",
      tag: 'Social Science',
      build: buildSchelling,
    },
    'electric-field': { title: 'Electric Field & Charges', tag: 'Physics', build: buildElectricField },
    'projectile-motion': { title: 'Projectile Motion', tag: 'Physics', build: buildProjectile },
    'acid-base-titration': { title: 'Acid-Base Titration', tag: 'Chemistry 🧪 Lab', build: buildTitration },
    'periodic-table': { title: 'Periodic Table Explorer', tag: 'Chemistry', build: buildPeriodicTable },
    'dna-transcription': { title: 'DNA Transcription & Translation', tag: 'Biology', build: buildDNA },
    'punnett-square': { title: 'Punnett Square & Genetics', tag: 'Biology', build: buildPunnett },
    'moon-phases': { title: 'Moon Phases', tag: 'Earth & Space 🧪 Lab', build: buildMoonPhases },
    'solar-system': { title: 'Solar System Orbits', tag: 'Earth & Space', build: buildSolarSystem },
    'logic-gates': { title: 'Logic Gates & Circuits', tag: 'Computer Science', build: buildLogicGates },
    'binary-converter': { title: 'Binary & Number Bases', tag: 'Computer Science', build: buildBinaryConverter },
    'bayes-theorem': { title: "Bayes' Theorem", tag: 'Data Science', build: buildBayes },
    'linear-regression': { title: 'Linear Regression', tag: 'Data Science', build: buildLinearRegression },
    'schelling-segregation': { title: "Schelling's Segregation Model", tag: 'Social Science', build: buildSchelling },
    'predator-prey': { title: 'Predator–Prey Dynamics', tag: 'Social Science', build: buildPredatorPrey },
  };

  // Expose a function to open a sim by ID
  window.openSim = function (simId) {
    const sim = SIMS[simId];
    if (!sim) {
      alert('This simulation is not yet implemented.');
      return;
    }
    openModal(sim.title, sim.tag, sim.build);
  };

})();