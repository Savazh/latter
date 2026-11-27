'use strict';

const arena = document.querySelector('#arena');
const heart = document.querySelector('#heart');
const arrow = document.querySelector('#keyboard-arrow');
const timer = document.querySelector('#timer');
const record = document.querySelector('#record');
const roundNumber = document.querySelector('#round');
const stageLabel = document.querySelector('#stage-label');
const start = document.querySelector('#start');
const replay = document.querySelector('#replay');
const assist = document.querySelector('#assist');
const nearMiss = document.querySelector('#near-miss');
const prize = document.querySelector('#prize');
const result = document.querySelector('#result');
const roundNote = document.querySelector('#round-note');
const gift = document.querySelector('#gift');
const gate = document.querySelector('#gate');
const unlock = document.querySelector('#unlock');
const firstName = document.querySelector('#first-name');
const unlockStatus = document.querySelector('#unlock-status');
const reveal = document.querySelector('#reveal');
const revealTitle = document.querySelector('#reveal-title');
const photos = [...reveal.querySelectorAll('img')];
const confetti = document.querySelector('#confetti');
const announcement = document.querySelector('#announcement');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const touchScreen = matchMedia('(pointer: coarse)');
const localeTime = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const directions = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
const roundMessages = ['Vai, lindinha!', 'Capricha, meu bem!', 'Vai lá, xodó!'];
const catchMessages = [
  'Até o coração quis ficar pertinho de você.',
  'Pronto, já arranjei outra desculpa pra te ver sorrir.',
  'Esse coração corre depressa, mas você pegou direitinho.',
];
const colors = ['#ff83ab', '#ffcfe1', '#ffd89e', '#d997ff', '#fff2dd'];
const recordKey = 'latter-record-v1';

let best = null;
try {
  const saved = Number(localStorage.getItem(recordKey));
  if (saved > 0 && Number.isFinite(saved)) best = saved;
} catch {
  // Keep the round playable when browser storage is disabled.
}

let round = 0;
let frame = 0;
let roundStart = 0;
let previousFrame = 0;
let nextTurn = 0;
let nextPause = 0;
let pauseUntil = 0;
let nearMissTimeout = 0;
let opening = false;
let assisted = false;
let keyboardMode = false;
let playing = false;
let shownTick = -1;
let x = 0;
let y = 0;
let vx = 0;
let vy = 0;
let arrowX = 0;
let arrowY = 0;
let width = 0;
let height = 0;
let inset = 0;
let encryptedPhotos = null;
const heldKeys = new Set();

function formatTime(milliseconds) {
  return `${localeTime.format(milliseconds / 1000)} s`;
}

function updateTimer(milliseconds) {
  const centiseconds = Math.round(milliseconds / 10);
  if (centiseconds === shownTick) return;
  shownTick = centiseconds;
  timer.firstChild.nodeValue = localeTime.format(centiseconds / 100);
}

function updateRecord() {
  record.textContent = best === null ? '—' : formatTime(best);
}

