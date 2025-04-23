import { useEffect, useState } from "react";
import axios from "@/api/axiosConfig"; // O simplemente 'axios' si no usas helper

export function useOnboarding() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/perfil/")
      .then(res => {
        setUser(res.data);
        if (res.data.onboarding_completado === false) {
          setShowOnboarding(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, showOnboarding, setShowOnboarding, loading };
}