/* =============================================================
   TopNET GSI — Личный кабинет
   1) «Дышащая» сеть на canvas (фон, по бокам от формы)
   2) Демо-логика формы входа и модалки «Забыли пароль?»
   ============================================================= */

(function () {
  'use strict';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE = window.matchMedia('(max-width: 767px)');

  /* =============================================================
     Живая сеть
     Фаза роста: узлы появляются по одному в СЛУЧАЙНЫХ свободных точках.
     Фаза угасания: узлы гаснут ПО ОЧЕРЕДИ, в порядке появления.
     Соседи соединяются дугами (quadraticCurveTo).
     ============================================================= */
  const canvas = document.getElementById('netCanvas');

  if (canvas) {
    const ctx = canvas.getContext('2d');

    const MAX_NODES     = 34;
    const SPAWN_EVERY   = 120;   // мс между появлениями
    const FADE_EVERY    = 90;    // мс между угасаниями
    const HOLD_MS       = 900;   // пауза, когда сеть набрана
    const LINK_DIST     = 190;   // порог связи
    const FADE_SPEED    = 0.05;  // скорость альфы за кадр
    const SIDE_RATIO    = 0.30;  // ширина боковой зоны спавна (доля экрана)
    const CARD_HALF     = 260;   // полуширина «мёртвой зоны» под карточкой

    let nodes = [];
    let phase = 'grow';          // grow → hold → fade
    let phaseAt = 0;
    let lastStep = 0;
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* Точка появляется хаотично, но только в боковых зонах —
       по центру находится непрозрачная карточка формы. */
    const randomPoint = () => {
      const sideW = Math.max(w * SIDE_RATIO, 120);
      const centerGap = Math.min(CARD_HALF, w * 0.5 - 40);
      const left = Math.random() < 0.5;
      const x = left
        ? Math.random() * Math.min(sideW, w * 0.5 - centerGap * 0.5)
        : w - Math.random() * Math.min(sideW, w * 0.5 - centerGap * 0.5);
      return { x: clamp(x, 8, w - 8), y: 20 + Math.random() * (h - 40) };
    };

    const spawn = () => {
      const p = randomPoint();
      nodes.push({
        x: p.x,
        y: p.y,
        r: 1.6 + Math.random() * 2.2,
        alpha: 0,            // проявляется плавно
        target: 1,
        drift: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.35,
        dying: false
      });
    };

    /* Дуга между двумя узлами: контрольная точка смещена
       перпендикулярно середине отрезка — линия получается кривой. */
    const arc = (a, b, alpha) => {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = len * 0.18;
      const cx = mx + (-dy / len) * bend;
      const cy = my + (dx / len) * bend;

      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, `rgba(14, 90, 167, ${alpha})`);
      grad.addColorStop(1, `rgba(122, 164, 207, ${alpha * 0.7})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // связи — под узлами
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist >= LINK_DIST) continue;
          const alpha = (1 - dist / LINK_DIST) * 0.5 * a.alpha * b.alpha;
          if (alpha < 0.01) continue;
          arc(a, b, alpha);
        }
      }

      // узлы + свечение
      for (const n of nodes) {
        if (n.alpha < 0.01) continue;

        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        halo.addColorStop(0, `rgba(14, 90, 167, ${0.35 * n.alpha})`);
        halo.addColorStop(1, 'rgba(14, 90, 167, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(207, 222, 237, ${0.9 * n.alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (now) => {
      // смена фаз
      if (phase === 'grow' && nodes.length >= MAX_NODES) {
        phase = 'hold';
        phaseAt = now;
      } else if (phase === 'hold' && now - phaseAt > HOLD_MS) {
        phase = 'fade';
        lastStep = now;
      } else if (phase === 'fade' && nodes.length === 0) {
        phase = 'grow';
        lastStep = now;
      }

      // шаги фазы
      if (phase === 'grow' && now - lastStep > SPAWN_EVERY) {
        spawn();
        lastStep = now;
      } else if (phase === 'fade' && now - lastStep > FADE_EVERY) {
        // гасим ПО ОЧЕРЕДИ — первый непогашенный в порядке появления
        const next = nodes.find(n => !n.dying);
        if (next) { next.dying = true; next.target = 0; }
        lastStep = now;
      }

      // анимация альфы + лёгкий дрейф
      for (const n of nodes) {
        n.alpha += (n.target - n.alpha) * FADE_SPEED * 3;
        n.drift += 0.005 * n.speed;
        n.x += Math.cos(n.drift) * 0.12;
        n.y += Math.sin(n.drift) * 0.12;
      }
      nodes = nodes.filter(n => !(n.dying && n.alpha < 0.02));

      draw();
      requestAnimationFrame(tick);
    };

    const startNetwork = () => {
      resize();
      window.addEventListener('resize', resize);

      if (reduceMotion.matches) {
        // статичный кадр — без движения
        for (let i = 0; i < MAX_NODES; i++) {
          spawn();
          nodes[nodes.length - 1].alpha = 1;
        }
        draw();
        return;
      }

      lastStep = performance.now();
      requestAnimationFrame(tick);
    };

    // на узких экранах canvas скрыт стилями — не тратим ресурсы
    if (!MOBILE.matches) startNetwork();
  }

  /* =============================================================
     Форма входа — демо, никуда ничего не отправляет
     ============================================================= */
  const loginForm = document.getElementById('loginForm');
  const loginMsg  = document.getElementById('loginMsg');

  const showMsg = (el, text, ok) => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('msg--ok', 'msg--error');
    el.classList.add(ok ? 'msg--ok' : 'msg--error');
    el.hidden = false;
  };

  if (loginForm) {
    loginForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const login = document.getElementById('login').value.trim();
      const pass  = document.getElementById('password').value.trim();

      if (!login || !pass) {
        showMsg(loginMsg, 'Заполните логин и пароль.', false);
        return;
      }
      showMsg(loginMsg, 'Демо-режим: форма заполнена верно, вход не выполняется.', true);
    });
  }

  /* =============================================================
     Модалка «Забыли пароль?»
     ============================================================= */
  const modal     = document.getElementById('forgotModal');
  const forgotBtn = document.getElementById('forgotBtn');
  const forgotForm = document.getElementById('forgotForm');
  const forgotMsg  = document.getElementById('forgotMsg');

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    const email = document.getElementById('email');
    if (email) email.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    if (forgotMsg) forgotMsg.hidden = true;
    if (forgotForm) forgotForm.reset();
  };

  if (forgotBtn) forgotBtn.addEventListener('click', openModal);

  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target.hasAttribute('data-modal-close')) closeModal();
    });
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  if (forgotForm) {
    forgotForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const email = document.getElementById('email').value.trim();

      if (!email) {
        showMsg(forgotMsg, 'Укажите email.', false);
        return;
      }
      showMsg(forgotMsg, 'Заявка принята, проверьте почту.', true);
    });
  }
})();
