import { create } from 'zustand'

const TOKEN_KEY = 'club_mock_token'
const USER_KEY = 'club_username'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  username: localStorage.getItem(USER_KEY) || '运营管理员',
  login: (username) => {
    const token = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, username)
    set({ token, username })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, username: '运营管理员' })
  },
}))
