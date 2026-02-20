/**
 * Shape Builder — Build scenes piece by piece
 *
 * Teaches shape recognition (circle, triangle, rectangle, oval, etc.)
 * through 15 fun multi-step builds: house, rocket, robot and more.
 *
 * Each build is defined as ordered SVG pieces. The child is shown:
 *   - Filled pieces already placed
 *   - A pulsing gold outline for the NEXT piece to place
 *   - Gray ghost outlines for remaining pieces
 * Then picks the correct shape name from 3 colored choices.
 */

import { GameRegistry } from '../registry.js';
import { Audio }        from '../audio.js';

// ── Shape preview colours (for choice buttons) ─────────────────
const SHAPE_COLOR = {
  circle:    '#FF6B6B',
  oval:      '#FECA57',
  square:    '#48DBFB',
  rectangle: '#54A0FF',
  triangle:  '#A29BFE',
  diamond:   '#00D2D3',
  star:      '#FF9F43',
  hexagon:   '#6BCB77',
  heart:     '#FD79A8',
  pentagon:  '#F9CA24',
};

// Small 60×60 SVG markup for each shape (used in choice buttons)
const SHAPE_SVG = {
  circle:    c => `<circle cx="30" cy="30" r="25" fill="${c}"/>`,
  oval:      c => `<ellipse cx="30" cy="30" rx="28" ry="17" fill="${c}"/>`,
  square:    c => `<rect x="5" y="5" width="50" height="50" fill="${c}"/>`,
  rectangle: c => `<rect x="2" y="14" width="56" height="32" fill="${c}"/>`,
  triangle:  c => `<polygon points="30,4 56,56 4,56" fill="${c}"/>`,
  diamond:   c => `<polygon points="30,4 56,30 30,56 4,30" fill="${c}"/>`,
  star:      c => `<polygon points="30,4 35,22 53,22 39,33 44,52 30,40 16,52 21,33 7,22 25,22" fill="${c}"/>`,
  hexagon:   c => `<polygon points="30,4 53,17 53,43 30,56 7,43 7,17" fill="${c}"/>`,
  heart:     c => `<path d="M30,50 C8,36 4,18 14,10 C20,6 27,9 30,16 C33,9 40,6 46,10 C56,18 52,36 30,50Z" fill="${c}"/>`,
  pentagon:  c => `<polygon points="30,4 56,22 46,52 14,52 4,22" fill="${c}"/>`,
};

const ALL_SHAPES = Object.keys(SHAPE_SVG);

// ── Piece → SVG string ─────────────────────────────────────────
// mode: 'fill' | 'ghost' | 'target'
// Piece types:  r=rect(x,y,w,h,rx?)  c=circle(cx,cy,r)
//               e=ellipse(cx,cy,rx,ry)  p=polygon(pts)
function pieceSVG(p, mode) {
  let fill, stroke, sw, extra = [];
  if (mode === 'fill') {
    fill = p.fill; stroke = 'none'; sw = '0';
  } else if (mode === 'ghost') {
    fill = 'none'; stroke = '#C8D6E5'; sw = '2';
    extra.push('stroke-dasharray="5,3"');
  } else {                      // target
    fill = 'rgba(249,202,36,0.15)'; stroke = '#F9CA24'; sw = '3';
    extra.push('stroke-dasharray="7,3"', 'class="sb-target-piece"');
  }
  const a = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra.join(' ')}`;
  switch (p.t) {
    case 'r': return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx||0}" ${a}/>`;
    case 'c': return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" ${a}/>`;
    case 'e': return `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}" ${a}/>`;
    case 'p': return `<polygon points="${p.pts}" ${a}/>`;
    default:  return '';
  }
}

