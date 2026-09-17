import assert from 'node:assert/strict'

const target = await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (!message.id) return
  const callback = pending.get(message.id)
  pending.delete(message.id)
  callback(message)
})
function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result))
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 140))
const players = [
  { id: 'host', name: 'Nam', role: 'host', totalPoints: 0, active: true },
  ...Array.from({ length: 14 }, (_, index) => ({ id: `p${index}`, name: `Player ${index + 1}`, role: 'player', totalPoints: 0, active: true })),
]
const rounds = Array.from({ length: 12 }, (_, index) => ({
  id: `round-${index}`,
  completedAt: new Date(Date.UTC(2026, 8, index + 1)).toISOString(),
  players: [
    { playerId: 'host', name: 'Nam', role: 'host', point: -1, totalPointsAfterRound: -index - 1 },
    { playerId: 'p0', name: 'Player 1', role: 'player', point: 1, totalPointsAfterRound: index + 1 },
  ],
}))
async function openCard(label) {
  await evaluate(`Array.from(document.querySelectorAll('main button')).find((button) => button.textContent.includes(${JSON.stringify(label)})).click()`)
  await pause()
}
async function returnMain() {
  await evaluate(`document.querySelector('footer button').click()`)
  await pause()
}
async function checkShell(name, hasFooter = true, requireScroll = true) {
  const state = await evaluate(`(() => { const header = document.querySelector('header'); const footer = document.querySelector('footer'); const body = document.querySelector('[data-page-scroll]'); const h = header.getBoundingClientRect(); const f = footer?.getBoundingClientRect(); const b = body.getBoundingClientRect(); const before = { headerTop: h.top, headerBottom: h.bottom, footerTop: f?.top, footerBottom: f?.bottom, bodyTop: b.top, bodyBottom: b.bottom, pageY: scrollY }; body.scrollTop = body.scrollHeight; const after = { headerTop: header.getBoundingClientRect().top, footerTop: footer?.getBoundingClientRect().top, bodyScroll: body.scrollTop, pageY: scrollY }; return { before, after, bodyCanScroll: body.scrollHeight > body.clientHeight, htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyOverflow: getComputedStyle(document.body).overflow, pageOverflow: document.documentElement.scrollWidth > innerWidth }; })()`)
  assert.equal(state.htmlOverflow, 'hidden')
  assert.equal(state.bodyOverflow, 'hidden')
  assert.equal(state.after.pageY, state.before.pageY, `${name}: document moved`)
  assert.equal(state.pageOverflow, false, `${name}: horizontal overflow`)
  assert.ok(state.before.headerTop >= 0 && state.before.bodyTop >= state.before.headerBottom - 1)
  assert.equal(state.after.headerTop, state.before.headerTop)
  if (hasFooter) {
    assert.ok(state.before.footerBottom <= await evaluate('innerHeight') + 1)
    assert.ok(state.before.bodyBottom <= state.before.footerTop + 1)
    assert.equal(state.after.footerTop, state.before.footerTop)
  }
  if (requireScroll) {
    assert.equal(state.bodyCanScroll, true, `${name}: body should scroll`)
    assert.ok(state.after.bodyScroll > 0, `${name}: body scrollTop`)
  }
  return state
}
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/calculate-gambling-money/' })
  await pause()
  await evaluate(`localStorage.setItem('players', ${JSON.stringify(JSON.stringify(players))}); localStorage.setItem('roundHistory', ${JSON.stringify(JSON.stringify(rounds))}); localStorage.setItem('theme', 'light'); location.reload()`)
  await pause()
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 900], [1280, 800]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
    await pause()
    await checkShell(`Main ${width}`, false, width < 768)
    await openCard('Thêm người chơi')
    for (let i = 0; i < 10; i++) {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find((button) => button.textContent.includes('Thêm người chơi')).click()`)
      await pause()
    }
    await checkShell(`Add ${width}`)
    await evaluate(`document.querySelector('main input:last-of-type')?.focus()`)
    await returnMain()
    await openCard('Thông tin người chơi')
    await checkShell(`Info ${width}`)
    const infoScroll = await evaluate(`document.querySelector('[data-page-scroll]').scrollTop`)
    await evaluate(`document.querySelector('header button[aria-label="Hướng dẫn"]').click()`)
    await pause()
    assert.equal(await evaluate(`document.querySelector('[data-page-scroll]').style.overflowY`), 'hidden')
    assert.equal(await evaluate(`document.querySelector('[role=dialog]').getBoundingClientRect().bottom <= innerHeight`), true)
    await evaluate(`document.querySelector('[role=dialog] button[aria-label="Đóng hướng dẫn"]').click()`)
    await pause()
    assert.equal(await evaluate(`document.querySelector('[data-page-scroll]').scrollTop`), infoScroll)
    assert.equal(await evaluate(`document.querySelector('[data-page-scroll]').style.overflowY`), '')
    await returnMain()
    await openCard('Kết thúc ván')
    await checkShell(`Round ${width}`)
    await returnMain()
    await openCard('Lịch sử ván đánh')
    const historyState = await checkShell(`History ${width}`, true, height < 700)
    assert.ok(historyState.before.footerTop > historyState.before.bodyTop)
    await returnMain()
    await openCard('BXH')
    await evaluate(`Array.from(document.querySelectorAll('[role=tab]')).find((button) => button.textContent.includes('Chi tiết')).click()`)
    await pause()
    await checkShell(`BXH ${width}`)
    await returnMain()
    console.log(`${width}x${height}: all page shells and modal lock OK`)
  }
} finally {
  await fetch(`http://127.0.0.1:9223/json/close/${target.id}`)
}
