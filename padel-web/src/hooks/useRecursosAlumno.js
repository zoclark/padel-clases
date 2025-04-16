// src/hooks/useRecursosAlumno.js

import { useEffect, useState } from "react";
import api from "@/api/axiosConfig";

export default function useRecursosAlumno() {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecursos = async () => {
      try {
        const res = await api.get("/recursos-alumno/");
        setRecursos(res.data);  // Asignamos los recursos cargados al estado
      } catch (err) {
        setError("Error al cargar los recursos.");
        console.error("Error cargando los recursos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecursos();  // Realizamos la llamada a la API al montar el componente
  }, []);

  return { recursos, loading, error };
}