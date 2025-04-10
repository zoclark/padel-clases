import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import api from "@/api/axiosConfig";
import FMRadarChart from "@/components/FMRadarChart";
import LineChart from "@/components/LineChart";
import PistaVisual from "@/components/PistaVisual";
import TrainingHistory from "@/components/TrainingHistory";
import BookingOptions from "@/components/BookingOptions";
import clsx from "clsx";

export default function AlumnoPanel() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [subView, setSubView] = useState("atributos");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Carga perfil
    api.get("/perfil/")
      .then((res) => setPerfil(res.data))
      .catch(() => setError("Error obteniendo perfil"));

    // Carga historial
    api.get("/historial-entrenamientos/")
      .then((res) => setTrainingHistory(res.data))
      .catch(() => console.error("Error historial."));
  }, [navigate]);

  // ========== Radares ==========
  const radarFisico = perfil ? [
    { skill: "Resistencia", value: perfil.resistencia },
    { skill: "Agilidad", value: perfil.agilidad },
    { skill: "Coordinación", value: perfil.coordinacion },
    { skill: "Técnica", value: perfil.tecnica },
    { skill: "Velocidad", value: perfil.velocidad },
    { skill: "Potencia", value: perfil.potencia },
  ] : [];

  const radarTecnica = perfil ? [
    { skill: "Globo", value: perfil.globo },
    { skill: "V. Natural", value: perfil.volea_natural },
    { skill: "Bandeja", value: perfil.bandeja },
    { skill: "Remate", value: perfil.remate },
    { skill: "Víbora", value: perfil.vibora },
    { skill: "Rulo", value: perfil.rulo },
    { skill: "B. Pronto", value: perfil.bote_pronto },
    { skill: "Dejada", value: perfil.dejada },
    { skill: "Chiquita", value: perfil.chiquita },
    { skill: "V. Revés", value: perfil.volea_reves },
    
  ] : [];

  const radarAreaPos = perfil ? [
    { skill: "Ataque", value: perfil.ataque },
    { skill: "Pared", value: perfil.pared },
    { skill: "P. Lateral", value: perfil.pared_lateral },
    { skill: "Defensa", value: perfil.defensa },
    { skill: "P. Fondo", value: perfil.pared_fondo },
    { skill: "F. Pared", value: perfil.fondo_pared },
  ] : [];

  // ========== Stats por secciones ==========
  const fisicoStats = perfil ? [
    { nombre: "Resistencia", valor: perfil.resistencia },
    { nombre: "Agilidad", valor: perfil.agilidad },
    { nombre: "Coordinación", valor: perfil.coordinacion },
    { nombre: "Velocidad", valor: perfil.velocidad },
    { nombre: "Potencia", valor: perfil.potencia },
    { nombre: "Técnica", valor: perfil.tecnica },
  ] : [];

  const tecnicaGolpeoStats = perfil ? [
    { nombre: "Globo", valor: perfil.globo },
    { nombre: "Volea Natural", valor: perfil.volea_natural },
    { nombre: "Volea Revés", valor: perfil.volea_reves },
    { nombre: "Bandeja", valor: perfil.bandeja },
    { nombre: "Víbora", valor: perfil.vibora },
    { nombre: "Remate", valor: perfil.remate },
    { nombre: "Rulo", valor: perfil.rulo },
    { nombre: "Bote Pronto", valor: perfil.bote_pronto },
    { nombre: "Chiquita", valor: perfil.chiquita },
    { nombre: "Dejada", valor: perfil.dejada },
  ] : [];

  const posicionStats = perfil ? [
    { nombre: "Ataque", valor: perfil.ataque },
    { nombre: "Defensa", valor: perfil.defensa },
    { nombre: "Pared", valor: perfil.pared },
    { nombre: "P. Lateral", valor: perfil.pared_lateral },
    { nombre: "P. Fondo", valor: perfil.pared_fondo },
    { nombre: "F. Pared", valor: perfil.fondo_pared },
  ] : [];

  const skillsStats = perfil ? [
    { nombre: "Cambio Agarre", valor: perfil.cambio_agarre },
    { nombre: "Liftado", valor: perfil.liftado },
    { nombre: "Cortado", valor: perfil.cortado },
    { nombre: "Remate x3", valor: perfil.x3 },
    { nombre: "Remate x4", valor: perfil.x4 },
    { nombre: "Contrapared", valor: perfil.contrapared },
    { nombre: "Contralateral", valor: perfil.contralateral },
  ] : [];

  // ========== Características (conductas) ==========
  // Asumimos que 'caracteristicas' es un array de strings (ej.: ["Vascula con el compañero", "Remata todo"])
  // que viene del serializer (ManyToMany -> array de nombres o IDs).
  const caracteristicas = Array.isArray(perfil?.caracteristicas)
    ? perfil.caracteristicas
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header />

      <div className="pt-[6rem] max-w-7xl mx-auto px-4 pb-8">
        {/* Submenú */}
        <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 shadow-md flex gap-6 rounded-md mb-6">
          {["atributos", "historial", "reservas"].map((view) => (
            <button
              key={view}
              onClick={() => setSubView(view)}
              className={clsx(
                "capitalize hover:underline transition",
                subView === view && "font-bold underline text-blue-400"
              )}
            >
              {view}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        {perfil && subView === "atributos" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3 space-y-3">
            
            {/* FILA 1: 2 columnas => Izq: Datos+Pista. Der: Stats + Características */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              
              {/* ColIzq (1 de 4 => 25%) */}
              <div className="col-span-1 bg-black/40 p-3 rounded-md shadow-md text-sm flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <h2 className="text-base font-bold mb-1">Datos del Jugador</h2>
                  <p><strong>Usuario:</strong> {perfil.usuario}</p>
                  <p><strong>Nivel:</strong> {perfil.nivel}</p>
                  <p><strong>Mano:</strong> {perfil.mano_dominante}</p>
                  <p><strong>Posición:</strong> {perfil.posicion}</p>
                </div>
                <div className="w-24 h-24 overflow-hidden">
                  <PistaVisual posicion={perfil.posicion} />
                </div>
              </div>

              {/* ColDer (3 de 4 => 75%) => Stats en 4 sub-secciones + Caracteristicas */}
              <div className="col-span-3 bg-black/40 p-3 rounded-md shadow-md text-sm space-y-3">
                <h2 className="text-base font-bold mb-1">Stats</h2>
                
                {/* 4 secciones horizontales en pantallas grandes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Físico */}
                  <div className="bg-black/30 p-2 rounded space-y-2">
                    <h3 className="font-semibold text-blue-300">Físico</h3>
                    <div className="space-y-1">
                      {fisicoStats.map((h, i) => (
                        <div key={i} className="flex justify-between border-b border-white/10 py-0.5">
                          <span>{h.nombre}</span>
                          <span className="font-bold">{h.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Técnicas de Golpeo */}
                  <div className="bg-black/30 p-2 rounded space-y-2">
                    <h3 className="font-semibold text-blue-300">Golpeo</h3>
                    <div className="space-y-1">
                      {tecnicaGolpeoStats.map((h, i) => (
                        <div key={i} className="flex justify-between border-b border-white/10 py-0.5">
                          <span>{h.nombre}</span>
                          <span className="font-bold">{h.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Posicionamiento y Áreas */}
                  <div className="bg-black/30 p-2 rounded space-y-2">
                    <h3 className="font-semibold text-blue-300">Posición/Áreas</h3>
                    <div className="space-y-1">
                      {posicionStats.map((h, i) => (
                        <div key={i} className="flex justify-between border-b border-white/10 py-0.5">
                          <span>{h.nombre}</span>
                          <span className="font-bold">{h.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="bg-black/30 p-2 rounded space-y-2">
                    <h3 className="font-semibold text-blue-300">Skills</h3>
                    <div className="space-y-1">
                      {skillsStats.map((h, i) => (
                        <div key={i} className="flex justify-between border-b border-white/10 py-0.5">
                          <span>{h.nombre}</span>
                          <span className="font-bold">{h.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Características (conductas) */}
                {caracteristicas.length > 0 && (
                  <div className="bg-black/30 p-2 rounded">
                    <h3 className="font-semibold text-blue-300 mb-1">Características</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {caracteristicas.map((c, idx) => (
                        <li key={c.id}>{c.nombre}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* FILA INFERIOR: Radares (3) + Evolución */}
            <div className="bg-black/40 p-3 rounded-md shadow-md">
              <h2 className="text-base font-bold mb-2">Radares y Evolución</h2>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                {/* Radar Físico */}
                <div className="bg-black/30 p-2 rounded text-sm">
                  <p className="font-semibold mb-1">Físico</p>
                  <div className="w-full h-32">
                    <FMRadarChart data={radarFisico} />
                  </div>
                </div>
                {/* Radar Técnica */}
                <div className="bg-black/30 p-2 rounded text-sm">
                  <p className="font-semibold mb-1">Técnica</p>
                  <div className="w-full h-32">
                    <FMRadarChart data={radarTecnica} />
                  </div>
                </div>
                {/* Radar Área */}
                <div className="bg-black/30 p-2 rounded text-sm">
                  <p className="font-semibold mb-1">Área/Posición</p>
                  <div className="w-full h-32">
                    <FMRadarChart data={radarAreaPos} />
                  </div>
                </div>
                {/* Evolución */}
                <div className="bg-black/30 p-2 rounded text-sm">
                  <p className="font-semibold mb-1">Evolución</p>
                  <div className="w-full h-32">
                    <LineChart sessions={trainingHistory} />
                  </div>
                </div>
              </div>
            </div>

            {/* Análisis Global */}
            <div className="bg-black/40 p-2 rounded-md shadow-md text-sm">
              <h2 className="text-base font-bold mb-1">Análisis Global</h2>
              <p>{perfil.analisis_profesor || "No hay análisis del profesor."}</p>
            </div>
          </div>
        )}

        {subView === "historial" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3">
            <h2 className="text-lg font-bold mb-1">Historial de Entrenamientos</h2>
            <TrainingHistory sessions={trainingHistory} />
          </div>
        )}

        {subView === "reservas" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3">
            <h2 className="text-lg font-bold mb-1">Reserva de Clases</h2>
            <BookingOptions onSelect={(tipo) => alert(`Reserva ${tipo}`)} />
          </div>
        )}
      </div>
    </div>
  );
}
