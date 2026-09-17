import { HISTORY_KEY } from './history.js'

export const GAME_DATA_KEYS = ['players', HISTORY_KEY]

export function clearGameData(storage = localStorage) {
  const previous = new Map(GAME_DATA_KEYS.map((key) => [key, storage.getItem(key)]))
  const removed = []
  try {
    for (const key of GAME_DATA_KEYS) {
      storage.removeItem(key)
      removed.push(key)
    }
  } catch (error) {
    for (const key of removed.reverse()) {
      const value = previous.get(key)
      if (value !== null) storage.setItem(key, value)
    }
    throw error
  }
}
