import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from '@/pages/auth/register';
import LoginPage from '@/pages/auth/login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
