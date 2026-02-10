/**
 * Feed the Silly Monster
 *
 * A counting game for ages 4–6.
 * The monster asks for N food items. The child drags items
 * from the tray into the monster's mouth, then presses
 * "All done!" to check their answer.
 *
 * Mechanic:
 *   - Monster requests N items (speech bubble)
 *   - Tray shows N + extras (distractors)
 *   - Child drags items freely; a counter shows how many fed
 *   - Child presses "All done!" when they think it's right
 *   - Correct → celebration
 *   - Too few → encouraging "I'm still hungry!" (keep going)
 *   - Too many → gentle "Too full!" + restart same target
 *   - After 3 correct rounds, level increases (higher N)
 *
 * Drag implementation uses pointer events for mouse + touch support.
 */

import { GameRegistry } from '../registry.js';
import { Audio } from '../audio.js';

// ── Food types ──
const FOODS = [
  { name: 'apple',      emoji: '\u{1F34E}', plural: 'apples' },
  { name: 'banana',     emoji: '\u{1F34C}', plural: 'bananas' },
  { name: 'orange',     emoji: '\u{1F34A}', plural: 'oranges' },
  { name: 'grapes',     emoji: '\u{1F347}', plural: 'grapes' },
  { name: 'strawberry', emoji: '\u{1F353}', plural: 'strawberries' },
  { name: 'cookie',     emoji: '\u{1F36A}', plural: 'cookies' },
  { name: 'cupcake',    emoji: '\u{1F9C1}', plural: 'cupcakes' },
  { name: 'carrot',     emoji: '\u{1F955}', plural: 'carrots' },
];

// ── Monster speech templates ──
const REQUESTS = [
  (n, f) => `I want ${n} ${n === 1 ? f.name : f.plural}!`,
  (n, f) => `Feed me ${n} ${n === 1 ? f.name : f.plural}!`,
  (n, f) => `Can I have ${n} ${n === 1 ? f.name : f.plural}?`,
  (n, f) => `Yum! I'd love ${n} ${n === 1 ? f.name : f.plural}!`,
];

const SUCCESS_MSGS = [
  'Yummy! Thank you! \u{1F60B}',
  'That was delicious! \u{1F924}',
  'My tummy is so happy! \u{1F49A}',
  'Mmm, perfect! You\'re amazing! \u{2B50}',
  'So yummy! You\'re the best! \u{1F31F}',
];

const TOO_FEW_MSGS = [
  'I\'m still hungry! Feed me more! \u{1F60A}',
  'Yum, but I need more! \u{1F37D}\u{FE0F}',
  'My tummy wants more! \u{1F609}',
];

const TOO_MANY_MSGS = [
  'Oops, my tummy is too full! Let\'s try again! \u{1F605}',
  'Whoa, that\'s too many! One more try! \u{1F61D}',
  'So much food! Let\'s count again! \u{1F60A}',
];

// ── Level scaling ──
// level → { min target, max target, extra distractors }
const LEVELS = [
  { min: 1, max: 2, extra: 2 },
  { min: 2, max: 3, extra: 2 },
  { min: 3, max: 4, extra: 3 },
  { min: 4, max: 5, extra: 3 },
  { min: 5, max: 6, extra: 3 },
];

