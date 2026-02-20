/**
 * App Controller
 *
 * Entry point. Handles screen navigation and ties the platform together.
 * Screens: welcome → menu → category → game
 *
 * To add a new game, just import its file here (it self-registers).
 */

import { ProfileManager } from './profile.js';
import { ProgressManager } from './progress.js';
import { GameRegistry } from './registry.js';
import { Audio } from './audio.js';

// ── Import games (each self-registers with GameRegistry) ──
import './games/feed-monster.js';
import './games/number-hop.js';
import './games/puzzle-garden.js';
import './games/mood-garden.js';
import './games/shape-builder.js';
import './games/coming-soon.js';

// ── DOM helpers ──
const app = document.getElementById('app');
const $ = (sel, root = app) => root.querySelector(sel);
const $$ = (sel, root = app) => root.querySelectorAll(sel);

/** Escape HTML to prevent XSS when inserting user-provided text. */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

let activeGame = null;

// ═══════════════════════════════════════════
//  Screen transitions
// ═══════════════════════════════════════════

function showScreen(renderFn) {
  // Tear down any running game
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }

  // Fade out, swap content, fade in
  app.style.opacity = '0';
  setTimeout(() => {
    app.innerHTML = '';
    renderFn(app);
    void app.offsetHeight; // force reflow
    app.style.opacity = '1';
  }, 200);
}

// ═══════════════════════════════════════════
//  Welcome Screen (first-time setup)
// ═══════════════════════════════════════════

function renderWelcome() {
  const avatars = ['\u{1F984}', '\u{1F438}', '\u{1F98A}', '\u{1F431}', '\u{1F436}', '\u{1F98B}', '\u{1F43C}', '\u{1F308}'];

  showScreen(container => {
    container.innerHTML = `
      <div class="screen welcome-screen">
        <div class="welcome-character">\u{1F31F}</div>
        <h1 class="welcome-title">Hello!</h1>
        <p class="welcome-subtitle">What's your name?</p>
        <div class="welcome-input-group">
          <input type="text" id="name-input" class="name-input"
                 placeholder="Type your name..." maxlength="20" autocomplete="off">
          <div class="avatar-picker">
            <p class="avatar-label">Pick a friend:</p>
            <div class="avatar-options">
              ${avatars.map((a, i) =>
                `<button class="avatar-btn${i === 0 ? ' selected' : ''}" data-avatar="${a}">${a}</button>`
              ).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-large" id="start-btn" disabled>Let's Play!</button>
        </div>
      </div>`;

    const nameInput = $('#name-input');
    const startBtn = $('#start-btn');
    let selectedAvatar = avatars[0];

    nameInput.addEventListener('input', () => {
      startBtn.disabled = nameInput.value.trim().length === 0;
    });

    $$(`.avatar-btn`).forEach(btn => {
      btn.addEventListener('click', () => {
        $$(`.avatar-btn`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatar = btn.dataset.avatar;
        Audio.click();
      });
    });

    startBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      Audio.success();
      await ProfileManager.createProfile(name, selectedAvatar);
      renderMenu();
    });

    // Auto-focus on desktop
    setTimeout(() => nameInput.focus(), 300);
  });
}

// ═══════════════════════════════════════════
//  Main Menu
// ═══════════════════════════════════════════

