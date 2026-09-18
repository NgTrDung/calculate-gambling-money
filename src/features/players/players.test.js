import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanName, getPlayerErrors, parsePointInput, parseSavedPlayers, restorePlayer, retirePlayer, setHost, totalPoints } from './players.js'

const player = (id, name, role = 'player') => ({ id, name, role, totalPoints: 0, active: true })

test('trims names and accepts Vietnamese letters and digits', () => {
  assert.equal(cleanName('  Nguyễn   Văn A  '), 'Nguyễn Văn A')
  assert.equal(getPlayerErrors([player('1', 'Đức Anh'), player('2', 'Player 1')], true).size, 0)
})

test('rejects blank names and emoji while marking every duplicate', () => {
  const rows = [
    player('1', ' Nam ', 'host'),
    player('2', 'nam'),
    player('3', 'NAM'),
    player('4', '🔥Hoàng'),
    player('5', '   '),
  ]
  const errors = getPlayerErrors(rows, true)
  assert.deepEqual([...errors.entries()], [
    ['4', 'invalid'],
    ['5', 'empty'],
    ['1', 'duplicate'],
    ['2', 'duplicate'],
    ['3', 'duplicate'],
  ])
})

test('marks new names that duplicate saved players without changing saved data', () => {
  const existing = [player('saved-1', 'Hoàng', 'host')]
  const rows = [player('new-1', ' hoàng '), player('new-2', 'Đức Anh')]
  assert.deepEqual([...getPlayerErrors(rows, true, existing).entries()], [['new-1', 'duplicate']])
  assert.deepEqual(existing, [player('saved-1', 'Hoàng', 'host')])
})

test('changing host leaves exactly one host', () => {
  const rows = [player('1', 'Nam', 'host'), player('2', 'Hoàng')]
  assert.deepEqual(setHost(rows, '2').map(({ role }) => role), ['player', 'host'])
  assert.deepEqual(setHost(rows, 'missing'), rows)
  assert.deepEqual(setHost([{ ...rows[0], active: false }, rows[1]], '1')[0].role, 'host')
})

test('retiring preserves points and blocks retiring a host with active peers', () => {
  const rows = [{ ...player('1', 'Nam', 'host'), totalPoints: 3 }, { ...player('2', 'Minh'), totalPoints: -3 }]
  assert.equal(retirePlayer(rows, '1'), rows)
  const retired = retirePlayer(rows, '2')
  assert.deepEqual(retired[1], { ...rows[1], active: false })
  assert.equal(totalPoints(retired), 0)
  assert.deepEqual(retirePlayer([rows[0]], '1')[0], { ...rows[0], active: false, role: 'player' })
})

test('restoring reuses the same player and keeps the current host', () => {
  const rows = [
    { ...player('1', 'Nam', 'host'), totalPoints: 5 },
    { ...player('2', 'Minh'), totalPoints: -5, active: false },
  ]
  const restored = restorePlayer(rows, '2')
  assert.deepEqual(restored[1], { ...rows[1], active: true })
  assert.equal(restored[0].role, 'host')
  assert.equal(totalPoints(restored), 0)
  assert.equal(restorePlayer(restored, '2'), restored)

  const cycled = restorePlayer(retirePlayer(restored, '2'), '2')
  assert.deepEqual(cycled, restored)
  assert.equal(new Set(cycled.map(({ id }) => id)).size, cycled.length)
})

test('restoring the first active player assigns host without changing identity or points', () => {
  const rows = [{ ...player('1', 'Minh'), totalPoints: -3, active: false }]
  assert.deepEqual(restorePlayer(rows, '1'), [{ ...rows[0], active: true, role: 'host' }])
})

test('point input accepts only safe integers and total includes retired players', () => {
  for (const value of ['0', '1', '-1', '12', '-20']) assert.equal(parsePointInput(value), Number(value))
  for (const value of ['1.5', 'abc', '1e3', 'NaN', 'Infinity', '', '-', '9007199254740992']) {
    assert.equal(parsePointInput(value), null)
  }
  assert.equal(totalPoints([
    { ...player('1', 'Nam', 'host'), totalPoints: 5 },
    { ...player('2', 'Minh'), totalPoints: -3 },
    { ...player('3', 'Hoàng'), totalPoints: -2, active: false },
  ]), 0)
})

test('loads only valid saved player lists', () => {
  const rows = [player('1', 'Nam', 'host'), player('2', 'Hoàng')]
  assert.deepEqual(parseSavedPlayers(JSON.stringify(rows)), rows)
  assert.equal(parseSavedPlayers('{broken'), null)
  assert.deepEqual(parseSavedPlayers('[]'), [])
  assert.deepEqual(parseSavedPlayers(JSON.stringify([player('1', 'Nam')])), [player('1', 'Nam')])
  assert.equal(parseSavedPlayers(JSON.stringify([player('1', 'Nam', 'host'), player('2', ' nam ')])), null)
  assert.equal(parseSavedPlayers(JSON.stringify([player('1', 'Nam', 'host'), player('1', 'Hoàng')])), null)
  assert.equal(parseSavedPlayers(JSON.stringify([player('1', 'Nam', 'host'), player('2', 'Hoàng', 'host')])), null)
  const savedWithPoints = [{ ...player('1', 'Nam', 'host'), totalPoints: 12, note: 'keep' }]
  assert.deepEqual(parseSavedPlayers(JSON.stringify(savedWithPoints)), savedWithPoints)
  const legacy = [{ id: 'old', name: 'Lan', role: 'host', totalPoints: 4 }]
  assert.deepEqual(parseSavedPlayers(JSON.stringify(legacy)), [{ ...legacy[0], active: true }])
  const retiredHost = [{ ...player('1', 'Nam', 'host'), active: false }, player('2', 'Minh')]
  assert.deepEqual(parseSavedPlayers(JSON.stringify(retiredHost))[0].role, 'player')
  const mixedHosts = [player('1', 'Nam', 'host'), { ...player('2', 'Minh', 'host'), active: false }]
  assert.deepEqual(parseSavedPlayers(JSON.stringify(mixedHosts))[1].role, 'player')
})
