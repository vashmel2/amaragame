/**
 * Mood Garden — Emotion & Empathy Game
 *
 * A scenario is shown (text + emojis). The child picks the matching
 * emotion from 3 flower-shaped choices. Builds emotion recognition,
 * empathy, and good values through relatable everyday situations.
 *
 * Scenario mix:
 *   ~40% pure emotion recognition
 *   ~40% empathy (how does the OTHER person feel?)
 *   ~20% values-in-action (doing the right thing → how do YOU feel?)
 *
 * Garden mechanic:
 *   Every correct answer plants a flower. After ROW_SIZE flowers
 *   the row celebrates and resets; the garden grows forever.
 */

import { GameRegistry } from '../registry.js';
import { Audio }        from '../audio.js';

// ── Emotion palette ────────────────────────────────────────────
const EMOTIONS = {
  happy:     { label: 'Happy',     face: '😊', color: '#FFD93D' },
  sad:       { label: 'Sad',       face: '😢', color: '#74B9FF' },
  angry:     { label: 'Angry',     face: '😠', color: '#FF6B6B' },
  scared:    { label: 'Scared',    face: '😨', color: '#A29BFE' },
  surprised: { label: 'Surprised', face: '😲', color: '#FD79A8' },
  excited:   { label: 'Excited',   face: '🤩', color: '#FDCB6E' },
  proud:     { label: 'Proud',     face: '🥹', color: '#6BCB77' },
  nervous:   { label: 'Nervous',   face: '😰', color: '#81ECEC' },
  silly:     { label: 'Silly',     face: '😜', color: '#FF9FF3' },
  confused:  { label: 'Confused',  face: '😕', color: '#B2BEC3' },
};

