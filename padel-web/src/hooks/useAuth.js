import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("accessToken")
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post("token/", { username, password }); // sin barra al principio
      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      setIsAuthenticated(true);
      navigate("/panel");
    } catch (err) {
      console.error("Error al iniciar sesión", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsAuthenticated(!!token);
  }, []);

  return {
    isAuthenticated,
    login,
    logout,
    loading,
  };
}