async function renderMenu() {
  const profile = await ProfileManager.getActiveProfile();
  if (!profile) return renderWelcome();

  const cats = GameRegistry.getCategories();

  showScreen(container => {
    container.innerHTML = `
      <div class="screen menu-screen">
        <div class="menu-header">
          <button class="profile-badge" id="profile-badge">
            <span class="profile-avatar">${profile.avatar}</span>
            <span class="profile-name">Hi, ${esc(profile.name)}!</span>
            <span class="profile-switch-hint">\u{25BE}</span>
          </button>
        </div>
        <h2 class="menu-title">What do you want to play?</h2>
        <div class="category-grid">
          ${cats.map(cat => `
            <button class="category-tile" data-category="${cat.id}"
                    style="--cat-color: ${cat.color}">
              <span class="category-icon">${cat.icon}</span>
              <span class="category-label">${cat.label}</span>
            </button>
          `).join('')}
        </div>
      </div>`;

    // Category tiles
    $$('.category-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        Audio.click();
        renderCategory(tile.dataset.category);
      });
    });

    // Guard against ghost clicks from game back buttons:
    // don't open the switcher within 400ms of the menu rendering.
    const readyAt = Date.now() + 400;

    $('#profile-badge').addEventListener('click', async () => {
      if (Date.now() < readyAt) return;
      Audio.pop();

      // Build overlay dynamically so it's never in the DOM on load
      const allProfiles = await ProfileManager.getAllProfiles();
      const overlay = document.createElement('div');
      overlay.className = 'profile-overlay';
      overlay.innerHTML = `
        <div class="profile-card">
          <div class="profile-card-header">
            <span class="profile-card-title">Who's playing?</span>
            <button class="profile-card-close">\u{2715}</button>
          </div>
          <div class="profile-list">
            ${allProfiles.map(p => `
              <button class="profile-item${p.id === profile.id ? ' profile-active' : ''}" data-id="${p.id}">
                <span class="profile-item-avatar">${p.avatar}</span>
                <span class="profile-item-name">${esc(p.name)}</span>
                ${p.id === profile.id ? '<span class="profile-item-check">\u{2714}</span>' : ''}
              </button>
            `).join('')}
          </div>
          <button class="profile-add-btn">\u{2795} Add Player</button>
        </div>`;

      const close = () => overlay.remove();

      overlay.querySelector('.profile-card-close').addEventListener('click', () => {
        Audio.click();
        close();
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { Audio.click(); close(); }
      });

      overlay.querySelectorAll('.profile-item').forEach(item => {
        item.addEventListener('click', async () => {
          Audio.pop();
          await ProfileManager.setActiveProfile(item.dataset.id);
          close();
          renderMenu();
        });
      });

      overlay.querySelector('.profile-add-btn').addEventListener('click', () => {
        Audio.click();
        close();
        renderWelcome();
      });

      container.appendChild(overlay);
    });
  });
}

// ═══════════════════════════════════════════
//  Category Screen (list games in a category)
// ═══════════════════════════════════════════

function renderCategory(categoryId) {
  const catInfo = GameRegistry.getCategoryInfo(categoryId);
  const gameList = GameRegistry.getByCategory(categoryId);

  showScreen(container => {
    container.innerHTML = `
      <div class="screen category-screen">
        <div class="screen-header">
          <button class="btn btn-back" id="back-btn">\u{2190} Back</button>
          <h2 class="screen-title">${catInfo.icon} ${catInfo.label}</h2>
        </div>
        <div class="game-grid">
          ${gameList.map(game => `
            <button class="game-tile" data-game="${game.id}">
              <span class="game-thumbnail">${game.thumbnail}</span>
              <span class="game-title">${game.title}</span>
            </button>
          `).join('')}
        </div>
      </div>`;

    $('#back-btn').addEventListener('click', () => {
      Audio.click();
      renderMenu();
    });

    $$('.game-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        Audio.pop();
        launchGame(tile.dataset.game);
      });
    });
  });
}

// ═══════════════════════════════════════════
//  Launch a game
// ═══════════════════════════════════════════

async function launchGame(gameId) {
  const game = GameRegistry.get(gameId);
  if (!game) return;

  const profile = await ProfileManager.getActiveProfile();

  showScreen(container => {
    container.innerHTML = `<div class="screen game-screen" id="game-container"></div>`;

    const gameContainer = $('#game-container');

    // Callbacks the game uses to talk to the platform
    const callbacks = {
      onExit: () => renderMenu(),
      onProgress: (data) => ProgressManager.updateGameProgress(profile.id, gameId, data),
      getProgress: () => ProgressManager.getGameProgress(profile.id, gameId),
      profile
    };

    activeGame = game;
    game.init(gameContainer, callbacks);
  });
}

// ═══════════════════════════════════════════
//  Boot
// ═══════════════════════════════════════════

async function init() {
  const profile = await ProfileManager.getActiveProfile();
  if (profile) {
    renderMenu();
  } else {
    renderWelcome();
  }
}

init();
