'use client'

import { createContext, useContext } from 'react'

interface FocusContextValue {
  openFocus: (id: string) => void
}

export const FocusContext = createContext<FocusContextValue>({ openFocus: () => {} })
export const useFocusMessage = () => useContext(FocusContext)
