import { useEffect, useState } from "react";
import axios from "@/api/axiosConfig";

export function useOnboarding() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Comprueba si hay token antes de llamar
    const token = localStorage.getItem("access");
    if (!token) {
      // No hay usuario autenticado, no hacer llamada ni mostrar onboarding
      setLoading(false);
      setUser(null);
      setShowOnboarding(false);
      return;
    }

    // 2. Si hay token, sí hace la llamada
    axios.get("/perfil/")
      .then(res => {
        setUser(res.data);
        if (res.data.onboarding_completado === false) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        setUser(null);
        setShowOnboarding(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, showOnboarding, setShowOnboarding, loading };
}
