// src/hooks/useHistorialEntrenamientos.js
import { useEffect, useState } from "react";
import api from "@/api/axiosConfig";  // Aquí debes importar tu instancia de Axios

export default function useHistorialEntrenamientos() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/historial/");  // Asegúrate de que esta URL sea la correcta en tu API
        setSessions(res.data);  // Asigna las sesiones al estado
      } catch (err) {
        setError("Error al cargar el historial de entrenamientos.");
        console.error("Error cargando el historial:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();  // Realiza la llamada a la API cuando el componente se monte
  }, []);

  return { sessions, loading, error };
}