import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRankingText, formatMoneyK, formatPointMoneyK, getRankingChartLayout, sortPlayersByPoints } from './ranking.js'
import { renderRankingChartCanvas } from './rankingExport.js'

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
  assert.equal(buildRankingText(sortPlayersByPoints(players), 2000), 'Nam | -5 | -10k\nTuấn | -2 | -4k\nHoàng | 0 | 0k\nMinh | +3 | +6k\nAn | +7 | +14k')
})

test('money labels use the current point value without rounding custom rates', () => {
  assert.equal(formatPointMoneyK(10, 1000), '+10k')
  assert.equal(formatPointMoneyK(-10, 1000), '-10k')
  assert.equal(formatPointMoneyK(0, 1000), '0k')
  assert.equal(formatPointMoneyK(5, 2000), '+10k')
  assert.equal(formatPointMoneyK(-3, 2000), '-6k')
  assert.equal(formatPointMoneyK(1, 1500), '+1.5k')
  assert.equal(formatPointMoneyK(3, 1500), '+4.5k')
  assert.equal(formatPointMoneyK(-1, 1500), '-1.5k')
  assert.equal(formatMoneyK(1001), '+1.001k')
  const nam = { name: 'Nam', totalPoints: 5 }
  assert.equal(buildRankingText([nam], 1000), 'Nam | +5 | +5k')
  assert.equal(buildRankingText([nam], 5000), 'Nam | +5 | +25k')
  assert.equal(nam.totalPoints, 5)
})

test('copy text keeps ranking order, Vietnamese names, and three columns', () => {
  const players = [
    { id: 'nam', name: 'Nam', totalPoints: 5, active: true },
    { id: 'minh', name: 'Minh', totalPoints: -3, active: false },
    { id: 'hoang', name: 'Hoàng', totalPoints: 0, active: true },
  ]
  assert.equal(buildRankingText(sortPlayersByPoints(players), 2000), 'Minh | -3 | -6k\nHoàng | 0 | 0k\nNam | +5 | +10k')
})

test('ranking breaks ties by name then ID', () => {
  const players = [
    { id: 'b', name: 'Minh', totalPoints: 0 },
    { id: 'c', name: 'An', totalPoints: 0 },
    { id: 'a', name: 'Minh', totalPoints: 0 },
  ]
  assert.deepEqual(sortPlayersByPoints(players).map((player) => player.id), ['c', 'a', 'b'])
})

test('ranking text keeps Vietnamese names and canvas draws the full dataset', () => {
  const players = Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Đức Anh ${index}`, totalPoints: index - 10 }))
  assert.match(buildRankingText(players, 1500), /Đức Anh 0 \| -10 \| -15k/)
  assert.equal(getRankingChartLayout(players).width, 1480)
  const rectangles = []
  const labels = []
  const context = {
    scale: () => {},
    fillRect: (...args) => rectangles.push(args),
    measureText: (text) => ({ width: text.length * 6 }),
    fillText: (value) => labels.push(value),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  }
  const canvas = { getContext: () => context }
  const document = { createElement: () => canvas }
  assert.equal(renderRankingChartCanvas(players, 1500, false, document), canvas)
  assert.equal(canvas.width, 2960)
  assert.equal(canvas.height, 568)
  assert.equal(rectangles.length, 21)
  assert.equal(rectangles.at(-1)[0], 1428)
  assert.ok(labels.includes('Điểm'))
  assert.ok(labels.includes('Đức Anh 0'))
  assert.ok(labels.includes('-15k'))
  assert.ok(labels.includes('+13.5k'))
  assert.equal(labels.filter((label) => /^[+-]?\d+(?:\.\d+)?k$/.test(label)).length, players.length)
  rectangles.length = 0
  renderRankingChartCanvas(players, 1500, true, document)
  assert.equal(rectangles.length, 21)
})
