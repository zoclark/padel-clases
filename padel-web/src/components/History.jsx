// src/components/History.jsx
export default function History({ history }) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Historial de Clases</h2>
        {history.length === 0 ? (
          <p>No se han registrado clases.</p>
        ) : (
          <ul>
            {history.map((clase) => (
              <li key={clase.id} className="border p-2 my-2 rounded">
                <p>Fecha: {clase.date}</p>
                <p>Hora: {clase.hour}</p>
                <p>Tipo: {clase.type}</p>
                <p>Profesor: {clase.profesor}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  