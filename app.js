/**
 * «Три желания» — клиентская логика лендинга.
 *
 * Важно:
 * - Сайт размещается как статическая страница на GitHub Pages.
 * - Заявки отправляются через Formspree; собственного серверного кода здесь нет.
 * - Endpoint формы не является паролем. Не добавляйте в этот файл SMTP-пароли,
 *   приватные API-ключи или другие секреты.
 * - Проверка в браузере нужна для удобства пользователя, но не заменяет серверную
 *   проверку и антиспам-механизмы Formspree.
 */

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

// Мобильное меню: переключаем видимость и синхронизируем aria-expanded.
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? '✕' : '☰';
});

// После перехода по ссылке закрываем мобильное меню.
nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.textContent = '☰';
  });
});

// Автоматически обновляем год в подвале.
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

/**
 * Настройки интеграции Formspree.
 * Этот публичный endpoint предназначен для приёма отправок формы.
 */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/myeedlnv';

const form = document.querySelector('#application-form');

if (form) {
  const statusBox = form.querySelector('.form-status');
  const submitButton = form.querySelector('.submit-button');
  const originalButtonText = submitButton.innerHTML;

  // Показывает ошибку рядом с полем и сообщает её вспомогательным технологиям.
  function setError(input, message) {
    const label = input.closest('label');
    const error = label?.querySelector('.field-error');

    if (error) error.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  // При редактировании поля убираем устаревшее сообщение об ошибке.
  form.querySelectorAll('input:not([type="checkbox"]), select, textarea')
    .forEach((input) => {
      input.addEventListener('input', () => setError(input, ''));
      input.addEventListener('change', () => setError(input, ''));
    });

  // Отправляем заявку асинхронно, не открывая почтовое приложение и не покидая сайт.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    statusBox.className = 'form-status';
    statusBox.textContent = '';

    let valid = true;
    const name = form.elements.name;
    const phone = form.elements.phone;
    const email = form.elements.email;
    const clientType = form.elements.clientType;
    const task = form.elements.task;
    const consent = form.elements.consent;

    // Базовая клиентская проверка обязательных полей.
    const checks = [
      [name, name.value.trim().length >= 2, 'Введите имя (не менее 2 символов).'],
      [phone, /^[+()\d\s-]{7,25}$/.test(phone.value.trim()), 'Введите корректный номер телефона.'],
      [email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), 'Введите корректный адрес электронной почты.'],
      [clientType, Boolean(clientType.value), 'Выберите тип клиента.'],
      [task, task.value.trim().length >= 10, 'Опишите задачу подробнее (не менее 10 символов).'],
    ];

    checks.forEach(([input, isValid, message]) => {
      setError(input, isValid ? '' : message);
      if (!isValid) valid = false;
    });

    // Отдельно проверяем согласие, так как это checkbox, а не текстовое поле.
    const consentError = form.querySelector('.consent-error');
    consentError.textContent = consent.checked
      ? ''
      : 'Необходимо согласие на обработку персональных данных.';
    consent.setAttribute('aria-invalid', consent.checked ? 'false' : 'true');
    if (!consent.checked) valid = false;

    if (!valid) {
      statusBox.className = 'form-status error';
      statusBox.textContent = 'Пожалуйста, проверьте поля формы.';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    // Не отправляем форму повторно, пока предыдущий запрос обрабатывается.
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.textContent = 'Отправляем заявку…';

    try {
      // FormData автоматически собирает значения всех именованных полей формы.
      // Согласие передаётся вместе с заявкой; парольные и иные секретные поля отсутствуют.
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          Accept: 'application/json',
        },
      });

      // Formspree возвращает JSON с описанием ошибки, если отправка не принята.
      let result = {};
      try {
        result = await response.json();
      } catch {
        // Если ответ не содержит JSON, ниже покажем общее сообщение об ошибке.
      }

      if (!response.ok) {
        const details = Array.isArray(result.errors)
          ? result.errors.map((item) => item.message).filter(Boolean).join(' ')
          : '';

        throw new Error(details || 'Сервис не принял заявку. Попробуйте ещё раз.');
      }

      // Успех показываем только после положительного ответа Formspree.
      statusBox.className = 'form-status success';
      statusBox.textContent =
        'Спасибо! Заявка отправлена. Если потребуется, менеджер свяжется с вами по указанным контактам.';

      form.reset();

      // После reset сбрасываем состояние доступности полей и сообщений ошибок.
      form.querySelectorAll('[aria-invalid]').forEach((input) => {
        input.setAttribute('aria-invalid', 'false');
      });
      form.querySelectorAll('.field-error').forEach((error) => {
        error.textContent = '';
      });
    } catch (error) {
      // Ошибка сети или отклонённая отправка: не сообщаем пользователю об успехе.
      statusBox.className = 'form-status error';
      statusBox.textContent = error instanceof Error
        ? error.message
        : 'Не удалось отправить заявку. Проверьте подключение к интернету и попробуйте ещё раз.';
    } finally {
      // Возвращаем кнопку в исходное состояние и разрешаем повторную попытку.
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.innerHTML = originalButtonText;
    }
  });
}
