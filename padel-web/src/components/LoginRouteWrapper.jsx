// src/components/LoginRouteWrapper.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import Login from "@/pages/Login";

export default function LoginRouteWrapper() {
  const { bootLoading, isAuthenticated } = useContext(AuthContext);

  // ‑‑ Si ya está logeado, redirigimos
  if (isAuthenticated) return <Navigate to="/panel" replace />;

  // ‑‑ Mientras se verifica el token inicial,
  //     Login muestra su propio overlay con bootLoading
  return <Login />;
}