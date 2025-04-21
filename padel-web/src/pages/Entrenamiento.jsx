// src/pages/Entrenamiento.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/Button";

export default function Entrenamiento() {
  const navigate = useNavigate();

  return (
    <div className="mt-10 min-h-screen flex flex-col bg-white">
      <Header />
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 px-6 py-16 bg-gray-100 text-center pt-20"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Nuestro Método de Entrenamiento</h2>
          <p className="text-gray-700 text-lg mb-6">
            Combinamos la experiencia de entrenadores certificados con tecnología de última
            generación: análisis biomecánico, grabaciones en video, sensores de fuerza y velocidad
            de bola para asegurar que tu progreso sea constante y medible.
          </p>
          <p className="text-gray-700 text-lg mb-8">
            Nuestro método se centra en la corrección técnica, la preparación física y el
            acompañamiento psicológico para forjar jugadores completos, motivados y capaces de
            superar cualquier reto en pista.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3"
          >
            Volver al inicio
          </Button>
        </div>
      </motion.section>
    </div>
  );
}
