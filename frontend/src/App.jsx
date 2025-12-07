import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'

function App() {
  
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Routes>
      {/* 1. The Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Login & Signup Paths */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* 3. The Dashboard (Protected) */}
      <Route 
        path="/dashboard" 
        element={
          isAuthenticated ? (
            <Dashboard /> 
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  )
}

export default App