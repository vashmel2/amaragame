/**
 * Coming Soon — Placeholder games
 *
 * Registers one placeholder per empty category so the menu
 * feels full and inviting. Each shows a friendly "coming soon"
 * screen. Delete or replace these as real games are built.
 */

import { GameRegistry } from '../registry.js';
import { Audio } from '../audio.js';

const PLACEHOLDERS = [
  {
    id: 'letter-safari',
    title: 'Letter Safari',
    category: 'reading',
    thumbnail: '\u{1F981}',
    description: 'Hunt for letters in the wild!',
    teaser: 'Coming soon!',
  },
  {
    id: 'story-bubbles',
    title: 'Story Bubbles',
    category: 'reading',
    thumbnail: '\u{1F4AC}',
    description: 'Pop bubbles to build a story!',
    teaser: 'Coming soon!',
  },
  {
    id: 'shape-builder',
    title: 'Shape Builder',
    category: 'thinking',
    thumbnail: '\u{1F4D0}',
    description: 'Build cool things with shapes!',
    teaser: 'Coming soon!',
  },
  {
    id: 'feeling-faces',
    title: 'Feeling Faces',
    category: 'feelings',
    thumbnail: '\u{1F60A}',
    description: 'Match faces to feelings!',
    teaser: 'Coming soon!',
  },
];

function makePlaceholder(cfg) {
  return {
    ...cfg,
    ageRange: [4, 8],
    _container: null,
    _callbacks: null,

    init(container, callbacks) {
      this._container = container;
      this._callbacks = callbacks;

      container.innerHTML = `
        <div class="cs-screen">
          <button class="fm-exit-btn cs-back" aria-label="Back">\u{2190}</button>
          <div class="cs-icon">${cfg.thumbnail}</div>
          <h2 class="cs-title">${cfg.title}</h2>
          <p class="cs-teaser">${cfg.teaser}</p>
          <p class="cs-sub">We're building this game right now!</p>
        </div>`;

      container.querySelector('.cs-back').addEventListener('click', () => {
        Audio.click();
        callbacks.onExit();
      });
    },

    destroy() {
      if (this._container) this._container.innerHTML = '';
      this._container = null;
      this._callbacks = null;
    },
  };
}

PLACEHOLDERS.forEach(cfg => GameRegistry.register(makePlaceholder(cfg)));
