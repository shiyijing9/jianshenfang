import { useState } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { App as AntdApp, Button, Layout, Menu } from 'antd'
import {
  AppstoreOutlined,
  FileAddOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useAuthStore } from './store/auth.js'
import { LoginPage } from './pages/LoginPage.jsx'
import { OrdersPage } from './pages/OrdersPage.jsx'
import { NewOrderPage } from './pages/NewOrderPage.jsx'
import './App.css'

const { Header, Sider, Content } = Layout

function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return <DashboardLayout />
}

function DashboardLayout() {
  const { message: messageApi } = AntdApp.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const username = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)
  const [collapsed, setCollapsed] = useState(false)
  const items = [
    { key: '/orders', icon: <UnorderedListOutlined />, label: '订单列表' },
    { key: '/orders/new', icon: <FileAddOutlined />, label: '新建订单' },
  ]

  return (
    <Layout className="app-shell">
      <Sider
        className="app-sider"
        width={228}
        collapsed={collapsed}
        collapsible
        onCollapse={setCollapsed}
      >
        <div className="brand-lockup">
          <div className="brand-mark">
            <AppstoreOutlined />
          </div>
          {!collapsed && (
            <div>
              <strong>FORM / CLUB</strong>
              <span>会员运营中心</span>
            </div>
          )}
        </div>
        <div className="nav-caption">工作台</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname === '/orders/new' ? '/orders/new' : '/orders']}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
        {!collapsed && (
          <div className="sider-note">
            <span className="online-dot" />
            业务系统运行中<span>MOCK ENVIRONMENT</span>
          </div>
        )}
      </Sider>
      <Layout className="main-layout">
        <Header className="topbar">
          <div className="topbar-context">
            <span>会员管理</span>
            <span className="context-divider">/</span>
            <strong>{location.pathname === '/orders/new' ? '新建订单' : '办卡订单'}</strong>
          </div>
          <div className="user-tools">
            <div className="user-avatar">{username.slice(0, 1).toUpperCase()}</div>
            <span className="user-name">{username}</span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout()
                messageApi.success('已退出登录')
                navigate('/login', { replace: true })
              }}
            >
              退出
            </Button>
          </div>
        </Header>
        <Content className="page-content">
          <Outlet />
        </Content>
        <footer className="app-footer">
          FORM / CLUB <span>MEMBERSHIP OPERATIONS</span>
        </footer>
      </Layout>
    </Layout>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Navigate to="/orders" replace /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/orders/new', element: <NewOrderPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <div className="not-found">
        <span>404</span>
        <h1>页面不存在</h1>
        <a href="/orders">返回订单列表</a>
      </div>
    ),
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
