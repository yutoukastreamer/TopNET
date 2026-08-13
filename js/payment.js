/* =============================================================
   TopNET GSI — оплата подписки (payment.html).
   Демо: проверяем, что поля заполнены, и показываем сообщение.
   Никуда ничего не отправляется.
   ============================================================= */

(function () {
  'use strict';

  const form = document.getElementById('paymentForm');
  if (!form) return;

  const msg     = document.getElementById('payMsg');
  const account = document.getElementById('payAccount');
  const pass    = document.getElementById('payPassword');

  const showMsg = (text, ok) => {
    if (!msg) return;
    msg.textContent = text;
    msg.classList.remove('msg--ok', 'msg--error');
    msg.classList.add(ok ? 'msg--ok' : 'msg--error');
    msg.hidden = false;
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    if (!account.value.trim() || !pass.value.trim()) {
      showMsg('Заполните email (логин) и пароль.', false);
      (!account.value.trim() ? account : pass).focus();
      return;
    }

    showMsg('Демо-режим: оплата будет подключена позже.', true);
  });
})();
