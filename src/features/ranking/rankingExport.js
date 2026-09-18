import { formatSignedPoint } from '../history/history.js'
import { formatPointMoneyK, getRankingChartLayout, RANKING_CHART } from './ranking.js'

function fitLabel(context, name, maxWidth) {
  if (context.measureText(name).width <= maxWidth) return name
  let end = name.length
  while (end > 0 && context.measureText(`${name.slice(0, end)}…`).width > maxWidth) end -= 1
  return `${name.slice(0, end)}…`
}

export function renderRankingChartCanvas(players, pointValueVnd, dark, doc = document) {
  const layout = getRankingChartLayout(players)
  const scale = layout.width > 4096 ? 1 : 2
  const canvas = doc.createElement('canvas')
  canvas.width = layout.width * scale
  canvas.height = RANKING_CHART.height * scale
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.scale(scale, scale)

  const colors = dark ? {
    background: '#18181b', axis: '#a1a1aa', text: '#e4e4e7',
    positive: '#34d399', negative: '#fb7185', zero: '#d4d4d8',
  } : {
    background: '#ffffff', axis: '#64748b', text: '#1e293b',
    positive: '#059669', negative: '#e11d48', zero: '#64748b',
  }
  context.fillStyle = colors.background
  context.fillRect(0, 0, layout.width, RANKING_CHART.height)
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  context.font = '11px system-ui, sans-serif'
  context.fillStyle = colors.axis
  context.fillText('Điểm', 36, 9)
  if (layout.high !== 0) context.fillText(formatSignedPoint(layout.high), 36, RANKING_CHART.plotTop)
  context.fillText('0', 36, layout.zeroY)
  if (layout.low !== 0) context.fillText(formatSignedPoint(layout.low), 36, RANKING_CHART.plotTop + RANKING_CHART.plotHeight)
  context.beginPath()
  context.moveTo(RANKING_CHART.axisWidth, layout.zeroY + 0.5)
  context.lineTo(layout.width, layout.zeroY + 0.5)
  context.lineWidth = 2
  context.strokeStyle = colors.axis
  context.stroke()

  players.forEach((player, index) => {
    const x = RANKING_CHART.axisWidth + index * RANKING_CHART.slotWidth + RANKING_CHART.slotWidth / 2
    const pointY = layout.y(player.totalPoints)
    const barTop = player.totalPoints === 0 ? layout.zeroY - 2 : Math.min(pointY, layout.zeroY)
    const barHeight = player.totalPoints === 0 ? 4 : Math.abs(pointY - layout.zeroY)
    const color = player.totalPoints > 0 ? colors.positive : player.totalPoints < 0 ? colors.negative : colors.zero
    context.fillStyle = color
    context.fillRect(x - 16, barTop, 32, barHeight)
    context.textAlign = 'center'
    context.font = '500 12px system-ui, sans-serif'
    context.fillStyle = colors.text
    context.fillText(fitLabel(context, player.name, RANKING_CHART.slotWidth - 8), x, 227)
    context.font = '600 12px system-ui, sans-serif'
    context.fillStyle = color
    context.fillText(formatPointMoneyK(player.totalPoints, pointValueVnd), x, 249)
  })
  return canvas
}

export async function downloadRankingPng(players, pointValueVnd, dark) {
  const canvas = renderRankingChartCanvas(players, pointValueVnd, dark)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('PNG export failed')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'bang-xep-hang.png'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
