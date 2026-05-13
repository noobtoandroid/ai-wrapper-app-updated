'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  userApiKey: string
  settingsOpen: boolean
  setUserApiKey: (key: string) => void
  clearUserApiKey: () => void
  setSettingsOpen: (open: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userApiKey: '',
      settingsOpen: false,

      setUserApiKey: (key) => set({ userApiKey: key.trim() }),
      clearUserApiKey: () => set({ userApiKey: '' }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
    }),
    {
      name: 'chat-settings',
      partialize: (s) => ({ userApiKey: s.userApiKey }),
    }
  )
)
