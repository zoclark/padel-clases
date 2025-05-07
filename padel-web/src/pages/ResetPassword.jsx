// src/pages/ResetPassword.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useInView, useAnimation } from "framer-motion";
import Header from "@/components/Header";
import api from "@/api/axiosConfig";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");

  const verificar = async () => {
    try {
      await api.get(`/solicitar-reset-password/${uid}/${token}/`);
      setValid(true);
    } catch {
      toast.error("Enlace inválido o caducado.");
      setValid(false);
    }
  };

  useEffect(() => {
    verificar();
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/solicitar-reset-password/confirm/", {
        uid,
        token,
        password,
      });
      toast.success("Contraseña actualizada correctamente");
      navigate("/login");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Error al actualizar la contraseña"
      );
    }
  };

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, threshold: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [inView, controls]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <motion.section
        ref={sectionRef}
        initial={{ opacity: 0, y: 30 }}
        animate={controls}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex items-center justify-center px-4 py-24"
      >
        {valid === null && (
          <p className="text-gray-700 text-lg">Verificando enlace…</p>
        )}

        {valid === false && (
          <p className="text-red-600 text-lg">Enlace inválido o expirado.</p>
        )}

        {valid === true && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-xl p-8 shadow-xl w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Nueva Contraseña
            </h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Introduce tu nueva contraseña"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Confirmar
            </button>
          </form>
        )}
      </motion.section>

      <footer className="bg-blue-700 text-white text-center py-6">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} MetrikPadel. Todos los derechos reservados.
          <br />
          <a
            href="/privacidad"
            className="underline text-white/80 hover:text-white transition"
          >
            Política de Privacidad
          </a>
        </p>
      </footer>
    </div>
  );
}
