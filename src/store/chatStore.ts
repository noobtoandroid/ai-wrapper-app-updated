import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isStreaming?: boolean
  isError?: boolean
}

interface ChatState {
  messages: Message[]
  draft: string
  isTyping: boolean
  isStreaming: boolean
  streamingId: string | null
  isOffline: boolean
  activeModel: string | null
  editingId: string | null
  statusMessage: string | null
  _controller: AbortController | null

  setDraft: (text: string) => void
  setEditingId: (id: string | null) => void
  sendMessage: (text: string) => void
  editMessage: (id: string, newText: string) => void
  resendMessage: (userMsgId: string) => void
  deleteMessage: (id: string) => void
  retryMessage: (aiId: string) => void
  regenerateResponse: (aiId: string) => void
  stopGeneration: () => void
  regenerateLastResponse: () => void
  copyMessage: (id: string) => void
  clearMessages: () => void
  setOffline: (v: boolean) => void
}

/** Read the persisted user API key from localStorage without importing the settings store */
function getUserApiKey(): string {
  try {
    const raw = localStorage.getItem('chat-settings')
    if (!raw) return ''
    return (JSON.parse(raw) as { state?: { userApiKey?: string } })?.state?.userApiKey ?? ''
  } catch {
    return ''
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      // ─── Core streaming helper ───────────────────────────────────────────────
      async function fetchAndStream(aiId: string) {
        const controller = new AbortController()
        // _controller stored so stopGeneration can abort it
        set({ _controller: controller, statusMessage: null })

        // History excludes broken/streaming placeholders
        const history = get()
          .messages.filter((m) => !m.isStreaming && !m.isError)
          .map((m) => ({ role: m.role, content: m.content }))

        // Prefer user-supplied API key; fall back to server env var (empty string = use server key)
        const userApiKey = getUserApiKey()

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: history,
              preferredModel: get().activeModel,
              userApiKey: userApiKey || undefined,
            }),
            signal: controller.signal,
          })

          if (!response.ok) {
            throw new Error('Something went wrong. Please try again.')
          }

          // Insert streaming placeholder
          const aiMsg: Message = {
            id: aiId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          }
          set((s) => ({
            messages: [...s.messages, aiMsg],
            isTyping: false,
            isStreaming: true,
            streamingId: aiId,
          }))

          const reader = response.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let gotContent = false

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const data = trimmed.slice(5).trim()
              if (data === '[DONE]') continue

              let json: Record<string, unknown>
              try {
                json = JSON.parse(data)
              } catch {
                continue
              }

              if (json._status) {
                set({ statusMessage: json._status as string })
                continue
              }
              if (json._model) {
                set({ activeModel: json._model as string, statusMessage: null })
                continue
              }
              if (json._error) {
                throw new Error(json._error as string)
              }

              const choices = json.choices as Array<{ delta?: { content?: string } }> | undefined
              const delta = choices?.[0]?.delta?.content ?? ''
              if (delta) {
                gotContent = true
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiId ? { ...m, content: m.content + delta } : m
                  ),
                  statusMessage: null,
                }))
              }
            }
          }

          if (!gotContent) {
            throw new Error("I didn't get a response. Please try again.")
          }
        } catch (err: unknown) {
          // User pressed Stop — clean exit, no error bubble
          if (err instanceof Error && err.name === 'AbortError') return

          const raw = err instanceof Error ? err.message : 'Something went wrong.'
          // Never expose raw JSON blobs
          const friendly =
            raw.startsWith('{') || raw.startsWith('[')
              ? 'Something went wrong on the AI side. Please try again.'
              : raw

          set((s) => {
            const hasPlaceholder = s.messages.some((m) => m.id === aiId)
            if (hasPlaceholder) {
              return {
                messages: s.messages.map((m) =>
                  m.id === aiId
                    ? { ...m, content: friendly, isStreaming: false, isError: true }
                    : m
                ),
              }
            }
            return {
              messages: [
                ...s.messages,
                {
                  id: aiId,
                  role: 'assistant' as MessageRole,
                  content: friendly,
                  timestamp: new Date(),
                  isError: true,
                },
              ],
            }
          })
        } finally {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === aiId ? { ...m, isStreaming: false } : m
            ),
            isTyping: false,
            isStreaming: false,
            streamingId: null,
            _controller: null,
            statusMessage: null,
          }))
        }
      }

      return {
        messages: [],
        draft: '',
        isTyping: false,
        isStreaming: false,
        streamingId: null,
        isOffline: false,
        activeModel: null,
        editingId: null,
        statusMessage: null,
        _controller: null,

        setDraft: (text) => set({ draft: text }),

        setEditingId: (id) =>
          set({
            editingId: id,
            draft: id ? (get().messages.find((m) => m.id === id)?.content ?? '') : '',
          }),

        sendMessage: async (text) => {
          const trimmed = text.trim()
          if (!trimmed) return
          // Guard: lock immediately before any async work to prevent double-sends
          if (get().isStreaming || get().isTyping) return
          set({ isTyping: true, editingId: null })

          const userMsg: Message = {
            id: nanoid(),
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
          }
          set((s) => ({ messages: [...s.messages, userMsg], draft: '' }))

          await fetchAndStream(nanoid())
        },

        editMessage: async (id, newText) => {
          const trimmed = newText.trim()
          if (!trimmed) return
          if (get().isStreaming || get().isTyping) return
          set({ isTyping: true, editingId: null, draft: '' })

          const msgs = get().messages
          const idx = msgs.findIndex((m) => m.id === id)
          if (idx === -1) { set({ isTyping: false }); return }

          const updated = msgs.slice(0, idx + 1).map((m) =>
            m.id === id ? { ...m, content: trimmed } : m
          )
          set({ messages: updated })

          await fetchAndStream(nanoid())
        },

        resendMessage: async (userMsgId) => {
          if (get().isStreaming || get().isTyping) return
          const msgs = get().messages
          const idx = msgs.findIndex((m) => m.id === userMsgId)
          if (idx === -1) return
          // Lock and remove everything after the user message, then re-generate
          set({ isTyping: true, messages: msgs.slice(0, idx + 1) })
          await fetchAndStream(nanoid())
        },

        deleteMessage: (id) => {
          set((s) => {
            const msgs = s.messages
            const idx = msgs.findIndex((m) => m.id === id)
            if (idx === -1) return s
            const msg = msgs[idx]
            if (
              msg.role === 'user' &&
              idx + 1 < msgs.length &&
              msgs[idx + 1].role === 'assistant'
            ) {
              return { messages: [...msgs.slice(0, idx), ...msgs.slice(idx + 2)] }
            }
            return { messages: msgs.filter((m) => m.id !== id) }
          })
        },

        retryMessage: async (aiId) => {
          if (get().isStreaming || get().isTyping) return
          set((s) => ({
            isTyping: true,
            messages: s.messages.filter((m) => m.id !== aiId),
          }))
          await fetchAndStream(nanoid())
        },

        regenerateResponse: async (aiId) => {
          if (get().isStreaming || get().isTyping) return
          const msgs = get().messages
          const idx = msgs.findIndex((m) => m.id === aiId)
          if (idx === -1) return
          set({ isTyping: true, messages: msgs.slice(0, idx) })
          await fetchAndStream(nanoid())
        },

        stopGeneration: () => {
          get()._controller?.abort()
          set((s) => ({
            messages: s.messages.map((m) =>
              m.isStreaming ? { ...m, isStreaming: false } : m
            ),
            isTyping: false,
            isStreaming: false,
            streamingId: null,
            _controller: null,
            statusMessage: null,
          }))
        },

        regenerateLastResponse: () => {
          const lastAi = [...get().messages].reverse().find((m) => m.role === 'assistant')
          if (!lastAi || get().isStreaming) return
          get().regenerateResponse(lastAi.id)
        },

        copyMessage: async (id) => {
          const msg = get().messages.find((m) => m.id === id)
          if (!msg) return
          try {
            await navigator.clipboard.writeText(msg.content)
          } catch {
            // clipboard API unavailable
          }
        },

        clearMessages: () => set({ messages: [], editingId: null }),

        setOffline: (v) => set({ isOffline: v }),
      }
    },
    {
      name: 'chat-store',
      partialize: (s) => ({
        messages: s.messages,
        draft: s.draft,
        activeModel: s.activeModel,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.messages) {
          state.messages = state.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            isStreaming: false,
            isError: m.isError ?? false,
          }))
        }
        // Always reset transient flags on reload
        if (state) {
          state.isTyping = false
          state.isStreaming = false
          state.streamingId = null
          state._controller = null
          state.statusMessage = null
          state.editingId = null
        }
      },
    }
  )
)
