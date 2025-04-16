// src/components/RecursosAlumno.jsx
export default function RecursosAlumno({ recursos = [] }) {
  // Detectamos si estamos en producción o desarrollo
  const baseUrl = import.meta.env.MODE === "production" 
    ? "https://your-render-domain.com"  // Cambia esto con el dominio de producción en Render
    : "http://127.0.0.1:8000";  // URL base para desarrollo local

  if (!recursos.length) return (
    <div className="bg-black/30 p-3 rounded-md text-sm">
      <h3 className="font-semibold text-blue-300 mb-2">Recursos personalizados</h3>
      <p className="text-white/60 italic">No hay recursos asignados aún.</p>
    </div>
  );

  return (
    <div className="bg-black/30 p-3 rounded-md text-sm">
      <h3 className="font-semibold text-blue-300 mb-2">Recursos personalizados</h3>
      <ul className="space-y-2">
        {recursos.map((r, i) => (
          <li key={i} className="flex items-center gap-4">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 w-full">
              {/* Si la URL ya es de YouTube, no agregar el prefijo del servidor */}
              {r.thumbnail && (
                <img
                  src={r.thumbnail.startsWith("http") ? r.thumbnail : `${baseUrl}${r.thumbnail}`} 
                  alt={r.titulo}
                  className="w-16 h-16 object-cover rounded-md"
                />
              )}
              <div className="flex flex-col ml-3"> {/* Añadido un margen izquierdo */}
                <span className="text-white text-lg font-semibold">{r.titulo}</span>  {/* Título destacado */}
                {r.comentarios && <p className="text-sm text-white/70 mt-1">{r.comentarios}</p>}  {/* Comentarios debajo */}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}