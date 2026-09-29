import { useState } from 'react'
import { Button, Form, Input, InputNumber, message } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, UserAddOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { orderApi } from '../services/orderApi.js'
import './Orders.css'

const money = (value) =>
  `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function NewOrderPage() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const years = Form.useWatch('years', form) || 1

  const submit = async (values) => {
    setSaving(true)
    try {
      await orderApi.create({
        memberName: values.memberName.trim(),
        phone: values.phone,
        years: values.years,
        remark: values.remark || '',
      })
      message.success('订单已创建')
      navigate('/orders', { replace: true })
    } catch {
      message.error('创建失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="new-order-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">MEMBER ENROLLMENT</span>
          <h1>新建办卡订单</h1>
          <p>录入会员信息并创建一笔新的购卡记录。</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
          返回列表
        </Button>
      </div>
      <div className="form-layout">
        <section className="form-surface">
          <div className="surface-heading">
            <div className="surface-icon">
              <UserAddOutlined />
            </div>
            <div>
              <h2>会员资料</h2>
              <span>所有带 * 的字段均为必填</span>
            </div>
          </div>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ years: 1 }}
            onFinish={submit}
            requiredMark="optional"
          >
            <Form.Item
              label="会员姓名"
              name="memberName"
              rules={[
                { required: true, message: '请输入会员姓名' },
                { min: 2, max: 30, message: '姓名长度需为 2 至 30 个字符' },
              ]}
            >
              <Input maxLength={30} placeholder="请输入会员姓名" />
            </Form.Item>
            <Form.Item
              label="联系手机号"
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的中国大陆手机号' },
              ]}
            >
              <Input maxLength={11} placeholder="请输入 11 位手机号" />
            </Form.Item>
            <Form.Item
              label="购卡年限"
              name="years"
              rules={[{ required: true, message: '请选择购卡年限' }]}
            >
              <InputNumber min={1} max={10} precision={0} controls style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="备注"
              name="remark"
              rules={[{ max: 200, message: '备注最多 200 个字符' }]}
            >
              <Input.TextArea
                rows={4}
                maxLength={200}
                showCount
                placeholder="记录会员偏好或其他说明（选填）"
              />
            </Form.Item>
            <div className="form-actions">
              <Button onClick={() => form.resetFields()}>重置</Button>
              <Button type="primary" htmlType="submit" loading={saving} icon={<CheckOutlined />}>
                创建订单
              </Button>
            </div>
          </Form>
        </section>
        <aside className="price-aside">
          <span className="price-label">订单费用预估</span>
          <div className="price-amount">{money(years * 1200)}</div>
          <div className="price-rule">
            <span>购卡年限</span>
            <strong>{years} 年</strong>
          </div>
          <div className="price-rule">
            <span>会员年费</span>
            <strong>¥1,200 / 年</strong>
          </div>
          <div className="price-divider" />
          <p>办卡费用按年限自动计算，订单创建后将进入“待审核”状态。</p>
          <div className="price-stamp">FORM / CLUB</div>
        </aside>
      </div>
    </div>
  )
}
