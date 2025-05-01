import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";
import { toast } from "react-toastify";
import { useContext } from "react";


export const useAuth = () => useContext(AuthContext);
export const AuthContext = createContext();
export function AuthProvider({ children }) {
  const navigate = useNavigate();

  /** ╭─ ESTADOS ──────────────────────────────────────────╮ */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]               = useState(null);
  const [bootLoading, setBootLoading] = useState(true);   // solo al arrancar
  /** ╰────────────────────────────────────────────────────╯ */

  /* ─────────────────── helpers ─────────────────── */
  const fetchUserProfile = async () => {
    try {
      const { data } = await api.get("/perfil/");
      setUser(data);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.warn("❌ No se pudo obtener el perfil:", err);
      return false;
    }
  };

  /* ───────── Verificación inicial de la sesión ───────── */
  useEffect(() => {
    const accessToken  = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken || !refreshToken) {
      logout(false);
      setBootLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/token/refresh/", { refresh: refreshToken });
        localStorage.setItem("accessToken", data.access);
        const ok = await fetchUserProfile();
        if (!ok) logout(false);
      } catch {
        toast.error("Tu sesión ha caducado. Inicia sesión de nuevo.");
        logout(false);
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  /* ───────── Refresh silencioso del token cada 4 min ───────── */
  useEffect(() => {
    const id = setInterval(async () => {
      const rt = localStorage.getItem("refreshToken");
      if (!rt) return;
      try {
        const { data } = await api.post("/token/refresh/", { refresh: rt });
        localStorage.setItem("accessToken", data.access);
      } catch (e) {
        console.error("🔁 Error refrescando token:", e);
      }
    }, 1000 * 60 * 4);
    return () => clearInterval(id);
  }, []);

  /* ─────────────────────── login ─────────────────────── */
  const login = async (username, password) => {
    try {
      const { data } = await api.post("/token/", { username, password });
      localStorage.setItem("accessToken",  data.access);
      localStorage.setItem("refreshToken", data.refresh);
      const ok = await fetchUserProfile();
      if (!ok) throw new Error("No se pudo cargar el perfil del usuario.");
      navigate("/panel");
    } catch (err) {
      let msg = "Error al iniciar sesión.";
      if (err.response?.status === 401)       msg = "Credenciales incorrectas. Inténtalo de nuevo.";
      else if (err.response?.data?.detail)    msg = err.response.data.detail;
      else if (err.message)                   msg = err.message;
      return Promise.reject(msg);
    }
  };

  /* ────────────────────── logout ─────────────────────── */
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
        /* flags */
        isAuthenticated,
        bootLoading,          // << reemplaza al anterior “loading”
        /* user */
        user,
        rol: user?.rol || null,
        /* actions */
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


