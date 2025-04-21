// src/pages/PanelProfesor.jsx
import Header from "@/components/Header";

export default function PanelProfesor() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Panel del Profesor</h1>
        <p className="text-white/80">
          Desde aquí podrás asignar recursos, notas y análisis a tus alumnos.
        </p>
      </div>
    </div>
  );
}