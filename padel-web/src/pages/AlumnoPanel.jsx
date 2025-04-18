import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import SubmenuPanel from "@/components/SubmenuPanel";
import FMRadarChart from "@/components/FMRadarChart";
import LineChart from "@/components/LineChart";
import PistaVisual from "@/components/PistaVisual";
import TrainingHistory from "@/components/TrainingHistory";
import BookingOptions from "@/components/BookingOptions";
import RecursosAlumno from "@/components/RecursosAlumno";
import useUserData from "@/hooks/useUserData";
import useRecursosAlumno from "@/hooks/useRecursosAlumno";
import useReservas from "@/hooks/useReservas";

export default function AlumnoPanel() {
  const navigate = useNavigate();
  const { data: perfil, loading, error } = useUserData();
  const { recursos, loading: recursosLoading, error: recursosError } = useRecursosAlumno();
  const { data: reservas } = useReservas();
  const [subView, setSubView] = useState("atributos");

  const headerRef = useRef(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hideHeader, setHideHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (window.innerWidth < 1024) {
        setHideHeader(currentY > lastScrollY && currentY > 80);
        setLastScrollY(currentY);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (loading) return <p className="text-center mt-24">Cargando datos...</p>;
  if (error || !perfil) return <p className="text-center mt-24 text-red-500">Error cargando perfil.</p>;

  const trainingHistory = perfil?.historial_entrenamientos || [];

  const radarFisico = [
    { skill: "Resistencia", value: perfil.resistencia },
    { skill: "Agilidad", value: perfil.agilidad },
    { skill: "Coordinación", value: perfil.coordinacion },
    { skill: "Técnica", value: perfil.tecnica },
    { skill: "Velocidad", value: perfil.velocidad },
    { skill: "Potencia", value: perfil.potencia },
  ];

  const radarTecnica = [
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
  ];

  const radarAreaPos = [
    { skill: "Ataque", value: perfil.ataque },
    { skill: "Pared", value: perfil.pared },
    { skill: "P. Lateral", value: perfil.pared_lateral },
    { skill: "Defensa", value: perfil.defensa },
    { skill: "P. Fondo", value: perfil.pared_fondo },
    { skill: "F. Pared", value: perfil.fondo_pared },
  ];

  const fisicoStats = radarFisico.map(({ skill, value }) => ({ nombre: skill, valor: value }));
  const tecnicaGolpeoStats = radarTecnica.map(({ skill, value }) => ({ nombre: skill, valor: value }));
  const posicionStats = radarAreaPos.map(({ skill, value }) => ({ nombre: skill, valor: value }));

  const skillsStats = [
    { nombre: "Cambio Agarre", valor: perfil.cambio_agarre },
    { nombre: "Liftado", valor: perfil.liftado },
    { nombre: "Cortado", valor: perfil.cortado },
    { nombre: "Remate x3", valor: perfil.x3 },
    { nombre: "Remate x4", valor: perfil.x4 },
    { nombre: "Contrapared", valor: perfil.contrapared },
    { nombre: "Contralateral", valor: perfil.contralateral },
  ];

  const caracteristicas = Array.isArray(perfil.caracteristicas) ? perfil.caracteristicas : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      <div
        ref={headerRef}
        className={`bg-slate-900 transform transition-transform duration-300 fixed top-0 left-0 right-0 z-50 ${
          hideHeader ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <Header />
        </div>
      </div>

      <div className="pt-20" />
      <div className="pt-2 px-2">
        <SubmenuPanel subView={subView} setSubView={setSubView} />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 pb-8 pt-4">
        {subView === "atributos" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-2 sm:p-3 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="col-span-1 bg-black/40 p-3 rounded-md shadow-md text-sm flex flex-row items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <h2 className="text-base font-bold mb-1">Datos del Jugador</h2>
                  <p><strong>Usuario:</strong> {perfil.usuario}</p>
                  <p><strong>Nivel:</strong> {perfil.nivel}</p>
                  <p><strong>Mano:</strong> {perfil.mano_dominante}</p>
                  <p><strong>Posición:</strong> {perfil.posicion}</p>
                </div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden">
                  <PistaVisual posicion={perfil.posicion} />
                </div>
              </div>

              <div className="col-span-1 lg:col-span-3 bg-black/40 p-3 rounded-md shadow-md text-sm space-y-3">
                <h2 className="text-base font-bold mb-1">Stats</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[fisicoStats, tecnicaGolpeoStats, posicionStats, skillsStats].map((section, idx) => (
                    <div key={idx} className="bg-black/30 p-2 rounded space-y-2">
                      <h3 className="font-semibold text-blue-300">
                        {["Físico", "Golpeo", "Posición/Áreas", "Skills"][idx]}
                      </h3>
                      <div className="space-y-1">
                        {section.map((h, i) => (
                          <div key={i} className="flex justify-between border-b border-white/10 py-0.5 text-xs">
                            <span>{h.nombre}</span>
                            <span className="font-bold">{h.valor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {caracteristicas.length > 0 && (
                  <div className="bg-black/30 p-2 rounded">
                    <h3 className="font-semibold text-blue-300 mb-1">Características</h3>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {caracteristicas.map((c, idx) => (
                        <li key={idx}>{c.nombre}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black/40 p-3 rounded-md shadow-md">
              <h2 className="text-base font-bold mb-2">Radares y Evolución</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[radarFisico, radarTecnica, radarAreaPos].map((data, i) => (
                  <div key={i} className="bg-black/30 p-2 rounded text-sm">
                    <p className="font-semibold mb-1">{["Físico", "Técnica", "Área/Posición"][i]}</p>
                    <div className="w-full h-32">
                      <FMRadarChart data={data} />
                    </div>
                  </div>
                ))}
                <div className="bg-black/30 p-2 rounded text-sm">
                  <p className="font-semibold mb-1">Evolución</p>
                  <div className="w-full h-32">
                    <LineChart sessions={trainingHistory} />
                  </div>
                </div>
              </div>
            </div>

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

        {subView === "recursos" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3">
            <h2 className="text-lg font-bold mb-1">Recursos asignados por el profesor</h2>
            {recursosLoading ? (
              <p>Cargando recursos...</p>
            ) : recursosError ? (
              <p className="text-red-500">{recursosError}</p>
            ) : (
              <RecursosAlumno recursos={recursos} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
