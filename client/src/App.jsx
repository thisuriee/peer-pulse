import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from '@/pages/auth/register';
import LoginPage from '@/pages/auth/login';
import HomePage from '@/pages/home';

const SessionsPage = lazy(() => import('@/pages/sessions'));
const TutorsPage = lazy(() => import('@/pages/tutors'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/tutors" element={<TutorsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
