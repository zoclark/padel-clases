// src/components/TrainingHistory.jsx
import React from "react";
import useHistorialEntrenamientos from "@/hooks/useHistorialEntrenamientos"; // Importamos el hook

export default function TrainingHistory() {
  const { sessions, loading, error } = useHistorialEntrenamientos(); // Usamos el hook para obtener las sesiones de entrenamiento

  if (loading) return <p>Cargando el historial...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Historial de Entrenamientos</h2>
      {sessions.length === 0 ? (
        <p>No se han registrado entrenamientos.</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className="border p-2 my-2 rounded">
              <p><strong>Fecha:</strong> {session.date_formatted}</p>
              <p><strong>Detalle:</strong> {session.details}</p>
              {session.teacher_comment && (
                <p><strong>Comentario del profesor:</strong> {session.teacher_comment}</p>
              )}
              {session.session_type && (
                <p><strong>Tipo:</strong> {session.session_type}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}