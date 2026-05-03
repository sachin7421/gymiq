import { createContext, useContext } from 'react'
import { useUserData } from '../hooks/useUserData.js'
import { useAuth } from '../hooks/useAuth.js'

const UserDataContext = createContext(null)

export function UserDataProvider({ children }) {
  const { user } = useAuth()
  const value = useUserData(user?.id)
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserDataContext() {
  const ctx = useContext(UserDataContext)
  if (!ctx) throw new Error('useUserDataContext must be used inside UserDataProvider')
  return ctx
}
