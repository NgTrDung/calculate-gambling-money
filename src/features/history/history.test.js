import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoundHistory, formatSignedPoint, getPlayerHistoryPoints, HISTORY_KEY, loadRoundHistory, paginateRoundHistory, parseRoundHistory, saveCompletedRound, sortRoundHistory } from './history.js'

const player = (id, name, role, totalPoints = 0, active = true) => ({ id, name, role, totalPoints, active })
const players = [
  player('host', 'Nam', 'host', -5),
  player('one', 'Minh', 'player', 3),
  player('two', 'Hoàng', 'player', 2),
  player('retired', 'Tuấn', 'player', 0, false),
]
const updatedPlayers = players.map((item) => ({
  ...item,
  totalPoints: { host: -8, one: 7, two: 1, retired: 0 }[item.id],
}))
const round = createRoundHistory(players, updatedPlayers, { one: '4', two: '-1' }, -3, 'round-1', '2026-09-17T09:00:00.000Z')

function storage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

test('snapshot stores only active participants and round deltas', () => {
  assert.deepEqual(round.players, [
    { playerId: 'host', name: 'Nam', role: 'host', point: -3, totalPointsAfterRound: -8 },
    { playerId: 'one', name: 'Minh', role: 'player', point: 4, totalPointsAfterRound: 7 },
    { playerId: 'two', name: 'Hoàng', role: 'player', point: -1, totalPointsAfterRound: 1 },
  ])
  const changed = players.map((item) => ({ ...item, name: 'Changed', role: 'player', totalPoints: 99 }))
  assert.equal(changed[0].name, 'Changed')
  assert.equal(round.players[0].name, 'Nam')
  assert.equal(round.players[0].role, 'host')
  assert.equal(round.players[1].point, 4)
  assert.equal(round.players[1].totalPointsAfterRound, 7)
})

test('malformed history is filtered and newest rounds sort first without mutating storage order', () => {
  assert.deepEqual(parseRoundHistory('broken'), [])
  assert.deepEqual(parseRoundHistory('{}'), [])
  const older = { ...round, id: 'older', completedAt: '2026-09-16T09:00:00.000Z' }
  const invalid = { ...round, id: 'invalid', players: [{ ...round.players[0], point: 2 }, round.players[1]] }
  assert.deepEqual(parseRoundHistory(JSON.stringify([older, null, invalid, round])), [older, round])
  const source = [older, round]
  assert.deepEqual(sortRoundHistory(source), [round, older])
  assert.deepEqual(source, [older, round])
  assert.deepEqual([formatSignedPoint(4), formatSignedPoint(-3), formatSignedPoint(0)], ['+4', '-3', '0'])
  assert.deepEqual(parseRoundHistory(JSON.stringify([{ ...round, players: round.players.map((item) => ({ ...item, totalPointsAfterRound: undefined })) }])).length, 1)
  assert.deepEqual(parseRoundHistory(JSON.stringify([{ ...round, players: [{ ...round.players[0], totalPointsAfterRound: 'wrong' }, ...round.players.slice(1)] }])), [])
})

test('player series uses immutable totals and derives legacy cumulative points', () => {
  const legacy = [3, -2, 5].map((point, index) => ({
    id: `legacy-${index}`,
    completedAt: new Date(Date.UTC(2026, 8, index + 1)).toISOString(),
    players: [
      { playerId: 'host', name: 'Nam', role: 'host', point: -point },
      { playerId: 'one', name: 'Minh', role: 'player', point },
    ],
  }))
  assert.deepEqual(getPlayerHistoryPoints([...legacy].reverse(), 'one').map((item) => item.totalPoints), [3, 1, 6])
  const withGap = [legacy[0], { ...legacy[1], players: legacy[1].players.map((item) => ({ ...item, playerId: item.playerId === 'one' ? 'other' : item.playerId })) }, round]
  assert.deepEqual(getPlayerHistoryPoints(withGap, 'one').map((item) => [item.round, item.totalPoints]), [[1, 3], [3, 7]])
  assert.equal(getPlayerHistoryPoints(withGap, 'retired').length, 0)
})

test('pagination handles 0, 1, 5, 6, 10 and 11+ rounds without missing items', () => {
  for (const count of [0, 1, 5, 6, 10, 11, 12]) {
    const history = Array.from({ length: count }, (_, index) => index)
    const totalPages = Math.max(1, Math.ceil(count / 5))
    const pages = Array.from({ length: totalPages }, (_, index) => paginateRoundHistory(history, index + 1))
    assert.deepEqual(pages.flatMap((page) => page.items), history)
    assert.ok(pages.every((page) => page.items.length <= 5 && page.totalPages === totalPages))
    assert.equal(paginateRoundHistory(history, 999).currentPage, totalPages)
    assert.equal(paginateRoundHistory(history, 0).currentPage, 1)
  }
})

test('successful save writes one snapshot and final player totals', () => {
  const saved = storage({ players: JSON.stringify(players) })
  saveCompletedRound(saved, updatedPlayers, round)
  assert.deepEqual(loadRoundHistory(saved), [round])
  assert.deepEqual(JSON.parse(saved.getItem('players')), updatedPlayers)
  saveCompletedRound(saved, updatedPlayers, { ...round, id: 'round-2' })
  assert.equal(loadRoundHistory(saved).length, 2)
})

test('failure to write players rolls history back', () => {
  const originalHistory = JSON.stringify([round])
  const saved = storage({ players: JSON.stringify(players), [HISTORY_KEY]: originalHistory })
  const originalSet = saved.setItem
  saved.setItem = (key, value) => {
    if (key === 'players') throw new Error('quota')
    originalSet(key, value)
  }
  assert.throws(() => saveCompletedRound(saved, players, { ...round, id: 'round-2' }), /quota/)
  assert.equal(saved.getItem(HISTORY_KEY), originalHistory)
  assert.deepEqual(JSON.parse(saved.getItem('players')), players)
})
