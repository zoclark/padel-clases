import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
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
import PanelOrganizador from "@/pages/PanelOrganizador";
import PozosJugables from "@/components/PozosJugables";

const descripciones = {
"Resistencia": "Capacidad de mantener un rendimiento constante durante partidos largos. Es clave para no bajar el ritmo en el tercer set.",
"Agilidad": "Facilidad para moverse con rapidez y cambiar de dirección. Mejora tu reacción ante bolas rápidas o inesperadas.",
"Coordinación": "Sincronización entre cuerpo y vista. Es esencial para conectar golpes limpios, especialmente en situaciones de presión.",
"Técnica": "Precisión y calidad en la ejecución de golpes. Una técnica depurada permite ganar puntos con menos esfuerzo.",
"Velocidad": "Rapidez de desplazamiento en pista. A mayor velocidad, más tiempo tendrás para preparar tus golpes.",
"Potencia": "Fuerza en los golpes. Ideal para remates, víboras o globos ofensivos que busquen ganar el punto directamente.",
"Globo": "Golpe defensivo que lanza la bola alta para ganar tiempo o cambiar el ritmo del juego. Fundamental cuando estás en apuros.",
"V. Natural": "Volea con tu lado dominante. Su precisión y control son vitales para dominar la red.",
"Bandeja": "Golpe aéreo de control que permite mantener la red. Es básico para neutralizar globos sin perder la posición.",
"Remate": "Golpe contundente para cerrar puntos. Cuanto mayor sea tu remate, más peligro generas desde el fondo.",
"Víbora": "Golpe agresivo con efecto lateral. Una mezcla entre bandeja y remate que complica la devolución del rival.",
"Rulo": "Golpe con efecto liftado desde el fondo. Se usa para presionar y hacer subir al rival.",
"B. Pronto": "Golpear la bola nada más botar. Reduce el tiempo de reacción del rival y te permite anticiparte.",
"Dejada": "Golpe suave que busca dejar la bola cerca de la red. Ideal para romper el ritmo del rival.",
"Chiquita": "Golpe corto al centro de la pista, con intención de subir a la red. Se utiliza para provocar errores.",
"V. Revés": "Volea con el lado no dominante. Requiere buena técnica para ser tan efectiva como la natural.",
"Ataque": "Capacidad para presionar al rival y finalizar puntos. Cuanto mayor, más agresivo y eficaz serás.",
"Pared": "Uso táctico de las paredes para devolver bolas complicadas. Imprescindible en defensa.",
"P. Lateral": "Control de las bolas que rebotan en la pared lateral. Mejora la capacidad para responder golpes cruzados.",
"Defensa": "Capacidad de resistir puntos largos y responder con bolas incómodas desde el fondo.",
"P. Fondo": "Habilidad para gestionar el juego desde detrás. Necesaria para defender globos y remates.",
"F. Pared": "Lectura del rebote en la unión fondo-pared. Imprescindible para defender correctamente.",
"Cambio Agarre": "Capacidad para alternar rápidamente entre empuñaduras según el tipo de golpe. Mejora la adaptabilidad.",
"Liftado": "Uso de efecto topspin. Aporta altura y seguridad al golpeo, sobre todo en bolas profundas.",
"Cortado": "Efecto backspin que hace que la bola caiga y rebote poco. Muy útil en defensa o en dejadas.",
"Remate x3": "Remate que busca sacar la bola por tres metros. Requiere potencia, precisión y buena lectura del punto.",
"Remate x4": "Versión más potente del remate x3, que sale por la pared lateral. Es un golpe definitivo si se domina.",
"Contrapared": "Respuesta tras rebote en la pared, con control y precisión. Fundamental para defender bien.",
"Contralateral": "Golpe que cruza la pista en diagonal, ideal para descolocar al rival y abrir huecos.",
  // Añade más según tus necesidades...
};

function getColor(valor) {
  if (valor <= 25) return "bg-red-500";
  if (valor <= 50) return "bg-yellow-400";
  if (valor <= 75) return "bg-white";
  return "bg-green-400";
}

function StatRow({ nombre, valor }) {
  const descripcion = descripciones[nombre];
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div className="flex justify-between items-center gap-2 text-xs">
        <span className="flex items-center gap-1">
          {nombre}
          {descripcion && (
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-white/70 hover:text-white focus:outline-none"
            >
              <Info size={14} />
            </button>
          )}
        </span>
        <span className="font-bold">{valor}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full mt-1">
        <div className={`h-1 rounded-full ${getColor(valor)}`} style={{ width: `${valor}%` }} />
      </div>
      {showTooltip && descripcion && (
        <div className="absolute z-50 top-full mt-1 w-56 p-2 text-xs text-white bg-black/80 rounded shadow-lg backdrop-blur-sm">
          {descripcion}
        </div>
      )}
    </motion.div>
  );
}

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
        <SubmenuPanel subView={subView} setSubView={setSubView} rol={perfil.rol} />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 pb-8 pt-4">
        {subView === "atributos" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-2 sm:p-3 space-y-3"
          >
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
                          <StatRow key={i} nombre={h.nombre} valor={h.valor} />
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
          </motion.div>
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

        {subView === "organizar" && perfil.rol === "organizador" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3">
            <h2 className="text-lg font-bold mb-1">Gestión de Pozos</h2>
            <PanelOrganizador />
          </div>
        )}

{subView === "jugables" && (
          <div className="bg-black/30 backdrop-blur rounded-xl shadow-2xl p-3">
            <h2 className="text-lg font-bold mb-1">Listado de Pozos</h2>
            <PozosJugables />
          </div>
        )}     

      </div>
    </div>
  );
}
