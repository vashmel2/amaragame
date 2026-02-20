/**
 * Number Hop
 *
 * A skip-counting game for ages 4–7.
 * The child picks a mode (by 2s, 5s, or 10s) and guides a frog
 * across 5 lily pads by filling in the missing numbers one at a time.
 *
 * Mechanic:
 *   - 5 pads shown: first pad has a number, remaining 4 are "?"
 *   - The last pad is the goal (flag marker, distinct color)
 *   - Child picks the correct next number from 3 choices
 *   - Correct → pad reveals, frog hops, new choices appear
 *   - Wrong → pad wiggles, choice grays out, try again
 *   - Frog reaches the goal pad → celebration + "Next Level"
 *
 * Level progression:
 *   By 2s  → Level 1: 2,4,6,8,10  | Level 2: 12,14,16,18,20  | ...
 *   By 5s  → Level 1: 5,10,15,20,25 | Level 2: 30,35,40,45,50 | ...
 *   By 10s → Level 1: 10,20,30,40,50 | Level 2: 60,70,80,90,100 | ...
 *
 * Progress per mode is saved so the child resumes where they left off.
 */

import { GameRegistry } from '../registry.js';
import { Audio } from '../audio.js';

// ── Mode definitions ──
const MODES = [
  { step: 2,  label: 'Count by 2s',  icon: '\u{270C}\u{FE0F}', color: '#FF9F43', max: 100 },
  { step: 5,  label: 'Count by 5s',  icon: '\u{1F590}\u{FE0F}', color: '#54A0FF', max: 200 },
  { step: 10, label: 'Count by 10s', icon: '\u{1F51F}', color: '#5F27CD', max: 500 },
];

const HOP_MSGS = [
  'Yes! \u{1F438}',
  'Nice! \u{2B50}',
  'Keep going! \u{1F4AA}',
  'You got it! \u{1F31F}',
];

const GOAL_MSGS = [
  'Amazing! You made it! \u{1F389}',
  'The frog is so happy! \u{1F438}\u{2728}',
  'Perfect counting! \u{1F31F}\u{1F31F}\u{1F31F}',
  'You\'re a counting star! \u{2B50}',
];

const WRONG_MSGS = [
  'Not quite \u{2014} try again!',
  'Hmm, look at the pattern!',
  'Almost! Try another one!',
];

// ── Helpers ──

function generateSequence(step, level) {
  const start = step * ((level - 1) * 5 + 1);
  return Array.from({ length: 5 }, (_, i) => start + step * i);
}

