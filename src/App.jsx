import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.js'
import { UserDataProvider, useUserDataContext } from './contexts/UserDataContext.jsx'
import AuthScreen from './components/auth/AuthScreen.jsx'
import OnboardingFlow from './components/onboarding/OnboardingFlow.jsx'
import BottomNav from './components/shared/BottomNav.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Workouts from './pages/Workouts.jsx'
import Plan from './pages/Plan.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'

function Loading({ label = 'LOADING…' }) {
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2 }}>{label}</p>
    </div>
  )
}

function AuthedShell() {
  const { state, loading } = useUserDataContext()

  if (loading || !state) return <Loading />
  if (!state.onboardingComplete) return <OnboardingFlow />

  return (
    <>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <AuthScreen />
  return (
    <UserDataProvider>
      <AuthedShell />
    </UserDataProvider>
  )
}
