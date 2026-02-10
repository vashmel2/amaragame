/**
 * Profile Manager
 *
 * Handles child profiles. Currently single-profile,
 * but the data shape supports multiple profiles for later.
 *
 * Data shape stored under key "profiles":
 * {
 *   version: 1,
 *   active: "profile-id" | null,
 *   profiles: {
 *     "profile-id": { id, name, avatar, createdAt }
 *   }
 * }
 */

import { Storage } from './storage.js';

const KEY = 'profiles';

function generateId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function loadData() {
  return await Storage.load(KEY) || { version: 1, active: null, profiles: {} };
}

async function saveData(data) {
  await Storage.save(KEY, data);
}

export const ProfileManager = {
  async getActiveProfile() {
    const data = await loadData();
    if (!data.active || !data.profiles[data.active]) return null;
    return data.profiles[data.active];
  },

  async createProfile(name, avatar = '\u{1F984}') {
    const data = await loadData();
    const id = generateId();
    const profile = { id, name, avatar, createdAt: new Date().toISOString() };
    data.profiles[id] = profile;
    data.active = id;
    await saveData(data);
    return profile;
  },

  async getAllProfiles() {
    const data = await loadData();
    return Object.values(data.profiles);
  },

  async setActiveProfile(id) {
    const data = await loadData();
    if (data.profiles[id]) {
      data.active = id;
      await saveData(data);
      return true;
    }
    return false;
  },

  async updateProfile(id, updates) {
    const data = await loadData();
    if (data.profiles[id]) {
      Object.assign(data.profiles[id], updates);
      await saveData(data);
      return data.profiles[id];
    }
    return null;
  }
};
