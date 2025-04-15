// src/components/RecursosAlumno.jsx
export default function RecursosAlumno({ recursos = [] }) {
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
            <li key={i} className="flex items-center gap-2">
              <span className="text-blue-400">•</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-white">
                {r.descripcion}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  