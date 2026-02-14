
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import VirtualRide from './pages/VirtualRide.jsx'
import Activities from './pages/Activities.jsx'
import Profile from './pages/Profile.jsx'
import Coach from './pages/Coach.jsx'
import RoutesPage from './pages/Routes.jsx'
import FreeRideSetup from './pages/FreeRideSetup.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/ride/:routeId" element={
            <ProtectedRoute>
              <VirtualRide />
            </ProtectedRoute>
          } />

          <Route path="/coach" element={
            <ProtectedRoute>
              <Coach />
            </ProtectedRoute>
          } />

          <Route path="/activities" element={
            <ProtectedRoute>
              <Activities />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/routes" element={
            <ProtectedRoute>
              <RoutesPage />
            </ProtectedRoute>
          } />

          <Route path="/free-ride" element={
            <ProtectedRoute>
              <FreeRideSetup />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
