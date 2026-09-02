/* =============================================================
   TopNET GSI — заявка на подключение (register.html).
   • тумблер «Физическое лицо» скрывает поле организации
   • маска телефона +7 (___) ___-__-__
   • валидация обязательных полей и согласия
   Демо: форма никуда ничего не отправляет.
   ============================================================= */

(function () {
  'use strict';

  const form = document.getElementById('regForm');
  if (!form) return;

  const msg        = document.getElementById('regMsg');
  const individual = document.getElementById('isIndividual');
  const orgField   = document.getElementById('orgField');
  const orgInput   = document.getElementById('regOrg');
  const phone      = document.getElementById('regPhone');
  const consent    = document.getElementById('regConsent');

  const showMsg = (text, ok) => {
    if (!msg) return;
    msg.textContent = text;
    msg.classList.remove('msg--ok', 'msg--error');
    msg.classList.add(ok ? 'msg--ok' : 'msg--error');
    msg.hidden = false;
  };

  /* ---------- Физлицо: организация не нужна ---------- */
  const syncOrg = () => {
    const isPerson = individual.checked;
    orgField.hidden = isPerson;
    // скрытое поле не должно участвовать в проверке
    orgInput.required = !isPerson;
    if (isPerson) {
      orgInput.value = '';
      orgInput.classList.remove('is-invalid');
    }
  };

  if (individual && orgField && orgInput) {
    individual.addEventListener('change', syncOrg);
    syncOrg();
  }

  /* ---------- Маска телефона +7 (___) ___-__-__ ---------- */
  const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    // ведущая 8 или 7 — это код страны, храним только 10 цифр номера
    if (digits.startsWith('8')) digits = digits.slice(1);
    else if (digits.startsWith('7')) digits = digits.slice(1);
    digits = digits.slice(0, 10);

    if (!digits) return '';

    let out = '+7 (' + digits.slice(0, 3);
    if (digits.length >= 3) out += ') ' + digits.slice(3, 6);
    if (digits.length >= 6) out += '-' + digits.slice(6, 8);
    if (digits.length >= 8) out += '-' + digits.slice(8, 10);
    return out;
  };

  const phoneDigits = () => phone.value.replace(/\D/g, '').replace(/^[78]/, '');

  if (phone) {
    phone.addEventListener('input', () => {
      phone.value = formatPhone(phone.value);
    });
    // клик в пустое поле сразу ставит префикс — понятно, что вводить
    phone.addEventListener('focus', () => {
      if (!phone.value) phone.value = '+7 (';
    });
    phone.addEventListener('blur', () => {
      if (phone.value === '+7 (' || phone.value === '+7') phone.value = '';
    });
  }

  /* ---------- Валидация и демо-отправка ---------- */
  const markInvalid = (el) => {
    el.classList.add('is-invalid');
    el.addEventListener('input',  () => el.classList.remove('is-invalid'), { once: true });
    el.addEventListener('change', () => el.classList.remove('is-invalid'), { once: true });
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const controls = Array.from(form.querySelectorAll('.field__input, .field__select'));
    controls.forEach(el => el.classList.remove('is-invalid'));

    let firstBad = null;

    controls.forEach((el) => {
      // поле скрыто тумблером — не проверяем
      if (!el.required || el.closest('.field').hidden) return;
      if (!el.value.trim()) {
        markInvalid(el);
        if (!firstBad) firstBad = el;
      }
    });

    // телефон: нужны все 10 цифр номера
    if (phone && phone.required && phone.value.trim() && phoneDigits().length < 10) {
      markInvalid(phone);
      if (!firstBad) firstBad = phone;
    }

    if (firstBad) {
      showMsg('Заполните обязательные поля.', false);
      firstBad.focus();
      return;
    }

    if (consent && !consent.checked) {
      showMsg('Без согласия на обработку персональных данных заявку отправить нельзя.', false);
      consent.focus();
      return;
    }

    showMsg('Заявка принята! Данные для подключения придут на ваш email.', true);
  });
})();