function levelConfig(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════
//  Game object
// ═══════════════════════════════════════════

const FeedMonsterGame = {
  // Registry metadata
  id: 'feed-monster',
  title: 'Feed the Monster',
  category: 'counting',
  thumbnail: '\u{1F47E}',
  description: 'Count and feed the hungry monster!',
  ageRange: [4, 6],

  // Private state (reset on each init)
  _container: null,
  _callbacks: null,
  _el: null,         // cached DOM references
  _state: null,
  _drag: null,       // active drag tracking
  _destroyed: false,

  // ── Lifecycle ──

  init(container, callbacks) {
    this._container = container;
    this._callbacks = callbacks;
    this._destroyed = false;
    this._drag = null;

    this._buildDOM();

    // Load saved progress, then start
    callbacks.getProgress().then(progress => {
      this._state = {
        level: progress.currentLevel || 1,
        roundsInLevel: 0,
        roundsToAdvance: 3,   // rounds before level-up
        target: 0,
        fed: 0,
        food: null,
        celebrating: false,
      };
      this._startRound();
    });
  },

  destroy() {
    this._destroyed = true;
    this._cleanupDrag();
    if (this._container) this._container.innerHTML = '';
    this._container = null;
    this._callbacks = null;
    this._el = null;
    this._state = null;
  },

  // ── Build the game DOM ──

  _buildDOM() {
    this._container.innerHTML = `
      <div class="fm-game">
        <button class="fm-exit-btn" id="fm-exit">\u{2715}</button>

        <div class="fm-stage">
          <div class="fm-speech-bubble">
            <span id="fm-speech"></span>
          </div>

          <div class="fm-monster" id="fm-monster">
            <div class="fm-antenna fm-left"></div>
            <div class="fm-antenna fm-right"></div>
            <div class="fm-body">
              <div class="fm-eye fm-left"><div class="fm-pupil"></div></div>
              <div class="fm-eye fm-right"><div class="fm-pupil"></div></div>
              <div class="fm-mouth" id="fm-mouth"></div>
            </div>
            <div class="fm-feet">
              <div class="fm-foot"></div>
              <div class="fm-foot"></div>
            </div>
          </div>

          <div class="fm-progress" id="fm-progress"></div>
          <button class="fm-check-btn" id="fm-check">All done! \u{2705}</button>
          <div class="fm-feedback" id="fm-feedback"></div>
        </div>

        <div class="fm-tray" id="fm-tray"></div>
        <div class="fm-confetti" id="fm-confetti"></div>
      </div>`;

    // Cache references
    this._el = {
      speech:   this._container.querySelector('#fm-speech'),
      monster:  this._container.querySelector('#fm-monster'),
      mouth:    this._container.querySelector('#fm-mouth'),
      progress: this._container.querySelector('#fm-progress'),
      checkBtn: this._container.querySelector('#fm-check'),
      feedback: this._container.querySelector('#fm-feedback'),
      tray:     this._container.querySelector('#fm-tray'),
      confetti: this._container.querySelector('#fm-confetti'),
    };

    // Exit button
    this._container.querySelector('#fm-exit').addEventListener('click', () => {
      Audio.click();
      this._callbacks.onExit();
    });

    // Check button
    this._el.checkBtn.addEventListener('click', () => {
      Audio.click();
      this._checkAnswer();
    });
  },

  // ── Round management ──

  _startRound() {
    if (this._destroyed) return;

    const cfg = levelConfig(this._state.level);
    const target = randInt(cfg.min, cfg.max);
    const food = randFrom(FOODS);
    const totalItems = target + cfg.extra;

    Object.assign(this._state, { target, food, fed: 0, celebrating: false });

    // Speech
    this._el.speech.textContent = randFrom(REQUESTS)(target, food);

    // Reset monster mood
    this._el.monster.classList.remove('fm-happy', 'fm-eating');

    // Reset check button and feedback
    this._el.checkBtn.style.display = '';
    this._el.checkBtn.disabled = true;
    this._el.feedback.textContent = '';
    this._el.feedback.className = 'fm-feedback';

    // Progress counter
    this._renderProgress();

    // Food tray
    this._renderTray(totalItems, food);
  },

  _renderProgress() {
    const { fed, food } = this._state;
    if (fed === 0) {
      this._el.progress.innerHTML = `<span class="fm-counter-label">Fed: 0</span>`;
    } else {
      // Show the emoji items fed + the count as a number
      let emojis = '';
      for (let i = 0; i < fed; i++) {
        emojis += `<span class="fm-dot fm-filled">${food.emoji}</span>`;
      }
      this._el.progress.innerHTML = emojis + `<span class="fm-counter-num">${fed}</span>`;
    }

    // Enable the check button once at least one item has been fed
    this._el.checkBtn.disabled = fed === 0;
  },

  _renderTray(count, food) {
    this._el.tray.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const item = document.createElement('button');
      item.className = 'fm-food-item';
      item.textContent = food.emoji;
      item.setAttribute('aria-label', food.name);
      item.style.animationDelay = `${i * 0.07}s`;
      this._attachDrag(item);
      this._el.tray.appendChild(item);
    }
  },

  // ── Drag and drop (pointer events — works on mouse + touch) ──

  _attachDrag(element) {
    element.style.touchAction = 'none'; // prevent scroll while dragging

    element.addEventListener('pointerdown', (e) => {
      if (this._state.celebrating || this._drag) return;
      e.preventDefault();

      const rect = element.getBoundingClientRect();

      // Create a floating clone that follows the pointer
      const clone = element.cloneNode(true);
      clone.className = 'fm-food-item fm-dragging';
      Object.assign(clone.style, {
        position: 'fixed',
        left: rect.left + 'px',
        top: rect.top + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        zIndex: '1000',
        pointerEvents: 'none',
        margin: '0',
      });
      document.body.appendChild(clone);

      element.classList.add('fm-drag-source');
      Audio.pop();

      this._drag = {
        element,
        clone,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };

      const onMove = (e) => {
        if (!this._drag) return;
        this._drag.clone.style.left = (e.clientX - this._drag.offsetX) + 'px';
        this._drag.clone.style.top  = (e.clientY - this._drag.offsetY) + 'px';

        // Highlight monster when hovering near
        const monsterRect = this._el.monster.getBoundingClientRect();
        const isNear = (
          e.clientX >= monsterRect.left - 20 &&
          e.clientX <= monsterRect.right + 20 &&
          e.clientY >= monsterRect.top - 20 &&
          e.clientY <= monsterRect.bottom + 20
        );
        this._el.mouth.classList.toggle('fm-mouth-hover', isNear);
      };

      const onUp = (e) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        if (!this._drag) return;

        // Hit-test against the whole monster body (generous target)
        const monsterRect = this._el.monster.getBoundingClientRect();
        const hit = (
          e.clientX >= monsterRect.left - 10 &&
          e.clientX <= monsterRect.right + 10 &&
          e.clientY >= monsterRect.top - 10 &&
          e.clientY <= monsterRect.bottom + 10
        );

        if (hit && !this._state.celebrating) {
          this._feedMonster(this._drag.element);
        }

        // Clean up
        this._drag.clone.remove();
        this._drag.element.classList.remove('fm-drag-source');
        this._el.mouth.classList.remove('fm-mouth-hover');
        this._drag = null;
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  },

  _cleanupDrag() {
    if (this._drag) {
      this._drag.clone.remove();
      this._drag = null;
    }
  },

  // ── Feeding logic ──

  _feedMonster(element) {
    if (this._state.celebrating) return;

    this._state.fed++;

    // Animate item away
    element.classList.add('fm-eaten');
    setTimeout(() => element.remove(), 300);

    // Monster eats
    Audio.munch();
    this._el.monster.classList.add('fm-eating');
    setTimeout(() => {
      if (!this._destroyed) this._el.monster.classList.remove('fm-eating');
    }, 400);

    // Update counter
    this._renderProgress();
  },

  // ── Answer checking ──

  _checkAnswer() {
    if (this._state.celebrating) return;
    const { fed, target } = this._state;

    if (fed === target) {
      // Correct!
      this._celebrate();
    } else if (fed < target) {
      // Too few — encourage, keep going
      Audio.gentle();
      this._el.feedback.textContent = randFrom(TOO_FEW_MSGS);
      this._el.feedback.className = 'fm-feedback fm-feedback-show fm-feedback-nudge';
      this._el.monster.classList.add('fm-thinking');
      setTimeout(() => {
        if (!this._destroyed) this._el.monster.classList.remove('fm-thinking');
      }, 800);
    } else {
      // Too many — gentle restart with same target
      Audio.gentle();
      this._el.feedback.textContent = randFrom(TOO_MANY_MSGS);
      this._el.feedback.className = 'fm-feedback fm-feedback-show fm-feedback-oops';
      this._el.checkBtn.style.display = 'none';

      // Disable dragging during reset
      this._el.tray.querySelectorAll('.fm-food-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.3';
      });

      // Restart same round after a pause
      setTimeout(() => {
        if (this._destroyed) return;
        const food = this._state.food;
        const cfg = levelConfig(this._state.level);
        const totalItems = this._state.target + cfg.extra;
        this._state.fed = 0;
        this._state.celebrating = false;
        this._el.monster.classList.remove('fm-happy', 'fm-eating');
        this._el.speech.textContent = randFrom(REQUESTS)(this._state.target, food);
        this._el.checkBtn.style.display = '';
        this._el.checkBtn.disabled = true;
        this._el.feedback.textContent = '';
        this._el.feedback.className = 'fm-feedback';
        this._renderProgress();
        this._renderTray(totalItems, food);
      }, 2200);
    }
  },

  // ── Celebration sequence ──

  _celebrate() {
    this._state.celebrating = true;
    this._state.roundsInLevel++;

    // Happy monster
    this._el.monster.classList.add('fm-happy');
    this._el.speech.textContent = randFrom(SUCCESS_MSGS);
    this._el.checkBtn.style.display = 'none';
    this._el.feedback.textContent = '';
    this._el.feedback.className = 'fm-feedback';
    Audio.celebrate();

    // Confetti burst
    this._spawnConfetti();

    // Disable remaining food items
    this._el.tray.querySelectorAll('.fm-food-item').forEach(item => {
      item.style.pointerEvents = 'none';
      item.style.opacity = '0.3';
    });

    // Level up?
    if (this._state.roundsInLevel >= this._state.roundsToAdvance) {
      this._state.level = Math.min(this._state.level + 1, LEVELS.length);
      this._state.roundsInLevel = 0;
    }

    // Save progress
    this._callbacks.onProgress({
      currentLevel: this._state.level,
      bestLevel: this._state.level,
    });

    // Next round after a pause
    setTimeout(() => {
      if (!this._destroyed) this._startRound();
    }, 2800);
  },

  _spawnConfetti() {
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BCB', '#A66CFF'];
    const el = this._el.confetti;
    el.innerHTML = '';

    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'fm-particle';
      p.style.backgroundColor = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 24;
      const dist = 80 + Math.random() * 120;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist - 40 + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      el.appendChild(p);
    }

    setTimeout(() => {
      if (!this._destroyed) el.innerHTML = '';
    }, 1200);
  },
};

// Self-register with the platform
GameRegistry.register(FeedMonsterGame);
