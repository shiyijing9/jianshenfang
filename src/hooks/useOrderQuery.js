import { useEffect, useState } from 'react'
import { orderApi } from '../services/orderApi.js'

export function useOrderQuery({ page, pageSize, statuses, orderNo, memberName, revision = 0 }) {
  const [data, setData] = useState({ list: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    orderApi
      .list({ page, pageSize, statuses, orderNo, memberName })
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, pageSize, statuses, orderNo, memberName, revision])

  return { ...data, loading, error }
}
