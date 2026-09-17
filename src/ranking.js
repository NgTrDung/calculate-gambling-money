export function sortPlayersByPoints(players) {
  return [...players].sort((a, b) => a.totalPoints - b.totalPoints ||
    a.name.localeCompare(b.name, 'vi-VN') || a.id.localeCompare(b.id))
}
