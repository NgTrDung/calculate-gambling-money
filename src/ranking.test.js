import assert from 'node:assert/strict'
import test from 'node:test'
import { sortPlayersByPoints } from './ranking.js'

test('ranking includes retired players and sorts negative, zero and positive points', () => {
  const players = [
    { id: 'nam', name: 'Nam', totalPoints: -5, active: true },
    { id: 'minh', name: 'Minh', totalPoints: 3, active: false },
    { id: 'hoang', name: 'Hoàng', totalPoints: 0, active: true },
    { id: 'tuan', name: 'Tuấn', totalPoints: -2, active: false },
    { id: 'an', name: 'An', totalPoints: 7, active: true },
  ]
  assert.deepEqual(sortPlayersByPoints(players).map((player) => player.name), ['Nam', 'Tuấn', 'Hoàng', 'Minh', 'An'])
  assert.equal(players[0].name, 'Nam')
})

test('ranking breaks ties by name then ID', () => {
  const players = [
    { id: 'b', name: 'Minh', totalPoints: 0 },
    { id: 'c', name: 'An', totalPoints: 0 },
    { id: 'a', name: 'Minh', totalPoints: 0 },
  ]
  assert.deepEqual(sortPlayersByPoints(players).map((player) => player.id), ['c', 'a', 'b'])
})
