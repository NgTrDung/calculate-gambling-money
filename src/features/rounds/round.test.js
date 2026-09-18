import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRound } from './round.js'

const player = (id, role, totalPoints = 0, active = true) => ({ id, name: id, role, totalPoints, active })

test('player wins and losses are offset by the host', () => {
  const players = [player('host', 'host'), player('one', 'player'), player('two', 'player')]
  const win = calculateRound(players, { one: '3', two: '2' })
  assert.equal(win.error, null)
  assert.equal(win.hostRoundPoints, -5)
  assert.deepEqual(win.updatedPlayers.map(({ totalPoints }) => totalPoints), [-5, 3, 2])

  const loss = calculateRound(players, { one: '-4', two: '-1' })
  assert.equal(loss.hostRoundPoints, 5)
  assert.deepEqual(loss.updatedPlayers.map(({ totalPoints }) => totalPoints), [5, -4, -1])
  assert.deepEqual(players.map(({ totalPoints }) => totalPoints), [0, 0, 0])
})

test('mixed results add to existing totals without changing retired players', () => {
  const players = [player('host', 'host', 3), player('one', 'player', -1), player('retired', 'player', -2, false)]
  const result = calculateRound(players, { one: '4', retired: '100' })
  assert.equal(result.error, null)
  assert.equal(result.hostRoundPoints, -4)
  assert.deepEqual(result.updatedPlayers.map(({ totalPoints }) => totalPoints), [-1, 3, -2])
  assert.equal(result.updatedPlayers[2], players[2])
})

test('zero round is valid and missing drafts default to zero', () => {
  const result = calculateRound([player('host', 'host'), player('one', 'player')], {})
  assert.equal(result.error, null)
  assert.equal(result.hostRoundPoints, 0)
  assert.equal(result.projectedTotal, 0)
})

test('invalid input, missing host, no player and existing imbalance block the round', () => {
  const players = [player('host', 'host'), player('one', 'player')]
  for (const value of ['1.5', 'abc', '1e3', '', '-', '9007199254740992']) {
    assert.equal(calculateRound(players, { one: value }).error, 'invalid')
  }
  assert.equal(calculateRound([player('one', 'player')], { one: '1' }).error, 'host')
  assert.equal(calculateRound([player('host', 'host')], {}).error, 'empty')
  assert.equal(calculateRound([...players, player('other', 'host')], {}).error, 'host')
  const imbalance = calculateRound([player('host', 'host', 2), player('one', 'player')], { one: '3' })
  assert.equal(imbalance.error, 'balance')
  assert.equal(imbalance.projectedTotal, 2)
  assert.equal(imbalance.hostRoundPoints, -3)
})

test('unsafe accumulated points and unsafe sums are rejected', () => {
  const players = [player('host', 'host'), player('one', 'player'), player('two', 'player')]
  assert.equal(calculateRound(players, { one: String(Number.MAX_SAFE_INTEGER), two: '1' }).error, 'range')
  assert.equal(calculateRound([player('host', 'host', Number.MAX_SAFE_INTEGER), player('one', 'player')], { one: '-1' }).error, 'range')
})
