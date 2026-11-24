'use strict';
(() => {
  const root = document.documentElement;
  const storageKey = 'tri-it-wishes-season';
  const seasons = ['winter', 'spring', 'summer', 'autumn'];
  const en = root.lang === 'en';
  const names = en
    ? {winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn'}
    : {winter: 'Зима', spring: 'Весна', summer: 'Лето', autumn: 'Осень'};
  const colors = {winter: '#f2f7fc', spring: '#f4f8f2', summer: '#f0f8f7', autumn: '#fcf6ef'};
  let mode = 'auto';
  let timer;

  // Сохраняем только предпочтение оформления. Запрет хранилища (в том числе
  // при открытии файла напрямую) не должен мешать сайту и ручному выбору.
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'auto' || seasons.includes(saved)) mode = saved;
  } catch { /* Выбор останется в памяти страницы. */ }

  function calendarSeason(now = new Date()) {
    // Язык страницы и часовой пояс устройства не влияют на границы сезонов.
    const month = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Moscow', month: 'numeric',
    }).format(now));
    return seasons[Math.floor((month % 12) / 3)];
  }

  function apply() {
    const season = mode === 'auto' ? calendarSeason() : mode;
    root.dataset.season = season;
    root.dataset.seasonMode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[season]);
    const caption = mode === 'auto'
      ? (en ? `${names[season]} · Moscow calendar` : `${names[season]} · по календарю Москвы`)
      : (en ? `${names[season]} · your choice` : `${names[season]} · ваш выбор`);
    document.querySelectorAll('[data-season-caption]').forEach(node => { node.textContent = caption; });
    document.querySelectorAll('[data-season-select]').forEach(select => { select.value = mode; });
  }

  function schedule() {
    clearTimeout(timer);
    if (mode !== 'auto' || document.hidden) return;
    // Просыпаемся на каждой границе минуты, включая московскую полночь.
    // Это также переносит смену системного времени без длинного устаревшего таймера.
    timer = setTimeout(() => { apply(); schedule(); }, 60000 - (Date.now() % 60000) + 20);
  }

  // Скрипт загружается в head до отрисовки: сохранённая тема применяется сразу.
  // Базовые цвета без JavaScript заданы в CSS, селектор изначально скрыт.
  apply();
  function bind() {
    document.querySelectorAll('[data-season-picker]').forEach(picker => {
      picker.hidden = false;
      picker.querySelector('select').addEventListener('change', event => {
        mode = event.target.value;
        try { localStorage.setItem(storageKey, mode); }
        catch { /* Текущая вкладка продолжает работать без сохранения. */ }
        apply(); schedule();
      });
    });
    apply(); schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once: true});
  else bind();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) apply();
    schedule();
  });
  window.addEventListener('pageshow', () => { apply(); schedule(); });
})();
