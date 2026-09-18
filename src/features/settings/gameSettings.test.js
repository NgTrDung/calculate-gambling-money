import assert from 'node:assert/strict'
import test from 'node:test'
import { formatVnd, formatVndNumber, loadPointValueVnd, parsePointValueInput, pointToVnd, savePointValueVnd } from './gameSettings.js'

function storage(raw = null) {
  let value = raw
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next },
  }
}

test('missing or malformed settings use the default rate', () => {
  for (const raw of [null, '', '{', 'null', '{}', '{"pointValueVnd":"5000"}', '{"pointValueVnd":0}', '{"pointValueVnd":1.5}', '{"pointValueVnd":-2}', '{"pointValueVnd":9007199254740992}']) {
    assert.equal(loadPointValueVnd(storage(raw)), 1000)
  }
  assert.equal(loadPointValueVnd({ getItem: () => { throw new Error('blocked') } }), 1000)
})

test('saved point value is numeric and survives loading', () => {
  const local = storage()
  savePointValueVnd(local, 5000)
  assert.equal(local.getItem(), '{"pointValueVnd":5000}')
  assert.equal(loadPointValueVnd(local), 5000)
  assert.throws(() => savePointValueVnd(local, 0), RangeError)
  assert.equal(loadPointValueVnd(local), 5000)
})

test('input accepts positive integers and Vietnamese thousands, never decimals', () => {
  for (const [input, expected] of [['1000', 1000], ['1.000', 1000], ['10.000', 10000], ['50000', 50000]]) {
    assert.equal(parsePointValueInput(input), expected)
  }
  for (const input of ['', '0', '-1000', '1.5', '1500.5', 'abc', '1e3', 'NaN', 'Infinity', '1,000', '1.00', '9007199254740992']) {
    assert.equal(parsePointValueInput(input), null, input)
  }
})

test('money uses the current rate without changing points', () => {
  const players = [{ totalPoints: 3 }, { totalPoints: -2 }]
  assert.equal(pointToVnd(players[0].totalPoints, 5000), 15000)
  assert.equal(pointToVnd(players[1].totalPoints, 5000), -10000)
  assert.equal(formatVnd(15000), '15.000đ')
  assert.equal(formatVndNumber(100000), '100.000')
  assert.deepEqual(players.map((player) => player.totalPoints), [3, -2])
})
