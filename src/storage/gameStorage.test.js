import assert from 'node:assert/strict'
import test from 'node:test'
import { clearGameData, GAME_DATA_KEYS } from './gameStorage.js'

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

test('deletes only gameplay keys and preserves theme', () => {
  assert.deepEqual(GAME_DATA_KEYS, ['players', 'roundHistory', 'gameSettings'])
  const storage = createStorage({ players: 'broken json', roundHistory: 'also broken', gameSettings: '{"pointValueVnd":5000}', theme: 'dark', other: 'keep' })
  clearGameData(storage)
  assert.equal(storage.getItem('players'), null)
  assert.equal(storage.getItem('roundHistory'), null)
  assert.equal(storage.getItem('gameSettings'), null)
  assert.equal(storage.getItem('theme'), 'dark')
  assert.equal(storage.getItem('other'), 'keep')
  clearGameData(storage)
  assert.equal(storage.getItem('players'), null)
})

test('restores players and history if settings removal fails', () => {
  const storage = createStorage({ players: '[1]', roundHistory: '[2]', gameSettings: '{"pointValueVnd":5000}', theme: 'light' })
  const remove = storage.removeItem
  storage.removeItem = (key) => {
    if (key === 'gameSettings') throw new Error('blocked')
    remove(key)
  }
  assert.throws(() => clearGameData(storage), /blocked/)
  assert.equal(storage.getItem('players'), '[1]')
  assert.equal(storage.getItem('roundHistory'), '[2]')
  assert.equal(storage.getItem('gameSettings'), '{"pointValueVnd":5000}')
  assert.equal(storage.getItem('theme'), 'light')
})
