/* =============================================================
   TopNET GSI — main.js
   ============================================================= */

   (function () {
    'use strict';
  
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const lerp  = (a, b, t) => a + (b - a) * t;
    const ease  = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  
    /* ---------- Header: toggle scrolled state ---------- */
    const header = document.getElementById('site-header');
    const onScrollHeader = () => {
      if (window.scrollY > 40) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScrollHeader();
  
    /* ---------- Hero parallax (CRH-style: About slides UP over pinned hero) ---------- */
    const heroSection = document.getElementById('hero');
    const heroBg      = document.getElementById('heroBg');
    const heroContent = heroSection ? heroSection.querySelector('.hero__content') : null;
    const heroHint    = heroSection ? heroSection.querySelector('.hero__scroll') : null;
  
    /* Auto-snap: whenever About's top edge crosses the middle of the pinned hero
       (p === 0.5), finish the movement in the direction the user is going —
       down completes the lift (p → 1), up puts the hero back (p → 0).
       Disabled for reduced motion. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Asymmetric hysteresis: the two trigger points differ, so hovering around
    // one threshold can never re-fire the snap.
    const SNAP_DOWN    = 0.50;  // scrolling down: About's edge at 50% of hero
    const SNAP_UP      = 0.40;  // scrolling up: fires lower, at 40%
    const SNAP_DUR     = 600;

    const SNAP_GRACE   = 150;   // ignore the tail of the gesture that triggered us

    let snapDownArmed = true;
    let snapUpArmed   = true;
    let snapping   = false;
    let snapRAF    = 0;
    let snapStart  = 0;
    let snapDir    = 1;         // +1 snapping down, -1 snapping up
    let prevWheel  = Infinity;  // for telling real input from decaying momentum
    let lastScrollY = window.scrollY;

    const cancelSnap = () => {
      if (!snapping) return;
      cancelAnimationFrame(snapRAF);
      snapping = false;
    };

    const snapTo = (target) => {
      if (Math.abs(target - window.scrollY) < 2) return;
      snapping  = true;
      snapDir   = Math.sign(target - window.scrollY);
      snapStart = performance.now();
      prevWheel = Infinity;

      let from = 0;
      let t0   = 0;

      const step = (now) => {
        if (!snapping) return;               // user took over
        if (!t0) {
          // First frame reads the *live* start state. Capturing it back in the
          // scroll handler meant frame one scrolled back to a position one
          // frame stale — that snap-back was the visible jerk.
          t0 = snapStart = now;
          from = window.scrollY;
          if (Math.abs(target - from) < 2) { snapping = false; return; }
          snapDir = Math.sign(target - from);
        }

        const live = window.scrollY;
        if ((live - target) * snapDir >= 0) { snapping = false; return; } // momentum got us there

        const t = clamp((now - t0) / SNAP_DUR, 0, 1);
        const u = easeInOutCubic(t);
        let y = from + (target - from) * u;

        // Momentum can run ahead of the curve; follow it instead of pulling
        // back (moving against snapDir is what reads as a jerk). Re-anchor so
        // the curve still lands exactly on target at t === 1.
        if ((live - y) * snapDir > 0) {
          y = live;
          if (u < 0.999) from = target - (target - live) / (1 - u);
        }

        window.scrollTo(0, y);
        if (t < 1) snapRAF = requestAnimationFrame(step);
        else snapping = false;
      };

      snapRAF = requestAnimationFrame(step);
    };

    const updateHero = () => {
      if (!heroSection) return;
      const rect  = heroSection.getBoundingClientRect();
      // hero-section is 200vh; scroll progress 0..1 across the 100vh sticky window
      const total = heroSection.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / total, 0, 1);

      // Auto-snap in whichever direction the user is scrolling.
      if (!reduceMotion.matches) {
        // each direction re-arms only once p is past the *other* threshold
        if (p < SNAP_UP)   snapDownArmed = true;
        if (p > SNAP_DOWN) snapUpArmed   = true;

        const top = window.scrollY + rect.top;   // scroll position where p === 0
        if (!snapping) {
          if (snapDownArmed && p >= SNAP_DOWN && p < 1 && window.scrollY > lastScrollY) {
            snapDownArmed = false;
            snapTo(top + total);                 // finish the lift
          } else if (snapUpArmed && p <= SNAP_UP && p > 0 && window.scrollY < lastScrollY) {
            snapUpArmed = false;
            snapTo(top);                         // put the hero back
          }
        }
      }

      // Parallax is scroll-linked, so it maps linearly off p — easing a scroll
      // position makes the velocity uneven and reads as stutter.
      // Background: slow downward drift only; the zoom is a fixed scale in CSS.
      if (heroBg) {
        heroBg.style.transform = `translate3d(0, ${p * 60}px, 0) scale(1.08)`;
      }
      // Content: gentle upward parallax + fade so it looks like About slides on top.
      if (heroContent) {
        heroContent.style.transform = `translate3d(0, ${-p * 70}px, 0)`;
        heroContent.style.opacity   = String(1 - clamp(p * 1.2, 0, 1));
      }
      // Scroll hint disappears quickly once user starts scrolling.
      if (heroHint) {
        heroHint.style.opacity = String(1 - clamp(p * 3, 0, 1));
      }
    };
  
    /* ---------- Stats counters ---------- */
    const statNodes = document.querySelectorAll('.stat');
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const isFloat = String(target).includes('.');
      const isK = suffix === 'K';
      const dur = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        const eased = ease(p);
        const val = target * eased;
        let out;
        if (isK) out = Math.round(val).toLocaleString('ru-RU') + 'K';
        else if (isFloat) out = val.toFixed(1);
        else out = Math.round(val).toLocaleString('ru-RU');
        el.textContent = out + (suffix && !isK ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
  
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-in');
          const value = el.querySelector('.stat__value');
          if (value && !value.dataset.done) {
            value.dataset.done = '1';
            animateCount(value);
          }
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    statNodes.forEach(n => statsObserver.observe(n));
  
    /* =============================================================
       Particle Network (Holcim-style pinned scroll animation)
       Particles appear progressively based on scroll progress within
       the .network section, and connect with lines when close enough.
       ============================================================= */
  
    const netSection  = document.getElementById('network');
    const netScrollEl = netSection ? netSection.querySelector('.network__scroll') : null;
    const canvas      = document.getElementById('networkCanvas');
    const progressBar = document.getElementById('netProgress');
  
    let ctx, DPR = Math.min(window.devicePixelRatio || 1, 2);
    let cw = 0, ch = 0;
    let particles = [];
    let currentProgress = 0;   // eased scroll progress 0..1
    let targetProgress  = 0;
  
    const PARTICLE_COUNT = 120;
    const LINK_DISTANCE  = 140;
  
    function initParticles() {
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resizeCanvas();
      generateParticles();
      window.addEventListener('resize', () => {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        resizeCanvas();
        generateParticles();
      });
      requestAnimationFrame(renderLoop);
    }
  
    function resizeCanvas() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      canvas.width  = Math.floor(cw * DPR);
      canvas.height = Math.floor(ch * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  
    function generateParticles() {
      particles = [];
      // deterministic layout so movement feels stable across resizes
      const rand = mulberry32(2026);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = rand() * cw;
        const y = rand() * ch;
        // spawn threshold: particles appear in order of scroll progress
        const appearAt = i / PARTICLE_COUNT;
        // slow drift
        const angle = rand() * Math.PI * 2;
        const speed = 0.08 + rand() * 0.14;
        particles.push({
          baseX: x, baseY: y,
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          appearAt,
          radius: 1.6 + rand() * 2.2,
          phase: rand() * Math.PI * 2
        });
      }
    }
  
    function mulberry32(a) {
      return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  
    function updateNetworkProgress() {
      if (!netScrollEl) return;
      const rect = netScrollEl.getBoundingClientRect();
      const total = netScrollEl.offsetHeight - window.innerHeight;
      targetProgress = clamp(-rect.top / total, 0, 1);
    }
  
    function renderLoop() {
      if (!ctx) return;
      // smooth progress
      currentProgress += (targetProgress - currentProgress) * 0.12;
      if (progressBar) {
        progressBar.style.right = `${(1 - currentProgress) * 100}%`;
      }
      draw();
      requestAnimationFrame(renderLoop);
    }
  
    function draw() {
      ctx.clearRect(0, 0, cw, ch);
  
      // active particles based on progress
      const active = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (currentProgress < p.appearAt) continue;
        // per-particle appear factor for fade-in
        const localAppear = clamp(
          (currentProgress - p.appearAt) / 0.08, 0, 1
        );
  
        // gentle drift + subtle scroll-linked pulse
        p.x += p.vx;
        p.y += p.vy;
        // wrap around edges softly
        if (p.x < -20) p.x = cw + 20;
        if (p.x > cw + 20) p.x = -20;
        if (p.y < -20) p.y = ch + 20;
        if (p.y > ch + 20) p.y = -20;
  
        p.appearFactor = localAppear;
        active.push(p);
      }
  
      // draw links first (behind nodes)
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            const t = 1 - dist / LINK_DISTANCE;
            const alpha = t * 0.55 * a.appearFactor * b.appearFactor;
            if (alpha < 0.01) continue;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(14, 90, 167, ${alpha})`);
            grad.addColorStop(1, `rgba(122, 164, 207, ${alpha * 0.7})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
  
      // draw particles
      for (let i = 0; i < active.length; i++) {
        const p = active[i];
        const alpha = 0.9 * p.appearFactor;
        // glow halo
        ctx.beginPath();
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        halo.addColorStop(0, `rgba(14, 90, 167, ${0.35 * p.appearFactor})`);
        halo.addColorStop(1, 'rgba(14, 90, 167, 0)');
        ctx.fillStyle = halo;
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();
  
        // node
        ctx.beginPath();
        ctx.fillStyle = `rgba(207, 222, 237, ${alpha})`;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  
    /* ---------- News carousel ---------- */
    const newsViewport = document.querySelector('[data-news-viewport]');
    const newsTrack    = document.querySelector('[data-news-track]');
    const newsPrev     = document.querySelector('[data-news-prev]');
    const newsNext     = document.querySelector('[data-news-next]');
  
    if (newsViewport && newsTrack && newsPrev && newsNext) {
      const cards = Array.from(newsTrack.children);
      let index = 0;
  
      const gap = () => parseFloat(getComputedStyle(newsTrack).columnGap || getComputedStyle(newsTrack).gap) || 0;
      const cardStep = () => (cards[0] ? cards[0].getBoundingClientRect().width + gap() : 0);
      const visibleCount = () => {
        if (!cards[0]) return 1;
        const w = cards[0].getBoundingClientRect().width + gap();
        return Math.max(1, Math.round((newsViewport.getBoundingClientRect().width + gap()) / w));
      };
      const maxIndex = () => Math.max(0, cards.length - visibleCount());
  
      const apply = () => {
        index = clamp(index, 0, maxIndex());
        newsTrack.style.transform = `translate3d(${-index * cardStep()}px, 0, 0)`;
        newsPrev.disabled = index <= 0;
        newsNext.disabled = index >= maxIndex();
      };
  
      newsPrev.addEventListener('click', () => { index -= 1; apply(); });
      newsNext.addEventListener('click', () => { index += 1; apply(); });
      window.addEventListener('resize', apply);
      apply();
    }
  
    /* ---------- Master scroll handler ---------- */
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScrollHeader();
          updateHero();
          updateNetworkProgress();
          lastScrollY = window.scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    /* Auto-snap yields to the user — but macOS momentum keeps firing `wheel`
       for a while after the flick that triggered the snap, so only a *fresh*
       gesture counts: an upward flick, or a delta bigger than the last one
       (momentum only ever decays). */
    const SNAP_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    window.addEventListener('wheel', (ev) => {
      if (!snapping) return;
      if (performance.now() - snapStart < SNAP_GRACE) return;
      const d = Math.abs(ev.deltaY);
      // opposite to where we're snapping, or a delta bigger than the last one
      if (Math.sign(ev.deltaY) === -snapDir || d > prevWheel + 0.5) cancelSnap();
      prevWheel = d;
    }, { passive: true });
    window.addEventListener('touchstart', cancelSnap, { passive: true });
    window.addEventListener('keydown', (ev) => {
      if (SNAP_KEYS.includes(ev.key)) cancelSnap();
    }, { passive: true });
    window.addEventListener('resize', () => {
      updateHero();
      updateNetworkProgress();
    });
  
    /* ---------- Init ---------- */
    document.addEventListener('DOMContentLoaded', () => {
      initParticles();
      updateHero();
      updateNetworkProgress();
    });
  
    // if DOM is already parsed
    if (document.readyState !== 'loading') {
      initParticles();
      updateHero();
      updateNetworkProgress();
    }
  })();
  