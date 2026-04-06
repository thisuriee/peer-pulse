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

function App() {
  return (
    <AuthProvider>
      <ThreadProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/threads" element={<StudyHubPage />} />
              <Route path="/threads/:id" element={<ThreadDetailsPage />} />
              <Route path="/study-hub" element={<Navigate to="/threads" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThreadProvider>
    </AuthProvider>
  );
}

export default App;