function generateChoices(answer, step) {
  const candidates = [
    answer + step, answer - step,
    answer + 1,    answer - 1,
    answer + step * 2, answer - step * 2,
    answer + 2,    answer - 2,
  ].filter(n => n > 0 && n !== answer);

  const unique = [...new Set(candidates)].sort(() => Math.random() - 0.5);
  const wrong = unique.slice(0, 2);
  return [answer, ...wrong].sort(() => Math.random() - 0.5);
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════
//  Game object
// ═══════════════════════════════════════════

const NumberHopGame = {
  id: 'number-hop',
  title: 'Number Hop',
  category: 'counting',
  thumbnail: '\u{1F438}',
  description: 'Skip count with a hopping frog!',
  ageRange: [4, 7],

  _container: null,
  _callbacks: null,
  _el: null,
  _state: null,
  _destroyed: false,

  // ── Lifecycle ──

  init(container, callbacks) {
    this._container = container;
    this._callbacks = callbacks;
    this._destroyed = false;

    callbacks.getProgress().then(progress => {
      this._state = {
        mode: null,
        level: 1,
        sequence: [],
        currentStep: 1,    // which pad to fill next (1–4, pad 0 is given)
        modeLevels: progress.custom?.modeLevels || {},
      };
      this._showModeSelect();
    });
  },

  destroy() {
    this._destroyed = true;
    if (this._container) this._container.innerHTML = '';
    this._container = null;
    this._callbacks = null;
    this._el = null;
    this._state = null;
  },

  // ══════════════════════════════════════
  //  Mode selection screen
  // ══════════════════════════════════════

  _showModeSelect() {
    this._container.innerHTML = `
      <div class="nh-game">
        <button class="fm-exit-btn" id="nh-exit">\u{2715}</button>
        <div class="nh-mode-screen">
          <div class="nh-mode-icon">\u{1F438}</div>
          <h2 class="nh-mode-title">Number Hop!</h2>
          <p class="nh-mode-sub">Pick how to count:</p>
          <div class="nh-mode-grid">
            ${MODES.map(m => {
              const lvl = this._state.modeLevels[m.step] || 1;
              const seq = generateSequence(m.step, lvl);
              return `
                <button class="nh-mode-btn" data-step="${m.step}" style="--mode-color: ${m.color}">
                  <span class="nh-mode-btn-icon">${m.icon}</span>
                  <span class="nh-mode-btn-info">
                    <span class="nh-mode-btn-label">${m.label}</span>
                    <span class="nh-mode-btn-level">Level ${lvl} \u{00B7} ${seq[0]}\u{2013}${seq[4]}</span>
                  </span>
                  ${lvl > 1 ? `<span class="nh-reset-btn" data-step="${m.step}" title="Reset to Level 1">\u{21BA}</span>` : ''}
                </button>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    this._container.querySelector('#nh-exit').addEventListener('click', () => {
      Audio.click();
      this._callbacks.onExit();
    });

    this._container.querySelectorAll('.nh-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Audio.pop();
        this._startMode(parseInt(btn.dataset.step));
      });
    });

    this._container.querySelectorAll('.nh-reset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Audio.click();
        const step = parseInt(btn.dataset.step);
        this._state.modeLevels[step] = 1;
        this._callbacks.onProgress({
          custom: { modeLevels: { ...this._state.modeLevels } },
        });
        this._showModeSelect();
      });
    });
  },

  // ══════════════════════════════════════
  //  Game screen
  // ══════════════════════════════════════

  _startMode(step) {
    this._state.mode = step;
    this._state.level = this._state.modeLevels[step] || 1;
    this._buildGameScreen();
    this._startLevel();
  },

  _buildGameScreen() {
    this._container.innerHTML = `
      <div class="nh-game">
        <div class="nh-header">
          <button class="fm-exit-btn" id="nh-back">\u{2190}</button>
          <span class="nh-level-label" id="nh-level-label"></span>
          <button class="nh-peek-btn" id="nh-peek">\u{1F4A1} Peek</button>
        </div>
        <div class="nh-stage">
          <div class="nh-instruction" id="nh-instruction"></div>
          <div class="nh-pond" id="nh-pond">
            <div class="nh-frog" id="nh-frog">\u{1F438}</div>
          </div>
          <div class="nh-feedback" id="nh-feedback"></div>
          <div class="nh-choices" id="nh-choices"></div>
          <button class="nh-next-btn" id="nh-next" style="display:none">Next Level \u{2192}</button>
        </div>
        <div class="fm-confetti" id="nh-confetti"></div>
      </div>`;

    this._el = {
      levelLabel: this._container.querySelector('#nh-level-label'),
      instruction: this._container.querySelector('#nh-instruction'),
      pond: this._container.querySelector('#nh-pond'),
      frog: this._container.querySelector('#nh-frog'),
      choices: this._container.querySelector('#nh-choices'),
      feedback: this._container.querySelector('#nh-feedback'),
      nextBtn: this._container.querySelector('#nh-next'),
      confetti: this._container.querySelector('#nh-confetti'),
    };

    this._container.querySelector('#nh-back').addEventListener('click', () => {
      Audio.click();
      this._showModeSelect();
    });

    this._container.querySelector('#nh-peek').addEventListener('click', () => {
      Audio.pop();
      this._showPeekChart();
    });

    this._el.nextBtn.addEventListener('click', () => {
      Audio.click();
      this._state.level++;
      this._startLevel();
    });
  },

  // ══════════════════════════════════════
  //  Level & step logic
  // ══════════════════════════════════════

  _startLevel() {
    if (this._destroyed) return;

    const { mode, level } = this._state;
    const sequence = generateSequence(mode, level);

    this._state.sequence = sequence;
    this._state.currentStep = 1;

    // Header
    const modeInfo = MODES.find(m => m.step === mode);
    this._el.levelLabel.textContent = `${modeInfo.label} \u{2014} Level ${level}`;
    this._el.instruction.textContent = `${modeInfo.label}! Help the frog reach ${sequence[4]}!`;

    // Reset UI
    this._el.feedback.textContent = '';
    this._el.feedback.className = 'nh-feedback';
    this._el.nextBtn.style.display = 'none';

    // Build the pond
    this._renderPond();

    // Position frog on the first pad
    this._el.frog.style.opacity = '0';
    requestAnimationFrame(() => {
      if (this._destroyed) return;
      this._positionFrog(0, false);
      this._el.frog.style.opacity = '1';
    });

    // Show choices for step 1
    this._showStepChoices();
  },

  _renderPond() {
    const { sequence, currentStep } = this._state;
    const frog = this._el.frog;

    this._el.pond.innerHTML = '';
    this._el.pond.appendChild(frog);

    sequence.forEach((num, i) => {
      // Arrow between pads
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'nh-arrow';
        arrow.textContent = '\u{2192}';
        this._el.pond.appendChild(arrow);
      }

      const pad = document.createElement('div');
      pad.className = 'nh-pad';
      pad.dataset.index = i;

      if (i === 0) {
        // Starting pad — always revealed
        pad.textContent = num;
      } else if (i === 4) {
        // Goal pad
        pad.classList.add('nh-goal');
        if (i === currentStep) {
          pad.classList.add('nh-current');
          pad.textContent = '?';
        } else if (i < currentStep) {
          pad.classList.add('nh-revealed');
          pad.textContent = num;
        } else {
          pad.classList.add('nh-upcoming');
          pad.textContent = '?';
        }
      } else if (i < currentStep) {
        // Already answered
        pad.classList.add('nh-revealed');
        pad.textContent = num;
      } else if (i === currentStep) {
        // Current question
        pad.classList.add('nh-current');
        pad.textContent = '?';
      } else {
        // Future — muted
        pad.classList.add('nh-upcoming');
        pad.textContent = '?';
      }

      this._el.pond.appendChild(pad);
    });
  },

  _showStepChoices() {
    if (this._destroyed) return;
    const { sequence, currentStep, mode } = this._state;
    const answer = sequence[currentStep];
    const choices = generateChoices(answer, mode);

    this._el.choices.innerHTML = '';
    choices.forEach((value, i) => {
      const btn = document.createElement('button');
      btn.className = 'nh-choice-btn';
      btn.textContent = value;
      btn.style.animationDelay = `${i * 0.07}s`;
      btn.addEventListener('click', () => this._handleChoice(value, btn));
      this._el.choices.appendChild(btn);
    });
  },

  // ══════════════════════════════════════
  //  Frog positioning
  // ══════════════════════════════════════

  _positionFrog(padIndex, animate) {
    const pads = this._el.pond.querySelectorAll('.nh-pad');
    const pad = pads[padIndex];
    if (!pad || !this._el.frog) return;

    const pondRect = this._el.pond.getBoundingClientRect();
    const padRect = pad.getBoundingClientRect();
    const left = padRect.left - pondRect.left + padRect.width / 2;

    this._el.frog.style.transition = animate ? 'left 0.4s ease' : 'none';
    this._el.frog.style.left = left + 'px';

    if (animate) {
      this._el.frog.classList.add('nh-hopping');
      setTimeout(() => {
        if (!this._destroyed) this._el.frog.classList.remove('nh-hopping');
      }, 500);
    }
  },

  // ══════════════════════════════════════
  //  Choice handling
  // ══════════════════════════════════════

  _handleChoice(value, btn) {
    const { sequence, currentStep } = this._state;
    const answer = sequence[currentStep];

    if (value === answer) {
      // ── Correct ──
      Audio.success();
      btn.classList.add('nh-correct');

      // Disable all choices during transition
      this._el.choices.querySelectorAll('.nh-choice-btn').forEach(b => {
        b.disabled = true;
      });

      // Reveal the pad
      const pads = this._el.pond.querySelectorAll('.nh-pad');
      const pad = pads[currentStep];
      pad.textContent = answer;
      pad.classList.remove('nh-current', 'nh-upcoming');
      pad.classList.add('nh-revealed');

      // Hop frog
      this._positionFrog(currentStep, true);

      // Is this the goal (last pad)?
      if (currentStep === 4) {
        // Goal reached!
        this._el.feedback.textContent = randFrom(GOAL_MSGS);
        this._el.feedback.className = 'nh-feedback nh-feedback-show nh-feedback-success';

        // Mark goal as complete
        pad.classList.add('nh-goal-complete');

        // Big celebration
        setTimeout(() => {
          if (this._destroyed) return;
          Audio.celebrate();
          this._spawnConfetti();
        }, 400);

        // Save progress
        this._state.modeLevels[this._state.mode] = this._state.level + 1;
        this._callbacks.onProgress({
          currentLevel: this._state.level,
          custom: { modeLevels: { ...this._state.modeLevels } },
        });

        // Show next level button
        setTimeout(() => {
          if (!this._destroyed) this._el.nextBtn.style.display = '';
        }, 1500);

      } else {
        // More pads to go — advance to next step
        this._el.feedback.textContent = randFrom(HOP_MSGS);
        this._el.feedback.className = 'nh-feedback nh-feedback-show nh-feedback-success';

        this._state.currentStep++;

        // Highlight the next pad as current
        const nextPad = pads[this._state.currentStep];
        if (nextPad) {
          nextPad.classList.remove('nh-upcoming');
          nextPad.classList.add('nh-current');
        }

        // Show new choices after the hop animation
        setTimeout(() => {
          if (this._destroyed) return;
          this._el.feedback.textContent = '';
          this._el.feedback.className = 'nh-feedback';
          this._showStepChoices();
        }, 800);
      }

    } else {
      // ── Wrong ──
      Audio.gentle();
      btn.classList.add('nh-wrong');
      btn.disabled = true;

      this._el.feedback.textContent = randFrom(WRONG_MSGS);
      this._el.feedback.className = 'nh-feedback nh-feedback-show nh-feedback-nudge';

      // Wiggle the current pad
      const pads = this._el.pond.querySelectorAll('.nh-pad');
      const currentPad = pads[currentStep];
      currentPad.classList.add('nh-wiggle');
      setTimeout(() => {
        if (!this._destroyed) currentPad.classList.remove('nh-wiggle');
      }, 500);
    }
  },

  // ══════════════════════════════════════
  //  Confetti
  // ══════════════════════════════════════

  _spawnConfetti() {
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BCB', '#A66CFF'];
    const el = this._el.confetti;
    el.innerHTML = '';

    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'fm-particle';
      p.style.backgroundColor = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 24;
      const dist = 70 + Math.random() * 120;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist - 30 + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      el.appendChild(p);
    }

    setTimeout(() => {
      if (!this._destroyed) el.innerHTML = '';
    }, 1200);
  },

  // ══════════════════════════════════════
  //  Peek chart
  // ══════════════════════════════════════

  _showPeekChart() {
    const modeInfo = MODES.find(m => m.step === this._state.mode);
    const { step, max, label } = modeInfo;

    // Build the overlay dynamically so it never exists in the DOM while hidden
    const overlay = document.createElement('div');
    overlay.className = 'nh-peek-overlay';

    const grid = document.createElement('div');
    grid.className = 'nh-peek-grid';
    for (let n = step; n <= max; n += step) {
      const cell = document.createElement('span');
      cell.className = 'nh-peek-cell';
      cell.textContent = n;
      grid.appendChild(cell);
    }

    overlay.innerHTML = `
      <div class="nh-peek-card">
        <div class="nh-peek-header">
          <span class="nh-peek-title">\u{1F4A1} ${label}</span>
          <button class="nh-peek-close">\u{2715}</button>
        </div>
      </div>`;
    overlay.querySelector('.nh-peek-card').appendChild(grid);

    const close = () => { Audio.click(); overlay.remove(); };
    overlay.querySelector('.nh-peek-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    this._container.querySelector('.nh-game').appendChild(overlay);
  },
};

GameRegistry.register(NumberHopGame);
