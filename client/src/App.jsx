import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from '@/pages/auth/register';
import LoginPage from '@/pages/auth/login';
import HomePage from '@/pages/home';
import StudyHubPage from '@/pages/study-hub/StudyHubPage';
import ThreadDetailsPage from '@/pages/study-hub/ThreadDetailsPage';
import AppLayout from '@/components/layout/AppLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage />} />
        {/* Public optionally authenticated AppLayout routes */}
        <Route element={<AppLayout />}>
          <Route path="study-hub" element={<StudyHubPage />} />
          <Route path="study-hub/:id" element={<ThreadDetailsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
