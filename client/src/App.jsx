import { BrowserRouter, Route, Routes } from "react-router-dom";
import ForgotPassword from "./pages/auth/forgot-password";
import ConfirmAccount from "./pages/auth/confirm-account";
import ResetPassword from "./pages/auth/reset-password";
import VerifyMfa from "./pages/auth/verify-mfa";
import Home from "./pages/home";
import Session from "./pages/sessions";
import StudyHubPage from "./pages/study-hub/StudyHubPage";
import ThreadDetailsPage from "./pages/study-hub/ThreadDetailsPage";
import AppLayout from "./layout/AppLayout";
import BaseLayout from "./layout/BaseLayout";
import AuthRoute from "./routes/auth.route";
import PublicRoute from "./routes/public.route";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from '@/pages/auth/register';
import LoginPage from '@/pages/auth/login';
import HomePage from '@/pages/home';

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
