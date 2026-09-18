export const GAME_SETTINGS_KEY = 'gameSettings'
export const DEFAULT_POINT_VALUE_VND = 1000

const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export function isValidPointValueVnd(value) {
  return Number.isSafeInteger(value) && value > 0
}

export function parsePointValueInput(value) {
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value)) return null
  const parsed = Number(value.replaceAll('.', ''))
  return isValidPointValueVnd(parsed) ? parsed : null
}

export function loadPointValueVnd(storage = localStorage) {
  try {
    const settings = JSON.parse(storage.getItem(GAME_SETTINGS_KEY))
    return isValidPointValueVnd(settings?.pointValueVnd)
      ? settings.pointValueVnd
      : DEFAULT_POINT_VALUE_VND
  } catch {
    return DEFAULT_POINT_VALUE_VND
  }
}

export function savePointValueVnd(storage, value) {
  if (!isValidPointValueVnd(value)) throw new RangeError('Invalid point value')
  storage.setItem(GAME_SETTINGS_KEY, JSON.stringify({ pointValueVnd: value }))
}

export function formatVndNumber(value) {
  return vndFormatter.format(value)
}

export function formatVnd(value) {
  return `${formatVndNumber(value)}đ`
}

export function pointToVnd(points, pointValueVnd) {
  if (!Number.isSafeInteger(points) || !isValidPointValueVnd(pointValueVnd)) return null
  const amount = points * pointValueVnd
  return Number.isSafeInteger(amount) ? amount : null
}
