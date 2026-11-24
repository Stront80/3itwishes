'use strict';
// Язык берётся из HTML: страницы остаются читаемыми и без JavaScript.
const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
const messages = {
  ru: {
    name: 'Укажите имя: от 2 до 120 символов.',
    phone: 'Укажите корректный номер телефона.',
    email: 'Укажите корректный email для ответа.',
    clientType: 'Выберите тип клиента.',
    task: 'Опишите задачу: от 10 до 5000 символов.',
    consent: 'Подтвердите согласие на обработку данных.',
    invalid: 'Проверьте отмеченные поля.',
    sending: 'Отправляем заявку…',
    success: 'Спасибо! Заявка отправлена. При необходимости менеджер свяжется с вами.',
    failure: 'Не удалось отправить заявку. Проверьте подключение и попробуйте ещё раз.',
  },
  en: {
    name: 'Enter a name between 2 and 120 characters.',
    phone: 'Enter a valid phone number.',
    email: 'Enter a valid email address for a reply.',
    clientType: 'Choose a client type.',
    task: 'Describe your task in 10 to 5,000 characters.',
    consent: 'Please consent to the processing of your data.',
    invalid: 'Please check the highlighted fields.',
    sending: 'Sending your request…',
    success: 'Thank you! Your request has been sent. The manager will contact you if needed.',
    failure: 'Could not send your request. Check your connection and try again.',
  },
};
const form = document.querySelector('#application-form');
const status = document.querySelector('#form-status');
const text = messages[language];
function setError(field, error) {
  field.setAttribute('aria-invalid', String(Boolean(error)));
  document.getElementById(`${field.name}-error`).textContent = error;
}
if (form) {
  // При явной смене языка переносим черновик через хранилище этой вкладки.
  // Сразу после чтения удаляем его; отказ хранилища не ломает навигацию.
  const draftKey = 'tri-it-wishes-draft';
  try {
    const saved = sessionStorage.getItem(draftKey);
    sessionStorage.removeItem(draftKey);
    const draft = saved ? JSON.parse(saved) : {};
    for (const name of ['name', 'phone', 'email', 'clientType', 'task']) {
      if (typeof draft[name] === 'string') form.elements[name].value = draft[name];
    }
  } catch { /* Без хранилища переход работает, но черновик не переносится. */ }
  document.querySelector('.language-link')?.addEventListener('click', (event) => {
    // Удерживаем значения только при штатном переключении в той же вкладке.
    // Модифицированный клик открывает отдельную страницу без переноса данных.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const draft = Object.fromEntries(['name', 'phone', 'email', 'clientType', 'task'].map(name => [name, form.elements[name].value]));
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); }
    catch { /* При запрете хранилища сохраняем штатную навигацию. */ }
    if (location.hash === '#request') event.currentTarget.hash = 'request';
  });
  for (const name of ['name', 'phone', 'email', 'clientType', 'task', 'consent']) {
    const field = form.elements[name];
    field.addEventListener(name === 'consent' ? 'change' : 'input', () => {
      setError(field, '');
      status.textContent = '';
    });
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    const name = form.elements.name;
    const email = form.elements.email;
    const phone = form.elements.phone;
    const clientType = form.elements.clientType;
    const task = form.elements.task;
    const consent = form.elements.consent;
    const checks = [
      [name, name.value.trim().length >= 2 && name.value.trim().length <= 120],
      [phone, /^[+()\d\s-]{7,25}$/.test(phone.value.trim())],
      [email, email.value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())],
      [clientType, Boolean(clientType.value)],
      [task, task.value.trim().length >= 10 && task.value.trim().length <= 5000],
      [consent, consent.checked],
    ];
    for (const [field, valid] of checks) setError(field, valid ? '' : text[field.name]);
    const firstInvalid = checks.find(([, valid]) => !valid);
    if (firstInvalid) {
      status.textContent = text.invalid;
      firstInvalid[0].focus();
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = text.sending;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Formspree error');
      status.textContent = text.success;
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach(field => field.setAttribute('aria-invalid', 'false'));
      form.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    } catch {
      status.textContent = text.failure;
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = language === 'en' ? 'Send request' : 'Отправить заявку';
    }
    status.focus();
  });
}
// Ссылка политики переключается на перевод политики, а не на главную страницу.
if (!form) {
  const switcher = document.querySelector('.language-link');
  if (switcher) switcher.href = language === 'en' ? '../privacy.html' : 'en/privacy.html';
}
