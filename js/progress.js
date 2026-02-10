/**
 * Progress Manager
 *
 * Tracks per-profile, per-game progress.
 * Games report progress through callbacks; this module persists it.
 *
 * Data shape stored under key "progress":
 * {
 *   version: 1,
 *   profiles: {
 *     "profile-id": {
 *       "game-id": {
 *         sessionsPlayed: number,
 *         currentLevel: number,
 *         bestLevel: number,
 *         lastPlayed: ISO string | null,
 *         custom: {}   ← game-specific data
 *       }
 *     }
 *   }
 * }
 */

import { Storage } from './storage.js';

const KEY = 'progress';

function makeDefault() {
  return {
    sessionsPlayed: 0,
    currentLevel: 1,
    bestLevel: 1,
    lastPlayed: null,
    custom: {}
  };
}

async function loadData() {
  return await Storage.load(KEY) || { version: 1, profiles: {} };
}

async function saveData(data) {
  await Storage.save(KEY, data);
}

export const ProgressManager = {
  async getGameProgress(profileId, gameId) {
    const data = await loadData();
    return data.profiles?.[profileId]?.[gameId] || makeDefault();
  },

  async updateGameProgress(profileId, gameId, updates) {
    const data = await loadData();
    if (!data.profiles[profileId]) data.profiles[profileId] = {};
    if (!data.profiles[profileId][gameId]) data.profiles[profileId][gameId] = makeDefault();

    Object.assign(data.profiles[profileId][gameId], updates);
    data.profiles[profileId][gameId].lastPlayed = new Date().toISOString();

    await saveData(data);
    return data.profiles[profileId][gameId];
  },

  async recordSession(profileId, gameId, level) {
    const progress = await this.getGameProgress(profileId, gameId);
    progress.sessionsPlayed++;
    progress.currentLevel = level;
    if (level > progress.bestLevel) progress.bestLevel = level;
    return this.updateGameProgress(profileId, gameId, progress);
  },

  async getAllProgress(profileId) {
    const data = await loadData();
    return data.profiles?.[profileId] || {};
  }
};