function bound(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

function measureArena() {
  width = arena.clientWidth;
  height = arena.clientHeight;
  inset = heart.offsetWidth / 2 + 8;
}

function drawAim() {
  arrow.style.left = `${arrowX}px`;
  arrow.style.top = `${arrowY}px`;
}

function drawHeart() {
  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;
}

function turn(elapsed) {
  const angle = Math.random() * Math.PI * 2;
  const pace = Math.min(Math.hypot(width, height) * 0.7, 670);
  const slowdown = Math.min(elapsed / 20000, 0.56);
  const speed = pace * (0.81 + Math.random() * 0.42 - slowdown);
  vx = Math.cos(angle) * speed;
  vy = Math.sin(angle) * speed;
  nextTurn = elapsed + 210 + Math.random() * 370;
}

function resting(elapsed) {
  if (!touchScreen.matches) return false;
  if (elapsed >= nextPause) {
    pauseUntil = elapsed + 250;
    nextPause = elapsed + 2600 + Math.random() * 850;
  }
  return elapsed < pauseUntil;
}

function animate(now) {
  const elapsed = now - roundStart;
  const step = Math.min((now - previousFrame) / 1000, 0.033);
  previousFrame = now;
  updateTimer(elapsed);
  if (!assisted && elapsed >= 15000 && assist.hidden) {
    assist.hidden = false;
    announcement.textContent = 'Uma ajudinha está disponível.';
  }

  if (reducedMotion.matches) {
    if (elapsed >= nextTurn) {
      x = inset + Math.random() * (width - inset * 2);
      y = inset + Math.random() * (height - inset * 2);
      nextTurn = elapsed + (assisted ? 1450 : 850);
      drawHeart();
    }
  } else if (!resting(elapsed)) {
    if (elapsed >= nextTurn) turn(elapsed);
    const movement = step * (assisted ? 0.55 : 1);
    x += vx * movement;
    y += vy * movement;
    if (x < inset || x > width - inset) vx *= -1;
    if (y < inset || y > height - inset) vy *= -1;
    x = bound(x, inset, width - inset);
    y = bound(y, inset, height - inset);
    drawHeart();
  }

  if (heldKeys.size) {
    for (const key of heldKeys) {
      const [dx, dy] = directions[key];
      arrowX = bound(arrowX + dx * 540 * step, 0, width);
      arrowY = bound(arrowY + dy * 540 * step, 0, height);
    }
    drawAim();
  }

  frame = requestAnimationFrame(animate);
}

function beginRound(event) {
  if (playing) return;
  round += 1;
  playing = true;
  keyboardMode = event.detail === 0;
  opening = false;
  assisted = false;
  nextPause = 2300;
  pauseUntil = 0;
  heldKeys.clear();
  roundNumber.textContent = String(round).padStart(2, '0');
  stageLabel.textContent = roundMessages[(round - 1) % roundMessages.length];
  announcement.textContent = `Rodada ${round}. ${stageLabel.textContent}`;
  updateTimer(0);

  start.hidden = true;
  replay.hidden = true;
  assist.hidden = true;
  prize.hidden = true;
  reveal.hidden = true;
  for (const photo of photos) {
    if (!photo.hasAttribute('src')) continue;
    URL.revokeObjectURL(photo.src);
    photo.removeAttribute('src');
  }
  confetti.replaceChildren();
  gift.classList.remove('is-opening');
  gift.removeAttribute('aria-disabled');
  arena.dataset.state = 'playing';
  heart.hidden = false;
  heart.disabled = false;
  arrow.hidden = !keyboardMode;
  measureArena();
  x = width / 2;
  y = height / 2;
  arrowX = width / 2;
  arrowY = height * 0.78;
  drawHeart();
  drawAim();

  arena.tabIndex = 0;
  arena.focus({ preventScroll: true });
  roundStart = performance.now();
  previousFrame = roundStart;
  turn(0);
  if (reducedMotion.matches) nextTurn = 850;
  frame = requestAnimationFrame(animate);
}

function showNearMiss() {
  nearMiss.hidden = false;
  window.clearTimeout(nearMissTimeout);
  nearMissTimeout = window.setTimeout(() => { nearMiss.hidden = true; }, 680);
}

function slowHeart() {
  if (!playing || assisted) return;
  assisted = true;
  assist.hidden = true;
  stageLabel.textContent = 'Agora vai, meu bem!';
  announcement.textContent = 'Ajudinha ativada. O coração ficou mais devagar.';
  arena.focus({ preventScroll: true });
}

function celebrate(originX, originY) {
  if (reducedMotion.matches) return;
  const pieces = document.createDocumentFragment();
  for (let index = 0; index < 32; index += 1) {
    const particle = document.createElement('i');
    const angle = index * Math.PI / 16;
    const distance = 55 + Math.random() * 130;
    particle.className = 'particle';
    particle.style.setProperty('--x', `${originX}px`);
    particle.style.setProperty('--y', `${originY}px`);
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance + 28}px`);
    particle.style.setProperty('--turn', `${Math.random() * 660 - 330}deg`);
    particle.style.setProperty('--color', colors[index % colors.length]);
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
    pieces.append(particle);
  }
  confetti.append(pieces);
}

function catchHeart() {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(frame);
  heldKeys.clear();
  window.clearTimeout(nearMissTimeout);
  nearMiss.hidden = true;
  assist.hidden = true;
  const elapsed = Math.max(1, performance.now() - roundStart);
  updateTimer(elapsed);
  const newRecord = !assisted && (best === null || elapsed < best);
  if (newRecord) {
    best = elapsed;
    try {
      localStorage.setItem(recordKey, String(best));
    } catch {
      // The current session still has a record.
    }
    updateRecord();
  }

  arena.dataset.state = 'caught';
  arena.removeAttribute('tabindex');
  heart.hidden = true;
  arrow.hidden = true;
  stageLabel.textContent = 'Você pegou!';
  const status = assisted ? 'Com ajudinha' : newRecord ? 'Novo recorde!' : '';
  result.textContent = [formatTime(elapsed), status].filter(Boolean).join(' · ');
  roundNote.textContent = catchMessages[(round - 1) % catchMessages.length];
  announcement.textContent = `Você pegou em ${formatTime(elapsed)}. ${newRecord ? 'Novo recorde!' : ''}`;
  prize.hidden = false;
  celebrate(x, y);
  gift.focus({ preventScroll: true });
}

function openGift() {
  if (opening) return;
  opening = true;
  gift.classList.add('is-opening');
  gift.setAttribute('aria-disabled', 'true');
  window.setTimeout(() => {
    prize.hidden = true;
    gate.hidden = false;
    arena.dataset.state = 'locked';
    stageLabel.textContent = 'Só pra você';
    unlock.reset();
    unlockStatus.textContent = '';
    firstName.removeAttribute('aria-invalid');
    firstName.focus();
  }, reducedMotion.matches ? 0 : 330);
}

async function decryptPhotos(name) {
  if (encryptedPhotos === null) {
    const response = await fetch('./assets/presente.bin');
    if (!response.ok) throw new Error('Photo download failed');
    encryptedPhotos = await response.arrayBuffer();
  }

  // The file starts with a 16-byte salt and a 12-byte AES-GCM nonce.
  const salt = new Uint8Array(encryptedPhotos, 0, 16);
  const iv = new Uint8Array(encryptedPhotos, 16, 12);
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(name), 'PBKDF2', false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    material, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );

  let bytes;
  try {
    bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedPhotos.slice(28));
  } catch (error) {
    if (error.name === 'OperationError') return null;
    throw error;
  }
  // The decrypted payload stores the first image's length followed by both images.
  const secondStart = 4 + new DataView(bytes).getUint32(0);
  return [bytes.slice(4, secondStart), bytes.slice(secondStart)];
}

async function unlockGift(event) {
  event.preventDefault();
  const name = firstName.value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
  if (!name) {
    firstName.setAttribute('aria-invalid', 'true');
    unlockStatus.textContent = 'Escreva seu primeiro nome.';
    firstName.focus();
    return;
  }

  const button = event.currentTarget.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  firstName.readOnly = true;
  firstName.removeAttribute('aria-invalid');
  unlockStatus.textContent = 'Abrindo o presente…';
  try {
    const images = await decryptPhotos(name);
    if (images === null) {
      firstName.setAttribute('aria-invalid', 'true');
      unlockStatus.textContent = 'Esse nome não abriu o presente. Tenta de novo?';
      return;
    }

    photos.forEach((photo, index) => {
      photo.src = URL.createObjectURL(new Blob([images[index]], { type: 'image/webp' }));
    });
    unlock.reset();
    gate.hidden = true;
    reveal.hidden = false;
    replay.hidden = false;
    arena.dataset.state = 'revealed';
    stageLabel.textContent = 'Pra você, meu bem';
    celebrate(arena.clientWidth / 2, arena.clientHeight / 2);
    revealTitle.focus({ preventScroll: true });
  } catch {
    unlockStatus.textContent = 'Não consegui abrir o presente agora. Tenta de novo em instantes.';
  } finally {
    button.disabled = false;
    firstName.readOnly = false;
    if (!gate.hidden) firstName.focus();
  }
}

start.addEventListener('click', beginRound);
replay.addEventListener('click', beginRound);
assist.addEventListener('click', slowHeart);
gift.addEventListener('click', openGift);
unlock.addEventListener('submit', unlockGift);
heart.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  catchHeart();
});
heart.addEventListener('click', (event) => {
  if (event.detail === 0) catchHeart();
});
arena.addEventListener('pointerdown', (event) => {
  if (!playing || !event.isPrimary || event.button !== 0) return;
  const bounds = arena.getBoundingClientRect();
  const distance = Math.hypot(event.clientX - bounds.left - x, event.clientY - bounds.top - arena.clientTop - y);
  if (distance <= inset + 35) showNearMiss();
});

arena.addEventListener('keydown', (event) => {
  if (!playing) return;
  const direction = Object.hasOwn(directions, event.key);
  if (!direction && event.code !== 'Space') return;
  event.preventDefault();
  if (!keyboardMode) {
    keyboardMode = true;
    arrow.hidden = false;
  }
  if (direction) {
    heldKeys.add(event.key);
  } else {
    const distance = Math.hypot(arrowX - x, arrowY - y);
    if (distance <= inset - 4) catchHeart();
    else if (distance <= inset + 35) showNearMiss();
  }
});
window.addEventListener('keyup', (event) => heldKeys.delete(event.key));
arena.addEventListener('blur', () => heldKeys.clear());
arena.addEventListener('pointermove', (event) => {
  if (!keyboardMode || event.pointerType !== 'mouse') return;
  keyboardMode = false;
  arrow.hidden = true;
  heldKeys.clear();
});

new ResizeObserver(() => {
  if (!playing) return;
  measureArena();
  x = bound(x, inset, width - inset);
  y = bound(y, inset, height - inset);
  arrowX = bound(arrowX, 0, width);
  arrowY = bound(arrowY, 0, height);
  drawHeart();
  drawAim();
}).observe(arena);

updateRecord();
