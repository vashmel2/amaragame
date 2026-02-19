/**
 * Puzzle Garden — Pattern Completion Game
 *
 * A row of garden pots shows a repeating pattern. The last pot
 * has a "?" and the child picks the correct emoji from 3 choices.
 *
 * Pattern difficulty ladder:
 *   AB → AAB / ABB → ABC → AABB → ABBC
 */

import { GameRegistry } from '../registry.js';
import { Audio }        from '../audio.js';

// ── Pattern templates ──────────────────────────────────────────
// Each template is an index sequence; last element = the blank.
// Ordered easy → hard so the shuffled deck still feels progressive
// within each cycle.
const TEMPLATES_2 = [        // patterns that use 2 unique items
  [0,1,0,1,0,1],             // AB
  [0,0,1,0,0,1],             // AAB
  [0,1,1,0,1,1],             // ABB
  [0,0,1,1,0,0],             // AABB
];
const TEMPLATES_3 = [        // patterns that use 3 unique items
  [0,1,2,0,1,2],             // ABC
  [0,1,1,2,0,1],             // ABBC
];

// ── Emoji item sets ────────────────────────────────────────────
// Each set is used as the "cast" for a puzzle.
// 2-item sets pair with TEMPLATES_2; 3-item sets with TEMPLATES_3.
const ITEM_SETS_2 = [
  ['🌸','🌼'], ['🌻','🌺'], ['🐛','🦋'], ['⭐','🌙'], ['🍎','🍊'],
  ['🌷','🍀'], ['🌈','🦄'], ['🍓','🍋'], ['🐞','🌿'], ['🍄','🎋'],
  ['🌵','💐'], ['☀️','💫'],
];
const ITEM_SETS_3 = [
  ['🌸','🌼','🌻'], ['🐛','🦋','🐝'], ['⭐','🌙','☀️'],
  ['🌷','🍀','🌿'], ['🌈','🦄','🍄'], ['🍓','🍋','🌵'],
  ['🌸','🦋','🐞'], ['💫','⭐','🌺'],
];

// ── Auto-generate all puzzle combinations ──────────────────────
// 4 templates × 12 pairs  = 48 puzzles
// 2 templates × 8 triplets = 16 puzzles
//                  Total  = 64 puzzles per loop
const PUZZLES = [
  ...TEMPLATES_2.flatMap(t => ITEM_SETS_2.map(items => ({ template: t, items }))),
  ...TEMPLATES_3.flatMap(t => ITEM_SETS_3.map(items => ({ template: t, items }))),
];

// Pool for distractor choices — kept distinct from pattern emojis
const EXTRAS = ['🎠','🎪','🎭','🎨','🏆','🎯','🎲','🧩','🪄','🎸','🎺','🎡'];

const CORRECT_MSGS = ['Great job! 🌟', 'You got it! 🎉', 'Amazing! 🌸', 'Perfect! ✨', 'Brilliant! 🌼'];
const WRONG_MSGS   = ['Try again! 💪', 'Look at the pattern!', 'Almost! Try once more 🌼'];

// ── Helpers ────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build 3 shuffled choices: 1 correct + 2 distinct wrong. */
function buildChoices(puzzle) {
  const { template, items } = puzzle;
  const correct = items[template.at(-1)];

  // Wrong options: other items in the pattern first, then extras
  const wrongs = [...new Set(items.filter(e => e !== correct))];
  for (const extra of EXTRAS) {
    if (wrongs.length >= 2) break;
    if (!items.includes(extra)) wrongs.push(extra);
  }

  return shuffle([correct, wrongs[0], wrongs[1]]);
}

// ══════════════════════════════════════════════════════════════
//  Game object
// ══════════════════════════════════════════════════════════════

