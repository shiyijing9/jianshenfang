export const ORDER_STATUSES = ['待审核', '待制卡', '待寄卡', '已到期', '已完成', '已取消']

const people = [
  '林知夏',
  '周予安',
  '陈一诺',
  '沈星河',
  '许清禾',
  '顾南枝',
  '江屿白',
  '宋明月',
  '陆景行',
  '苏念',
  '叶初',
  '温以宁',
]
const statuses = ['待审核', '待制卡', '待寄卡', '已到期', '已完成', '已取消']

export function createSeedOrders() {
  return Array.from({ length: 36 }, (_, index) => {
    const createdAt = new Date(Date.now() - index * 86400000 - (index % 7) * 3600000)
    const years = (index % 10) + 1
    return {
      id: `ORD-${String(20260901 + index).padStart(8, '0')}`,
      memberName: people[index % people.length],
      phone: `138${String(10000000 + index * 7919).slice(-8)}`,
      years,
      amount: years * 1200,
      status: statuses[index % statuses.length],
      createdAt: createdAt.toISOString(),
      remark: index % 4 === 0 ? '关注体测与训练计划' : '',
    }
  })
}

export function loadOrders() {
  try {
    const stored = JSON.parse(localStorage.getItem('club_orders') || 'null')
    if (Array.isArray(stored) && stored.length) return stored
  } catch {
    localStorage.removeItem('club_orders')
  }
  const seeded = createSeedOrders()
  localStorage.setItem('club_orders', JSON.stringify(seeded))
  return seeded
}

export function saveOrders(orders) {
  localStorage.setItem('club_orders', JSON.stringify(orders))
}
