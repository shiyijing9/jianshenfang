import { useMemo, useState } from 'react'
import { Button, Input, InputNumber, message, Modal, Space, Table, Tag, Tabs } from 'antd'
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useOrderQuery } from '../hooks/useOrderQuery.js'
import { orderApi } from '../services/orderApi.js'
import './Orders.css'

const PAGE_SIZE = 8
const STATUS_STYLE = {
  待审核: { color: 'gold', label: '待审核' },
  待制卡: { color: 'blue', label: '待制卡' },
  待寄卡: { color: 'cyan', label: '待寄卡' },
  已到期: { color: 'volcano', label: '已到期' },
  已完成: { color: 'green', label: '已完成' },
  已取消: { color: 'default', label: '已取消' },
}
const formatMoney = (value) =>
  Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (value) =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(value),
  )

function downloadCsv(rows) {
  const columns = [
    '订单号',
    '会员姓名',
    '联系电话',
    '购卡年限',
    '订单金额',
    '状态',
    '创建时间',
    '备注',
  ]
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const content = [
    columns,
    ...rows.map((order) => [
      order.id,
      order.memberName,
      order.phone,
      `${order.years}年`,
      formatMoney(order.amount),
      order.status,
      formatDate(order.createdAt),
      order.remark,
    ]),
  ]
    .map((row) => row.map(quote).join(','))
    .join('\r\n')
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `办卡订单_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [orderInput, setOrderInput] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [filters, setFilters] = useState({ orderNo: '', memberName: '' })
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewYears, setRenewYears] = useState(1)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [messageApi, contextHolder] = message.useMessage()

  const statuses = useMemo(() => {
    if (tab === 'active') return ['待审核', '待制卡', '待寄卡']
    if (tab === 'expired') return ['已到期']
    if (tab === 'completed') return ['已完成']
    if (tab === 'cancelled') return ['已取消']
    return []
  }, [tab])
  const query = useOrderQuery({
    page,
    pageSize: PAGE_SIZE,
    statuses,
    orderNo: filters.orderNo,
    memberName: filters.memberName,
    revision,
  })

  const submitSearch = () => {
    setPage(1)
    setFilters({ orderNo: orderInput, memberName: memberInput })
    setSelectedIds([])
  }
  const changeTab = (key) => {
    setTab(key)
    setPage(1)
    setSelectedIds([])
  }

  const updatePageSelection = (nextSelectedRowKeys) => {
    const currentPageIds = new Set(query.list.map((order) => order.id))
    const selectedOnCurrentPage = nextSelectedRowKeys.filter((id) => currentPageIds.has(id))

    setSelectedIds((previousIds) => [
      ...previousIds.filter((id) => !currentPageIds.has(id)),
      ...selectedOnCurrentPage,
    ])
  }

  const loadSelectedOrders = async () => {
    const result = await orderApi.list({
      page: 1,
      pageSize: 1000,
      statuses: [],
      orderNo: '',
      memberName: '',
    })
    const byId = new Map(result.list.map((order) => [order.id, order]))
    return selectedIds.map((id) => byId.get(id)).filter(Boolean)
  }

  const renew = async () => {
    if (!selectedIds.length) return messageApi.warning('请先选择要续卡的到期订单')
    const selected = await loadSelectedOrders()
    const notEligibleIds = selected
      .filter((order) => order.status !== '已到期')
      .map((order) => order.id)
    if (notEligibleIds.length)
      return messageApi.warning(`仅已到期订单可续卡：${notEligibleIds.join('、')}`)
    if (!selected.length) return messageApi.warning('未找到所选订单，请刷新后重试')
    setRenewYears(1)
    setRenewOpen(true)
  }

  const confirmRenew = async () => {
    setBusy(true)
    try {
      await orderApi.renew(selectedIds, renewYears)
      messageApi.success(`已为 ${selectedIds.length} 个订单提交续卡`)
      setRenewOpen(false)
      setSelectedIds([])
      setRevision((value) => value + 1)
    } catch {
      messageApi.error('续卡失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!selectedIds.length) return messageApi.warning('请先选择要撤单的订单')
    const selected = await loadSelectedOrders()
    const allowed = selected.filter((order) => ['待制卡', '待寄卡'].includes(order.status))
    const rejected = selected.filter((order) => !['待制卡', '待寄卡'].includes(order.status))
    if (rejected.length)
      return messageApi.warning(
        `仅待制卡、待寄卡订单可撤单：${rejected.map((order) => order.id).join('、')}`,
      )
    if (!allowed.length) return messageApi.warning('未找到可撤单订单，请刷新后重试')
    Modal.confirm({
      title: '确认撤销所选订单？',
      content: `以下 ${allowed.length} 笔订单将变为“已取消”：${allowed.map((order) => order.id).join('、')}`,
      okText: '确认撤单',
      cancelText: '再想一下',
      okButtonProps: { danger: true },
      onOk: async () => {
        await orderApi.cancel(allowed.map((order) => order.id))
        messageApi.success(`已撤销 ${allowed.length} 笔订单`)
        setSelectedIds([])
        setRevision((value) => value + 1)
      },
    })
  }

  const exportCsv = async () => {
    const all = await orderApi.list({
      page: 1,
      pageSize: 1000,
      statuses,
      orderNo: filters.orderNo,
      memberName: filters.memberName,
    })
    const target = selectedIds.length
      ? all.list.filter((order) => selectedIds.includes(order.id))
      : all.list
    const blocked = target.filter((order) => !['已完成', '已到期'].includes(order.status))
    const allowed = target.filter((order) => ['已完成', '已到期'].includes(order.status))
    if (!allowed.length)
      return messageApi.warning('没有符合导出规则的订单，仅已完成、已到期订单可导出')
    downloadCsv(allowed)
    if (blocked.length) messageApi.warning(`${blocked.length} 笔订单因状态限制未导出`)
    else messageApi.success(`已导出 ${allowed.length} 笔订单`)
  }

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'id',
      width: 172,
      render: (value) => <span className="order-number">{value}</span>,
    },
    {
      title: '会员姓名',
      dataIndex: 'memberName',
      width: 100,
      render: (value, order) => (
        <div className="member-cell">
          <span className="member-avatar">{value.slice(0, 1)}</span>
          <strong>{value}</strong>
          <small>{order.phone}</small>
        </div>
      ),
    },
    { title: '购卡年限', dataIndex: 'years', width: 92, render: (value) => `${value} 年` },
    {
      title: '订单金额',
      dataIndex: 'amount',
      width: 122,
      render: (value) => <strong className="amount-cell">¥{formatMoney(value)}</strong>,
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      width: 106,
      render: (status) => (
        <Tag color={STATUS_STYLE[status].color}>{STATUS_STYLE[status].label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: formatDate },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, order) =>
        order.status === '已到期' ? (
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            onClick={() => {
              setSelectedIds([order.id])
              setRenewYears(1)
              setRenewOpen(true)
            }}
          >
            续卡
          </Button>
        ) : (
          <span className="muted-action">—</span>
        ),
    },
  ]

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '进行中' },
    { key: 'expired', label: '已到期' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ]

  return (
    <>
      {contextHolder}
      <div className="orders-page">
        <div className="page-heading">
          <div>
            <span className="section-kicker">MEMBERSHIP / ORDERS</span>
            <h1>办卡订单</h1>
            <p>查看会员购卡记录，处理续卡与订单状态。</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/new')}>
            新建订单
          </Button>
        </div>
        <div className="overview-strip">
          <div>
            <span>当前视图</span>
            <strong>{tabs.find((item) => item.key === tab)?.label}</strong>
          </div>
          <div>
            <span>筛选结果</span>
            <strong>
              {query.total}
              <small> 笔</small>
            </strong>
          </div>
          <div>
            <span>已选择</span>
            <strong>
              {selectedIds.length}
              <small> 笔</small>
            </strong>
          </div>
          <div className="overview-mark">
            ORDERS
            <br />
            <b>CONTROL</b>
          </div>
        </div>
        <section className="orders-surface">
          <Tabs activeKey={tab} items={tabs} onChange={changeTab} className="status-tabs" />
          <div className="filter-row">
            <Input
              allowClear
              value={orderInput}
              onChange={(event) => setOrderInput(event.target.value)}
              onPressEnter={submitSearch}
              placeholder="精确搜索订单号"
              prefix={<SearchOutlined />}
            />
            <Input
              allowClear
              value={memberInput}
              onChange={(event) => setMemberInput(event.target.value)}
              onPressEnter={submitSearch}
              placeholder="按会员姓名搜索"
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={submitSearch}>
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setOrderInput('')
                setMemberInput('')
                setFilters({ orderNo: '', memberName: '' })
                setPage(1)
                setSelectedIds([])
              }}
            >
              重置
            </Button>
          </div>
          <div className="table-toolbar">
            <div className="selection-hint">
              {selectedIds.length
                ? `已选 ${selectedIds.length} 笔订单`
                : '订单默认按创建时间倒序排列'}
            </div>
            <Space wrap>
              <Button icon={<SyncOutlined />} disabled={!selectedIds.length} onClick={renew}>
                批量续卡
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                disabled={!selectedIds.length}
                onClick={cancel}
              >
                一键撤单
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportCsv}>
                导出 CSV
              </Button>
            </Space>
          </div>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={query.list}
            loading={query.loading || busy}
            rowSelection={{
              selectedRowKeys: selectedIds,
              preserveSelectedRowKeys: true,
              onChange: updatePageSelection,
            }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: query.total,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 笔订单`,
              onChange: (nextPage) => setPage(nextPage),
            }}
            scroll={{ x: 850 }}
          />
        </section>
        <Modal
          title="批量续卡"
          open={renewOpen}
          onCancel={() => setRenewOpen(false)}
          onOk={confirmRenew}
          confirmLoading={busy}
          okText="确认续卡"
          cancelText="取消"
        >
          <p className="modal-copy">
            为 {selectedIds.length} 笔已到期订单续办会员卡，续卡年限将计入原购卡年限。
          </p>
          <label className="renew-label" htmlFor="renew-years">
            续卡年限
          </label>
          <InputNumber
            id="renew-years"
            min={1}
            max={10}
            precision={0}
            value={renewYears}
            onChange={(value) => setRenewYears(value || 1)}
            addonAfter="年"
            style={{ width: '100%' }}
          />
          <div className="renew-calculation">
            <span>应付费用</span>
            <strong>¥{formatMoney(renewYears * 1200 * (renewYears >= 5 ? 0.8 : 1))}</strong>
          </div>
          <div className="renew-footnote">续卡 5 年及以上享 8 折，成功后订单将重新进入待审核。</div>
        </Modal>
      </div>
    </>
  )
}
