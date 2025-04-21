// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";
import { toast } from "react-toastify";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const profile = await api.get("/perfil/");
      setUser(profile.data);
      setIsAuthenticated(true);
    } catch {
      logout(false); // No redirigir si falla el perfil
    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken || !refreshToken) {
      logout(false);
      setLoading(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await api.post("/token/refresh/", { refresh: refreshToken });
        localStorage.setItem("accessToken", res.data.access);
        await fetchUserProfile();
      } catch {
        toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post("/token/", { username, password });
      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      await fetchUserProfile();
      navigate("/panel");
    } catch (err) {
      const errorMsg =
        err.response?.status === 401
          ? "Credenciales incorrectas. Inténtalo de nuevo."
          : "Error al iniciar sesión.";
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = (redirect = true) => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setIsAuthenticated(false);
    if (redirect) navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        rol: user?.rol || null, // 👈 más claro acceder a rol directamente
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
