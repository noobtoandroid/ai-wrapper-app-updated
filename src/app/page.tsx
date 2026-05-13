'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChatHeader } from '@/components/ChatHeader'
import { MessageList } from '@/components/MessageList'
import { ChatInput } from '@/components/ChatInput'
import { RegenerateBar } from '@/components/RegenerateBar'
import { OfflineHandler } from '@/components/OfflineBanner'
import { SettingsPanel } from '@/components/SettingsPanel'
import { FocusModal } from '@/components/FocusModal'
import { FocusContext } from '@/contexts/FocusContext'
import { useChatStore } from '@/store/chatStore'

export default function ChatPage() {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const messages = useChatStore((s) => s.messages)

  const focusedMessage = focusedId
    ? messages.find((m) => m.id === focusedId) ?? null
    : null

  const openFocus  = useCallback((id: string) => setFocusedId(id), [])
  const closeFocus = useCallback(() => setFocusedId(null), [])

  const focusCtx = useMemo(() => ({ openFocus }), [openFocus])

  return (
    <FocusContext.Provider value={focusCtx}>
      <div className="flex flex-col h-[100dvh] bg-surface-950 relative overflow-hidden">
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        <OfflineHandler />
        <ChatHeader />
        <MessageList />

        <div className="flex-shrink-0">
          <RegenerateBar />
          <ChatInput />
        </div>

        {/* Overlays */}
        <SettingsPanel />
        <FocusModal message={focusedMessage} onClose={closeFocus} />
      </div>
    </FocusContext.Provider>
  )
}
