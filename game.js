'use strict';
(() => {
  const field = document.getElementById('game-field');
  if (!field) return;
  const en = document.documentElement.lang === 'en';
  const words = en ? {
    play: 'Play again', resume: 'Resume', pause: 'Pause', paused: 'A little pause.',
    end: score => `Round over. Your score: ${score}.`, audio: 'Audio is unavailable in this browser.',
  } : {
    play: 'Ещё раз', resume: 'Продолжить', pause: 'Пауза', paused: 'Небольшая пауза.',
    end: score => `Раунд окончен. Ваш счёт: ${score}.`, audio: 'Звук недоступен в этом браузере.',
  };
  const el = id => document.getElementById(`game-${id}`);
  const basket = el('basket'), itemsLayer = el('items'), overlay = el('overlay');
  const start = el('start'), pause = el('pause'), position = el('position');
  let state = 'ready', score = 0, lives = 3, streak = 0, remaining = 60;
  let x = .5, items = [], previous = 0, spawn = 0, frame = 0;
  let width = 1, height = 1, direction = 0;
  let context, master, musicTimer, note = 0;
  let music = true, effects = true;
  const melody = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66,
    261.63, 392, 523.25, 659.25, 587.33, 523.25, 392, 329.63];

  // Аудиоконтекст создаётся только внутри действия пользователя. Общая громкость
  // ограничена; одновременно работают лишь короткие синтезированные ноты.
  function initAudio() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = .16;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(disableAudio);
    } catch { disableAudio(); }
  }
  function disableAudio() {
    stopMusic();
    for (const kind of ['music', 'effects']) {
      el(kind).disabled = true;
      el(kind).setAttribute('aria-pressed', 'false');
      el(kind).title = words.audio;
    }
    music = effects = false;
  }
  function tone(frequency, duration, type = 'sine', volume = .3) {
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + .015);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    oscillator.start(now); oscillator.stop(now + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = undefined; }
  function syncMusic() {
    stopMusic();
    if (state !== 'running' || !music) return;
    musicTimer = setInterval(() => {
      tone(melody[note++ % melody.length], .34, 'sine', .22);
      if (note % 4 === 0) tone(130.81, .55, 'sine', .12);
    }, 270);
  }
  function sound(kind) {
    if (!effects) return;
    if (kind === 'bug') tone(100, .23, 'triangle', .5);
    else if (kind === 'bonus') { tone(659.25, .25); tone(987.77, .4); }
    else tone(783.99, .15);
  }
  function geometry() {
    width = field.clientWidth; height = field.clientHeight;
    move(x);
  }
  // Координаты объектов нормированы: поворот планшета не меняет полосу падения.
  // Корзина ограничена полем с учётом своей половины ширины.
  function move(next) {
    x = Math.min(1, Math.max(0, next));
    basket.style.left = `${32 + x * Math.max(0, width - 64)}px`;
    position.value = Math.round(x * 100);
  }
  function stats() {
    el('score').textContent = score;
    el('time').textContent = Math.ceil(remaining);
    el('lives').textContent = lives;
  }
  function show(message, label) {
    el('message').textContent = message;
    start.textContent = label;
    overlay.hidden = false;
  }
  function finish() {
    state = 'ended'; direction = 0;
    stopMusic();
    context?.suspend().catch(() => {});
    pause.disabled = true;
    show(words.end(score), words.play);
    start.focus({preventScroll:true});
  }
  function setPaused() {
    if (state !== 'running') return;
    state = 'paused'; direction = 0;
    cancelAnimationFrame(frame); stopMusic();
    context?.suspend().catch(() => {});
    pause.textContent = words.resume;
    show(words.paused, words.resume);
  }
  function run() {
    if (document.hidden) return;
    initAudio();
    if (state !== 'paused') {
      itemsLayer.replaceChildren(); items = [];
      score = 0; lives = 3; streak = 0; remaining = 60; spawn = .2;
      move(.5);
    }
    state = 'running'; previous = performance.now();
    overlay.hidden = true; pause.disabled = false; pause.textContent = words.pause;
    stats(); syncMusic(); field.focus({preventScroll:true});
    cancelAnimationFrame(frame); frame = requestAnimationFrame(tick);
  }
  function addItem() {
    const bug = Math.random() < .24;
    const node = document.createElement('span');
    node.className = `game-item${bug ? ' bug' : ''}`;
    node.textContent = bug ? '×' : '✦';
    itemsLayer.append(node);
    items.push({node, bug, x: Math.random(), y: -32, speed: 92 + (60 - remaining) * .85});
  }
  function tick(now) {
    if (state !== 'running') return;
    // Большой разрыв кадров означает приостановку среды. Не списываем за него
    // жизни и время и не допускаем скачка объектов через корзину.
    const elapsed = (now - previous) / 1000;
    if (elapsed > 1) { setPaused(); return; }
    const dt = Math.min(elapsed, .05); previous = now;
    remaining = Math.max(0, remaining - elapsed);
    if (direction) move(x + direction * dt * .9);
    spawn -= dt;
    if (spawn <= 0) { addItem(); spawn = .65 + Math.random() * .25; }
    const basketX = 32 + x * (width - 64), basketY = height - 48;
    items = items.filter(item => {
      const oldY = item.y;
      item.y += item.speed * dt;
      const itemX = 16 + item.x * (width - 32);
      const crossesBasket = oldY + 32 <= basketY + 28 && item.y + 32 >= basketY && item.y <= basketY + 28;
      if (crossesBasket && Math.abs(itemX - basketX) < 44) {
        if (item.bug) { lives--; streak = 0; sound('bug'); }
        else {
          score += 10; streak++;
          if (streak % 3 === 0) { score += 15; sound('bonus'); }
          else sound('star');
        }
        item.node.remove(); return false;
      }
      if (item.y > height) {
        if (!item.bug) streak = 0;
        item.node.remove(); return false;
      }
      item.node.style.transform = `translate(${itemX - 16}px,${item.y}px)`;
      return true;
    });
    stats();
    if (remaining <= 0 || lives <= 0) { lives = Math.max(0,lives); stats(); finish(); return; }
    frame = requestAnimationFrame(tick);
  }
  start.addEventListener('click', run);
  pause.addEventListener('click', () => state === 'running' ? setPaused() : run());
  position.addEventListener('input', () => move(Number(position.value) / 100));
  el('left').addEventListener('click', () => move(x - .14));
  el('right').addEventListener('click', () => move(x + .14));
  function point(event) {
    const rect = field.getBoundingClientRect();
    move((event.clientX - rect.left - 32) / Math.max(1, width - 64));
  }
  field.addEventListener('pointerdown', event => {
    if (state !== 'running') return;
    field.focus({preventScroll:true}); field.setPointerCapture(event.pointerId); point(event);
  });
  field.addEventListener('pointermove', event => {
    if (state === 'running' && (event.pointerType === 'mouse' || field.hasPointerCapture(event.pointerId))) point(event);
  });
  field.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); direction = event.key === 'ArrowLeft' ? -1 : 1;
      move(x + direction * .025);
    }
    if (event.code === 'Space' || event.key === 'Escape') {
      event.preventDefault();
      if (state === 'running') setPaused();
      else if (event.code === 'Space') run();
    }
  });
  field.addEventListener('keyup', () => { direction = 0; });
  field.addEventListener('blur', () => { direction = 0; });
  for (const kind of ['music', 'effects']) el(kind).addEventListener('click', () => {
    if (kind === 'music') { music = !music; syncMusic(); }
    else effects = !effects;
    el(kind).setAttribute('aria-pressed', String(kind === 'music' ? music : effects));
    if (state === 'running') initAudio();
  });
  document.querySelector('.language-link')?.addEventListener('click', event => {
    if (location.hash === '#game') event.currentTarget.hash = 'game';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(); });
  window.addEventListener('pagehide', setPaused);
  window.addEventListener('blur', setPaused);
  new ResizeObserver(geometry).observe(field);
  geometry(); stats();
})();