// ── Builds ─────────────────────────────────────────────────────
// s: shape name shown to child  t: SVG element type
// Pieces are placed in order — design with z-order in mind
const BUILDS = [
  {
    label: 'House', emoji: '🏠', bg: '#FFF5E6',
    pieces: [
      { t:'r', s:'rectangle', fill:'#E17055', x:30,  y:100, w:140, h:90  },
      { t:'p', s:'triangle',  fill:'#C0392B', pts:'100,20 175,105 25,105' },
      { t:'r', s:'square',    fill:'#6C5CE7', x:82,  y:142, w:36,  h:48  },
      { t:'r', s:'rectangle', fill:'#74B9FF', x:38,  y:115, w:35,  h:30  },
    ],
  },
  {
    label: 'Rocket', emoji: '🚀', bg: '#F0F4FF',
    pieces: [
      { t:'r', s:'rectangle', fill:'#B2BEC3', x:72,  y:55,  w:56, h:100  },
      { t:'p', s:'triangle',  fill:'#E17055', pts:'100,10 128,58 72,58'   },
      { t:'p', s:'triangle',  fill:'#E17055', pts:'72,120 45,165 72,165'  },
      { t:'p', s:'triangle',  fill:'#E17055', pts:'128,120 155,165 128,165'},
      { t:'c', s:'circle',    fill:'#74B9FF', cx:100, cy:95, r:20         },
    ],
  },
  {
    label: 'Car', emoji: '🚗', bg: '#F0F0FF',
    pieces: [
      { t:'r', s:'rectangle', fill:'#6C5CE7', x:15,  y:105, w:170, h:60, rx:10 },
      { t:'r', s:'rectangle', fill:'#A29BFE', x:42,  y:68,  w:116, h:42, rx:12 },
      { t:'c', s:'circle',    fill:'#2D3436', cx:52,  cy:167, r:22              },
      { t:'c', s:'circle',    fill:'#2D3436', cx:148, cy:167, r:22              },
    ],
  },
  {
    label: 'Robot', emoji: '🤖', bg: '#F5F6FA',
    pieces: [
      { t:'r', s:'square',    fill:'#B2BEC3', x:62,  y:28,  w:76, h:70, rx:8  },
      { t:'r', s:'rectangle', fill:'#636E72', x:50,  y:108, w:100,h:72, rx:6  },
      { t:'r', s:'rectangle', fill:'#B2BEC3', x:18,  y:108, w:28, h:55, rx:6  },
      { t:'r', s:'rectangle', fill:'#B2BEC3', x:154, y:108, w:28, h:55, rx:6  },
    ],
  },
  {
    label: 'Tree', emoji: '🌲', bg: '#F0FFF4',
    pieces: [
      { t:'p', s:'triangle',  fill:'#82E0AA', pts:'100,15 140,75 60,75'   },
      { t:'p', s:'triangle',  fill:'#2ECC71', pts:'100,58 150,122 50,122' },
      { t:'p', s:'triangle',  fill:'#27AE60', pts:'100,98 160,178 40,178' },
      { t:'r', s:'rectangle', fill:'#8B4513', x:88,  y:172, w:24, h:24   },
    ],
  },
  {
    label: 'Snowman', emoji: '⛄', bg: '#EBF5FB',
    pieces: [
      { t:'c', s:'circle',    fill:'#DFE6E9', cx:100, cy:155, r:40       },
      { t:'c', s:'circle',    fill:'#ECEFF1', cx:100, cy:95,  r:30       },
      { t:'c', s:'circle',    fill:'#F5F6FA', cx:100, cy:47,  r:24       },
      { t:'r', s:'rectangle', fill:'#2D3436', x:80,  y:14,  w:40, h:22, rx:3 },
    ],
  },
  {
    label: 'Fish', emoji: '🐟', bg: '#FFF3E0',
    pieces: [
      { t:'e', s:'oval',     fill:'#E67E22', cx:90,  cy:105, rx:62, ry:42 },
      { t:'p', s:'triangle', fill:'#D35400', pts:'152,105 185,72 185,138' },
      { t:'p', s:'triangle', fill:'#F39C12', pts:'90,63 118,82 62,82'     },
      { t:'c', s:'circle',   fill:'#FFFFFF', cx:65,  cy:96,  r:14         },
    ],
  },
  {
    label: 'Airplane', emoji: '✈️', bg: '#EFF8FF',
    pieces: [
      { t:'r', s:'rectangle', fill:'#DFE6E9', x:18,  y:87,  w:164, h:28, rx:14 },
      { t:'p', s:'triangle',  fill:'#74B9FF', pts:'55,87 120,87 80,48'          },
      { t:'p', s:'triangle',  fill:'#74B9FF', pts:'55,115 120,115 80,154'       },
      { t:'p', s:'triangle',  fill:'#A29BFE', pts:'162,87 185,62 185,87'        },
    ],
  },
  {
    label: 'Sun', emoji: '☀️', bg: '#FFFDE7',
    pieces: [
      { t:'c', s:'circle',   fill:'#F9CA24', cx:100, cy:100, r:40            },
      { t:'p', s:'triangle', fill:'#F0932B', pts:'100,15 114,58 86,58'       },
      { t:'p', s:'triangle', fill:'#F0932B', pts:'185,100 142,114 142,86'    },
      { t:'p', s:'triangle', fill:'#F0932B', pts:'100,185 114,142 86,142'    },
      { t:'p', s:'triangle', fill:'#F0932B', pts:'15,100 58,114 58,86'       },
    ],
  },
  {
    label: 'Train', emoji: '🚂', bg: '#FFF0F0',
    pieces: [
      { t:'r', s:'rectangle', fill:'#E74C3C', x:40,  y:85,  w:130, h:75, rx:8 },
      { t:'r', s:'square',    fill:'#C0392B', x:120, y:45,  w:55,  h:45, rx:5 },
      { t:'c', s:'circle',    fill:'#2D3436', cx:70,  cy:162, r:20             },
      { t:'c', s:'circle',    fill:'#2D3436', cx:145, cy:162, r:20             },
    ],
  },
  {
    label: 'Owl', emoji: '🦉', bg: '#FFF8F0',
    pieces: [
      { t:'e', s:'oval',   fill:'#D4A574', cx:100, cy:138, rx:48, ry:52 },
      { t:'c', s:'circle', fill:'#C49A6C', cx:100, cy:72,  r:40         },
      { t:'c', s:'circle', fill:'#F9CA24', cx:82,  cy:68,  r:16         },
      { t:'c', s:'circle', fill:'#F9CA24', cx:118, cy:68,  r:16         },
    ],
  },
  {
    label: 'Sailboat', emoji: '⛵', bg: '#E8F8FF',
    pieces: [
      { t:'r', s:'rectangle', fill:'#8B4513', x:22,  y:148, w:156, h:24, rx:5 },
      { t:'r', s:'rectangle', fill:'#795548', x:97,  y:18,  w:6,   h:132      },
      { t:'p', s:'triangle',  fill:'#F5F6FA', pts:'100,22 100,148 28,148'      },
      { t:'p', s:'triangle',  fill:'#74B9FF', pts:'100,40 170,130 100,130'     },
    ],
  },
  {
    label: 'Kite', emoji: '🪁', bg: '#FFF0F5',
    pieces: [
      { t:'p', s:'triangle', fill:'#E74C3C', pts:'100,15 25,100 100,100'   },
      { t:'p', s:'triangle', fill:'#F9CA24', pts:'100,15 100,100 175,100'  },
      { t:'p', s:'triangle', fill:'#74B9FF', pts:'25,100 100,185 100,100'  },
      { t:'p', s:'triangle', fill:'#6BCB77', pts:'100,100 175,100 100,185' },
    ],
  },
  {
    label: 'Tent', emoji: '⛺', bg: '#F5FFF0',
    pieces: [
      { t:'p', s:'triangle',  fill:'#E67E22', pts:'100,15 18,158 100,158'  },
      { t:'p', s:'triangle',  fill:'#F9CA24', pts:'100,15 182,158 100,158' },
      { t:'r', s:'rectangle', fill:'#D35400', x:18,  y:156, w:164, h:22   },
      { t:'p', s:'triangle',  fill:'#784212', pts:'100,92 126,158 74,158'  },
    ],
  },
  {
    label: 'Flower', emoji: '🌸', bg: '#FFF0F8',
    pieces: [
      { t:'e', s:'oval',   fill:'#FD79A8', cx:100, cy:55,  rx:18, ry:30 },
      { t:'e', s:'oval',   fill:'#FD79A8', cx:145, cy:100, rx:30, ry:18 },
      { t:'e', s:'oval',   fill:'#FF6B6B', cx:100, cy:145, rx:18, ry:30 },
      { t:'e', s:'oval',   fill:'#FF6B6B', cx:55,  cy:100, rx:30, ry:18 },
      { t:'c', s:'circle', fill:'#F9CA24', cx:100, cy:100, r:28          },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoices(shapeName) {
  const wrongs = shuffle(ALL_SHAPES.filter(s => s !== shapeName)).slice(0, 2);
  return shuffle([shapeName, ...wrongs]);
}

// ══════════════════════════════════════════════════════════════
//  Game object
// ══════════════════════════════════════════════════════════════
const ShapeBuilderGame = {
  id:        'shape-builder',
  title:     'Shape Builder',
  thumbnail: '📐',
  category:  'thinking',
  ageRange:  [4, 8],

  _container: null,
  _callbacks: null,
  _state:     null,
  _destroyed: false,

  init(container, callbacks) {
    this._container = container;
    this._callbacks = callbacks;
    this._destroyed = false;

    const saved = callbacks.getProgress();
    let deck = saved?.custom?.deck ?? null;
    if (!deck || deck.length !== BUILDS.length) deck = null;

    this._state = {
      buildIdx: saved?.custom?.buildIdx ?? 0,
      pieceIdx: saved?.custom?.pieceIdx ?? 0,
      deck,
      locked: false,
    };

    this._render();
  },

  destroy() { this._destroyed = true; },

  _render() {
    // Create deck on first render only — never mid-build
    if (!this._state.deck) {
      this._state.deck = shuffle(BUILDS.map((_, i) => i));
    }

    const cyclePos = this._state.buildIdx % BUILDS.length;
    const build    = BUILDS[this._state.deck[cyclePos]];
    const pieceIdx = this._state.pieceIdx;
    const piece    = build.pieces[pieceIdx];
    const choices  = buildChoices(piece.s);
    const total    = build.pieces.length;

    const svgParts = build.pieces.map((p, i) =>
      pieceSVG(p, i < pieceIdx ? 'fill' : i === pieceIdx ? 'target' : 'ghost')
    ).join('');

    this._container.innerHTML = `
      <div class="sb-game" style="background:${build.bg}">
        <div class="sb-header">
          <button class="fm-exit-btn" id="sb-back">&#x2190;</button>
          <span class="sb-build-label">${build.emoji} ${build.label}</span>
          <span class="sb-piece-count">${pieceIdx + 1} / ${total}</span>
        </div>

        <div class="sb-canvas-wrap">
          <div class="sb-canvas-inner">
            <svg class="sb-canvas" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              ${svgParts}
            </svg>
          </div>
        </div>

        <p class="sb-prompt">Place the <strong>${piece.s}</strong>!</p>

        <div class="sb-choices">
          ${choices.map(s => `
            <button class="sb-choice" data-shape="${s}">
              <svg class="sb-choice-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                ${SHAPE_SVG[s](SHAPE_COLOR[s])}
              </svg>
              <span class="sb-choice-label">${s}</span>
            </button>`).join('')}
        </div>

        <div class="sb-feedback" id="sb-feedback"></div>
        <button class="sb-next-btn" id="sb-next" style="display:none">
          ✨ Next Build &#x2192;
        </button>
        <div class="fm-confetti" id="sb-confetti"></div>
      </div>`;

    this._state.locked = false;

    this._container.querySelector('#sb-back').addEventListener('click', () => {
      Audio.click();
      this._callbacks.onExit();
    });

    this._container.querySelector('#sb-next').addEventListener('click', () => {
      Audio.click();
      this._state.buildIdx++;
      this._state.pieceIdx = 0;
      // Reshuffle at the start of each new cycle, not mid-build
      if (this._state.buildIdx % BUILDS.length === 0) {
        this._state.deck = shuffle(BUILDS.map((_, i) => i));
      }
      this._callbacks.onProgress({
        custom: { buildIdx: this._state.buildIdx, pieceIdx: 0, deck: this._state.deck },
      });
      this._render();
    });

    this._container.querySelectorAll('.sb-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._state.locked) return;
        this._check(btn.dataset.shape, piece.s, btn, build);
      });
    });
  },

  _check(chosen, correct, btn, build) {
    const $ = sel => this._container.querySelector(sel);

    if (chosen === correct) {
      Audio.success();
      this._state.locked = true;
      btn.classList.add('sb-correct');

      const allDone = this._state.pieceIdx + 1 >= build.pieces.length;
      const fb = $('#sb-feedback');
      fb.className = 'sb-feedback sb-feedback-show';

      if (allDone) {
        // Show completed picture — re-render SVG with all pieces filled
        const canvas = this._container.querySelector('.sb-canvas');
        if (canvas) {
          canvas.innerHTML = build.pieces.map(p => pieceSVG(p, 'fill')).join('');
        }
        // Hide choices & prompt, show celebration + Next Build button
        this._container.querySelector('.sb-choices').style.display = 'none';
        this._container.querySelector('.sb-prompt').style.display = 'none';
        this._container.querySelector('.sb-piece-count').textContent = 'Done! ✓';
        fb.textContent = `${build.emoji} You built a ${build.label}! Amazing! 🌟`;
        $('#sb-next').style.display = '';
        this._spawnConfetti();
      } else {
        fb.textContent = 'Perfect! ⭐';
        setTimeout(() => {
          if (this._destroyed) return;
          this._state.pieceIdx++;
          this._callbacks.onProgress({
            custom: {
              buildIdx: this._state.buildIdx,
              pieceIdx: this._state.pieceIdx,
              deck:     this._state.deck,
            },
          });
          this._render();
        }, 1100);
      }

    } else {
      Audio.gentle();
      btn.classList.add('sb-wrong');
      btn.disabled = true;

      const fb = $('#sb-feedback');
      fb.textContent = 'Look at the glowing outline! 👀';
      fb.className = 'sb-feedback sb-feedback-show sb-feedback-nudge';

      setTimeout(() => {
        if (this._destroyed) return;
        fb.className = 'sb-feedback';
        fb.textContent = '';
      }, 1200);
    }
  },

  _spawnConfetti() {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BCB','#A66CFF'];
    const el = this._container.querySelector('#sb-confetti');
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'fm-particle';
      p.style.backgroundColor = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 28;
      const dist  = 70 + Math.random() * 100;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist - 40}px`);
      p.style.setProperty('--r',  `${Math.random() * 720 - 360}deg`);
      el.appendChild(p);
    }
    setTimeout(() => { if (!this._destroyed) el.innerHTML = ''; }, 1800);
  },
};

GameRegistry.register(ShapeBuilderGame);