const PuzzleGardenGame = {
  id:       'puzzle-garden',
  title:    'Puzzle Garden',
  thumbnail: '🌻',
  category: 'thinking',

  _container: null,
  _callbacks: null,
  _state:     null,
  _destroyed: false,

  // ── Lifecycle ──────────────────────────────────────────────

  init(container, callbacks) {
    this._container = container;
    this._callbacks = callbacks;
    this._destroyed = false;

    const saved = callbacks.getProgress();
    this._state = {
      puzzleIdx: saved?.custom?.puzzleIdx ?? 0,
      deck: null,   // shuffled index list, built per cycle
      locked: false,
    };

    this._render();
  },

  destroy() {
    this._destroyed = true;
  },

  // ── Render ─────────────────────────────────────────────────

  _render() {
    const cyclePos = this._state.puzzleIdx % PUZZLES.length;

    // Build or reshuffle the deck at the start of every new cycle
    if (!this._state.deck || cyclePos === 0) {
      this._state.deck = shuffle(PUZZLES.map((_, i) => i));
    }

    const puzzle  = PUZZLES[this._state.deck[cyclePos]];
    const choices = buildChoices(puzzle);
    const correct = puzzle.items[puzzle.template.at(-1)];
    const shown   = puzzle.template.slice(0, -1);      // first 5 slots

    this._container.innerHTML = `
      <div class="pg-game">
        <div class="pg-header">
          <button class="fm-exit-btn" id="pg-back">&#x2190;</button>
          <span class="pg-level-label">Garden #${this._state.puzzleIdx + 1}</span>
        </div>

        <div class="pg-stage">
          <div class="pg-buddy" id="pg-buddy">&#x1F41D;</div>
          <div class="pg-speech">What comes next?</div>

          <div class="pg-row">
            ${shown.map((itemIdx, i) => `
              <div class="pg-pot pg-filled" style="animation-delay:${i * 0.07}s">
                <span class="pg-emoji">${puzzle.items[itemIdx]}</span>
              </div>
            `).join('')}
            <div class="pg-pot pg-blank" id="pg-blank">
              <span class="pg-question">?</span>
            </div>
          </div>

          <div class="pg-choices">
            ${choices.map((emoji, i) => `
              <button class="pg-choice" data-emoji="${emoji}"
                      style="animation-delay:${i * 0.09}s">
                ${emoji}
              </button>
            `).join('')}
          </div>

          <div class="pg-feedback" id="pg-feedback"></div>
        </div>

        <div class="fm-confetti" id="pg-confetti"></div>
      </div>`;

    this._state.locked = false;

    const $  = sel => this._container.querySelector(sel);
    const $$ = sel => this._container.querySelectorAll(sel);

    $('#pg-back').addEventListener('click', () => {
      Audio.click();
      this._callbacks.onExit();
    });

    $$('.pg-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._state.locked) return;
        this._checkAnswer(btn.dataset.emoji, correct, btn);
      });
    });
  },

  // ── Answer checking ────────────────────────────────────────

  _checkAnswer(chosen, correct, btn) {
    const $ = sel => this._container.querySelector(sel);

    if (chosen === correct) {
      Audio.success();
      this._state.locked = true;
      btn.classList.add('pg-correct');

      // Fill the blank pot
      const blank = $('#pg-blank');
      blank.innerHTML = `<span class="pg-emoji">${correct}</span>`;
      blank.classList.replace('pg-blank', 'pg-just-filled');
      blank.classList.add('pg-filled');

      // Buddy celebrates
      $('#pg-buddy').classList.add('pg-buddy-happy');

      // Feedback
      const fb = $('#pg-feedback');
      fb.textContent = pick(CORRECT_MSGS);
      fb.className = 'pg-feedback pg-feedback-show pg-feedback-success';

      this._spawnConfetti();

      setTimeout(() => {
        if (this._destroyed) return;
        this._state.puzzleIdx++;
        this._callbacks.onProgress({ custom: { puzzleIdx: this._state.puzzleIdx } });
        this._render();
      }, 1400);

    } else {
      Audio.gentle();
      btn.classList.add('pg-wrong');
      btn.disabled = true;

      const fb = $('#pg-feedback');
      fb.textContent = pick(WRONG_MSGS);
      fb.className = 'pg-feedback pg-feedback-show pg-feedback-nudge';

      setTimeout(() => {
        if (this._destroyed) return;
        fb.className = 'pg-feedback';
        fb.textContent = '';
      }, 1200);
    }
  },

  // ── Confetti ───────────────────────────────────────────────

  _spawnConfetti() {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BCB','#A66CFF'];
    const el = this._container.querySelector('#pg-confetti');
    if (!el) return;
    el.innerHTML = '';

    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'fm-particle';
      p.style.backgroundColor = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 20;
      const dist  = 60 + Math.random() * 110;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist - 30}px`);
      p.style.setProperty('--r',  `${Math.random() * 720 - 360}deg`);
      el.appendChild(p);
    }

    setTimeout(() => { if (!this._destroyed) el.innerHTML = ''; }, 1200);
  },
};

GameRegistry.register(PuzzleGardenGame);
