import { App as AntdApp, Button, Form, Input } from 'antd'
import { ArrowRightOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.js'
import './LoginPage.css'

export function LoginPage() {
  const { message: messageApi } = AntdApp.useApp()
  const login = useAuthStore((state) => state.login)
  const token = useAuthStore((state) => state.token)
  const location = useLocation()
  const navigate = useNavigate()
  if (token) return <Navigate to="/orders" replace />

  const onFinish = ({ username }) => {
    login(username.trim())
    messageApi.success('登录成功')
    navigate(location.state?.from?.pathname || '/orders', { replace: true })
  }

  return (
    <main className="login-page">
      <div className="login-grid" />
      <section className="login-art">
        <div className="login-brand">
          <span className="login-brand-mark">F</span>
          <span>FORM / CLUB</span>
        </div>
        <div className="art-copy">
          <span className="eyebrow">MEMBERSHIP OPERATIONS</span>
          <h1>
            更好的训练，
            <br />
            从每一次加入开始。
          </h1>
          <p>把会员关系与办卡服务，管理得清晰而可靠。</p>
        </div>
        <div className="art-bottom">
          <span>EST. 2024</span>
          <span>FITNESS, IN GOOD FORM.</span>
        </div>
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="form-kicker">欢迎回来</span>
          <h2>登录管理后台</h2>
          <p className="form-description">请输入您的运营账号以继续</p>
          <Form
            layout="vertical"
            size="large"
            onFinish={onFinish}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block className="login-submit">
              进入工作台 <ArrowRightOutlined />
            </Button>
          </Form>
          <div className="login-hint">
            <span />
            演示环境：任意账号密码均可登录
          </div>
        </div>
        <div className="login-footnote">
          FORM / CLUB <span>MEMBER SERVICE CONSOLE</span>
        </div>
      </section>
    </main>
  )
}
