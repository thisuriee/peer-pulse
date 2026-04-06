import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
