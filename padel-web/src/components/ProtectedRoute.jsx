// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    // Si no hay token, redirige al login
    return <Navigate to="/login" />;
  }
  return children;
}