// ── Scenarios ──────────────────────────────────────────────────
// perspective 'you' (default) → "How would YOU feel?"
// perspective 'friend'        → "How does your friend feel?"
const SCENARIOS = [

  // ── Pure emotion recognition ───────────────────────────────
  { text: "You got a brand new puppy for your birthday!",               emojis: "🐶🎁",   answer: "excited",   wrongs: ["nervous",  "confused"]  },
  { text: "Your favorite song came on the radio!",                      emojis: "🎵😄",   answer: "happy",     wrongs: ["sad",      "scared"]    },
  { text: "You're going to the playground today!",                      emojis: "🛝☀️",   answer: "excited",   wrongs: ["nervous",  "sad"]       },
  { text: "Grandma came to visit and brought cookies!",                 emojis: "👵🍪",   answer: "happy",     wrongs: ["angry",    "confused"]  },
  { text: "You dropped your ice cream on the ground.",                  emojis: "🍦💔",   answer: "sad",       wrongs: ["happy",    "silly"]     },
  { text: "Your best friend is moving far away.",                       emojis: "🏠👋",   answer: "sad",       wrongs: ["excited",  "angry"]     },
  { text: "Your favorite toy broke.",                                   emojis: "🧸💔",   answer: "sad",       wrongs: ["happy",    "surprised"] },
  { text: "Someone took your toy without asking.",                      emojis: "🧸😤",   answer: "angry",     wrongs: ["happy",    "confused"]  },
  { text: "Your little brother scribbled all over your drawing.",       emojis: "🖍️😤",  answer: "angry",     wrongs: ["happy",    "scared"]    },
  { text: "Someone cut in line right in front of you.",                 emojis: "👦😠",   answer: "angry",     wrongs: ["surprised","sad"]       },
  { text: "You hear a strange noise in the dark.",                      emojis: "🌙👂",   answer: "scared",    wrongs: ["happy",    "silly"]     },
  { text: "A big dog runs toward you barking loudly.",                  emojis: "🐕😱",   answer: "scared",    wrongs: ["excited",  "confused"]  },
  { text: "You got lost in a big crowded store.",                       emojis: "🏪😰",   answer: "scared",    wrongs: ["happy",    "angry"]     },
  { text: "You opened a present and it was your dream toy!",            emojis: "🎁😲",   answer: "surprised", wrongs: ["sad",      "angry"]     },
  { text: "Your friends jumped out and yelled SURPRISE!",               emojis: "🎉😲",   answer: "surprised", wrongs: ["scared",   "angry"]     },
  { text: "You have to speak in front of the whole class.",             emojis: "🏫🎤",   answer: "nervous",   wrongs: ["excited",  "silly"]     },
  { text: "It's your very first day at a brand new school.",            emojis: "🏫🎒",   answer: "nervous",   wrongs: ["excited",  "happy"]     },
  { text: "You're about to perform in the school show!",                emojis: "🎭🌟",   answer: "nervous",   wrongs: ["sad",      "confused"]  },
  { text: "You learned to ride your bike all by yourself!",             emojis: "🚲⭐",   answer: "proud",     wrongs: ["nervous",  "sad"]       },
  { text: "You finished your drawing and it looks amazing!",            emojis: "🎨✨",   answer: "proud",     wrongs: ["sad",      "nervous"]   },
  { text: "You won first place in the school race!",                    emojis: "🏆🥇",   answer: "proud",     wrongs: ["scared",   "confused"]  },
  { text: "You put your shirt on completely backwards by accident!",    emojis: "👕😆",   answer: "silly",     wrongs: ["sad",      "nervous"]   },
  { text: "Your tummy made a very loud noise during class!",            emojis: "😄🎵",   answer: "silly",     wrongs: ["scared",   "angry"]     },
  { text: "The puzzle pieces don't seem to fit anywhere.",              emojis: "🧩❓",   answer: "confused",  wrongs: ["happy",    "angry"]     },
  { text: "The teacher explained something and you don't get it.",      emojis: "📚❓",   answer: "confused",  wrongs: ["excited",  "sad"]       },
  { text: "You missed your mommy while you were at school.",            emojis: "🏫💭",   answer: "sad",       wrongs: ["excited",  "angry"]     },

  // ── Empathy — how does your friend feel? ──────────────────
  { text: "You shared your lunch with a friend who forgot theirs.",     emojis: "🍱🤝",   answer: "happy",     wrongs: ["angry",    "scared"],   perspective: "friend" },
  { text: "You forgot your friend's birthday.",                         emojis: "🎂😔",   answer: "sad",       wrongs: ["excited",  "silly"],    perspective: "friend" },
  { text: "You cheered loudly for your friend during their race.",      emojis: "📣🏃",   answer: "excited",   wrongs: ["nervous",  "sad"],      perspective: "friend" },
  { text: "A new kid at school has nobody to play with.",               emojis: "🏫😶",   answer: "sad",       wrongs: ["happy",    "excited"],  perspective: "friend" },
  { text: "You accidentally stepped on your friend's drawing.",         emojis: "🎨😢",   answer: "sad",       wrongs: ["happy",    "silly"],    perspective: "friend" },
  { text: "You gave your friend the very last piece of your cake.",     emojis: "🍰😊",   answer: "happy",     wrongs: ["sad",      "confused"], perspective: "friend" },
  { text: "Your friend is waiting and you are very late.",              emojis: "⏰😟",   answer: "nervous",   wrongs: ["happy",    "silly"],    perspective: "friend" },
  { text: "You invited the new classmate to join your game.",           emojis: "🧒🤝",   answer: "happy",     wrongs: ["nervous",  "confused"], perspective: "friend" },
  { text: "You gave your friend a big hug when they were crying.",      emojis: "🤗😢",   answer: "happy",     wrongs: ["scared",   "confused"], perspective: "friend" },
  { text: "You forgot to return your friend's book.",                   emojis: "📚😕",   answer: "sad",       wrongs: ["excited",  "silly"],    perspective: "friend" },

  // ── Values in action ───────────────────────────────────────
  { text: "You helped your grandma carry her heavy bags.",              emojis: "👵🛍️",  answer: "proud",     wrongs: ["nervous",  "confused"]  },
  { text: "You told the truth even though it was really hard.",         emojis: "😬✅",   answer: "proud",     wrongs: ["scared",   "sad"]       },
  { text: "You waited patiently for your turn without complaining.",    emojis: "⏳😌",   answer: "proud",     wrongs: ["angry",    "nervous"]   },
  { text: "You said sorry after accidentally hurting your friend.",     emojis: "🤝💕",   answer: "proud",     wrongs: ["happy",    "silly"]     },
  { text: "You saved your pocket money to buy a gift for your mom.",    emojis: "💰🎁",   answer: "proud",     wrongs: ["sad",      "scared"]    },
  { text: "You stood up for a friend who was being teased.",            emojis: "🛡️💕",  answer: "proud",     wrongs: ["scared",   "confused"]  },
  { text: "You gave your favorite sticker to cheer up a sad friend.",   emojis: "⭐😭",   answer: "proud",     wrongs: ["sad",      "nervous"]   },
  { text: "You cleaned up your room without being asked!",              emojis: "🧹🏠",   answer: "proud",     wrongs: ["confused", "scared"]    },
  { text: "You let your little sister pick the movie tonight.",         emojis: "📺👧",   answer: "proud",     wrongs: ["angry",    "confused"]  },
  { text: "You returned a lost wallet you found on the ground.",        emojis: "👛✅",   answer: "proud",     wrongs: ["nervous",  "confused"]  },
];

