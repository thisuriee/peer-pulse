import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from '@/pages/auth/register';
import LoginPage from '@/pages/auth/login';
import HomePage from '@/pages/home';
import { AuthProvider } from '@/context/AuthContext';
import { ThreadProvider } from '@/context/ThreadContext';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import StudyHubPage from '@/pages/StudyHubPage';
import ThreadDetailsPage from '@/pages/ThreadDetailsPage';
import { Toaster } from '@/components/ui/toaster';

const SessionsPage = lazy(() => import('@/pages/sessions'));
const TutorsPage = lazy(() => import('@/pages/tutors'));

function App() {
  return (
    <AuthProvider>
  <ThreadProvider>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/threads" element={<StudyHubPage />} />
            <Route path="/threads/:id" element={<ThreadDetailsPage />} />
            <Route path="/study-hub" element={<Navigate to="/threads" replace />} />

            {/* Booking फीature routes */}
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/tutors" element={<TutorsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
    <Toaster />
  </ThreadProvider>
</AuthProvider>
  );
}

export default App;
