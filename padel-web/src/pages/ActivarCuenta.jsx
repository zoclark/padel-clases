// src/pages/ActivarCuenta.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import { motion } from "framer-motion";

export default function ActivarCuenta() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verificando");

  useEffect(() => {
    if (!uid || !token) {
      toast.error("Faltan datos para activar la cuenta.");
      navigate("/login");
      return;
    }

    const activar = async () => {
      try {
        const res = await api.get(`/activar/${uid}/${token}/`);
        toast.success(res.data.detail || "Cuenta activada correctamente.");
        setStatus("activada");
        setTimeout(() => navigate("/login"), 2000);
      } catch (err) {
        toast.error(
          err?.response?.data?.detail || "Enlace inválido o ya caducado."
        );
        setStatus("error");
      }
    };

    activar();
  }, [uid, token, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-center">
      <Header />
      <motion.div
        className="flex-grow flex items-center justify-center p-6 text-blue-800"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {status === "verificando" && <p>Verificando cuenta…</p>}
        {status === "activada" && <p>Redirigiendo al login…</p>}
        {status === "error" && <p>Error al activar la cuenta.</p>}
      </motion.div>
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