const CORRECT_MSGS = [
  "That's right! 🌸",
  "You got it! 🌟",
  "Amazing! 💐",
  "Great feeling! ✨",
  "You understand feelings so well! 🌻",
  "Exactly! 🌼",
];

const WRONG_MSGS = [
  "Hmm, look at the scene again! 💭",
  "Try another one! 🌼",
  "Almost! Think about how they feel. 🌿",
];

const ROW_SIZE = 5;   // flowers per garden row before celebration

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

function buildChoices(scenario) {
  return shuffle([scenario.answer, scenario.wrongs[0], scenario.wrongs[1]]);
}

// ══════════════════════════════════════════════════════════════
//  Game object
// ══════════════════════════════════════════════════════════════

const MoodGardenGame = {
  id:        'mood-garden',
  title:     'Mood Garden',
  thumbnail: '🌸',
  category:  'feelings',
  ageRange:  [4, 8],

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
      questionIdx: saved?.custom?.questionIdx ?? 0,
      deck:        null,
      rowFlowers:  saved?.custom?.rowFlowers  ?? [],
      locked:      false,
    };

    this._render();
  },

  destroy() {
    this._destroyed = true;
  },

  // ── Render ─────────────────────────────────────────────────

  _render() {
    const cyclePos = this._state.questionIdx % SCENARIOS.length;

    if (!this._state.deck || cyclePos === 0) {
      this._state.deck = shuffle(SCENARIOS.map((_, i) => i));
    }

    const scenario = SCENARIOS[this._state.deck[cyclePos]];
    const choices  = buildChoices(scenario);
    const isFriend = scenario.perspective === 'friend';
    const question = isFriend
      ? '💬 How does your friend feel?'
      : '💬 How would YOU feel?';

    const gardenHTML = Array.from({ length: ROW_SIZE }, (_, i) => {
      if (i < this._state.rowFlowers.length) {
        const emo = EMOTIONS[this._state.rowFlowers[i]];
        return `<div class="mg-flower mg-flower-planted" style="background:${emo.color}">${emo.face}</div>`;
      }
      return `<div class="mg-flower mg-flower-empty">🌱</div>`;
    }).join('');

    this._container.innerHTML = `
      <div class="mg-game">
        <div class="mg-header">
          <button class="fm-exit-btn" id="mg-back">&#x2190;</button>
          <span class="mg-level-label">Garden #${this._state.questionIdx + 1}</span>
        </div>

        <div class="mg-stage">
          <div class="mg-scenario-card">
            <div class="mg-scene-emojis">${scenario.emojis}</div>
            <p class="mg-scene-text">${scenario.text}</p>
          </div>

          <div class="mg-question">${question}</div>

          <div class="mg-choices">
            ${choices.map((emotion, i) => {
              const emo = EMOTIONS[emotion];
              return `
                <button class="mg-choice" data-emotion="${emotion}"
                        style="--choice-color:${emo.color}; animation-delay:${i * 0.09}s">
                  <span class="mg-choice-face">${emo.face}</span>
                  <span class="mg-choice-label">${emo.label}</span>
                </button>`;
            }).join('')}
          </div>

          <div class="mg-feedback" id="mg-feedback"></div>
        </div>

        <div class="mg-garden">
          <div class="mg-garden-label">🌿 Your Garden</div>
          <div class="mg-flower-row" id="mg-flower-row">
            ${gardenHTML}
          </div>
        </div>

        <div class="fm-confetti" id="mg-confetti"></div>
      </div>`;

    this._state.locked = false;

    const $  = sel => this._container.querySelector(sel);
    const $$ = sel => this._container.querySelectorAll(sel);

    $('#mg-back').addEventListener('click', () => {
      Audio.click();
      this._callbacks.onExit();
    });

    $$('.mg-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._state.locked) return;
        this._checkAnswer(btn.dataset.emotion, scenario.answer, btn);
      });
    });
  },

  // ── Answer checking ────────────────────────────────────────

  _checkAnswer(chosen, correct, btn) {
    const $ = sel => this._container.querySelector(sel);

    if (chosen === correct) {
      Audio.success();
      this._state.locked = true;
      btn.classList.add('mg-correct');

      const fb = $('#mg-feedback');
      fb.textContent = pick(CORRECT_MSGS);
      fb.className = 'mg-feedback mg-feedback-show mg-feedback-success';

      // Plant the flower
      this._state.rowFlowers.push(correct);
      const rowComplete = this._state.rowFlowers.length >= ROW_SIZE;

      // Animate the next empty slot
      const slots = this._container.querySelectorAll('.mg-flower');
      const slot  = slots[this._state.rowFlowers.length - 1];
      if (slot) {
        const emo = EMOTIONS[correct];
        slot.className  = 'mg-flower mg-flower-planted mg-just-planted';
        slot.style.background = emo.color;
        slot.textContent = emo.face;
      }

      if (rowComplete) this._spawnConfetti();

      setTimeout(() => {
        if (this._destroyed) return;
        this._state.questionIdx++;
        if (rowComplete) this._state.rowFlowers = [];
        this._callbacks.onProgress({
          custom: {
            questionIdx: this._state.questionIdx,
            rowFlowers:  this._state.rowFlowers,
          },
        });
        this._render();
      }, rowComplete ? 1800 : 1400);

    } else {
      Audio.gentle();
      btn.classList.add('mg-wrong');
      btn.disabled = true;

      const fb = $('#mg-feedback');
      fb.textContent = pick(WRONG_MSGS);
      fb.className = 'mg-feedback mg-feedback-show mg-feedback-nudge';

      setTimeout(() => {
        if (this._destroyed) return;
        fb.className = 'mg-feedback';
        fb.textContent = '';
      }, 1200);
    }
  },

  // ── Confetti ───────────────────────────────────────────────

  _spawnConfetti() {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BCB','#A66CFF'];
    const el = this._container.querySelector('#mg-confetti');
    if (!el) return;
    el.innerHTML = '';

    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'fm-particle';
      p.style.backgroundColor = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 24;
      const dist  = 60 + Math.random() * 120;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist - 30}px`);
      p.style.setProperty('--r',  `${Math.random() * 720 - 360}deg`);
      el.appendChild(p);
    }

    setTimeout(() => { if (!this._destroyed) el.innerHTML = ''; }, 1600);
  },
};

GameRegistry.register(MoodGardenGame);
