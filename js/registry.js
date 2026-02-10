/**
 * Game Registry
 *
 * Central registry where games register themselves.
 * The platform discovers games through this module.
 *
 * ─── ADDING A NEW GAME ───
 * 1. Create js/games/my-game.js
 * 2. Import GameRegistry and call GameRegistry.register({ ... })
 * 3. Import your game file in app.js
 * That's it. The game appears in the menu automatically.
 *
 * ─── ADDING A NEW CATEGORY ───
 * Call GameRegistry.addCategory('id', 'Label', '🎵', '#FF6B6B')
 * before registering games that use it.
 *
 * ─── GAME CONFIG CONTRACT ───
 * {
 *   id: string,                  - Unique identifier
 *   title: string,               - Display name
 *   category: string,            - Category key
 *   thumbnail: string,           - Emoji or image path
 *   description: string,         - Short description
 *   ageRange: [min, max],        - Recommended ages
 *   init(container, callbacks),  - Mount game into container
 *   destroy()                    - Tear down and clean up
 * }
 *
 * ─── CALLBACKS PROVIDED TO init() ───
 * {
 *   onExit: () => void,
 *   onProgress: (data) => Promise,
 *   getProgress: () => Promise<object>,
 *   profile: { id, name, avatar }
 * }
 */

const categories = new Map([
  ['counting', { id: 'counting', label: 'Counting', icon: '\u{1F522}', color: '#FF9F43' }],
  ['reading',  { id: 'reading',  label: 'Reading',  icon: '\u{1F4D6}', color: '#54A0FF' }],
  ['thinking', { id: 'thinking', label: 'Thinking', icon: '\u{1F9E9}', color: '#5F27CD' }],
  ['feelings', { id: 'feelings', label: 'Feelings', icon: '\u{1F49B}', color: '#FF6B6B' }],
]);

const games = new Map();

export const GameRegistry = {
  register(config) {
    if (!config.id || !config.init || !config.destroy) {
      throw new Error(`Game registration requires id, init, destroy. Got: ${config.id}`);
    }
    games.set(config.id, config);
  },

  get(id) {
    return games.get(id) || null;
  },

  getAll() {
    return Array.from(games.values());
  },

  getByCategory(categoryId) {
    return this.getAll().filter(g => g.category === categoryId);
  },

  /** Returns only categories that contain at least one registered game */
  getCategories() {
    return Array.from(categories.values()).filter(
      cat => this.getByCategory(cat.id).length > 0
    );
  },

  getCategoryInfo(id) {
    return categories.get(id) || null;
  },

  addCategory(id, label, icon, color) {
    categories.set(id, { id, label, icon, color });
  }
};
