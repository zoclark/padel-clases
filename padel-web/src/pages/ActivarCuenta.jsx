// src/pages/ActivarCuenta.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      <Footer />
    </div>
  );
}

// src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axiosConfig";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const verificar = async () => {
      try {
        await api.get(`/solicitar-reset-password/${uid}/${token}/`);
        setValid(true);
      } catch {
        toast.error("Enlace inválido o caducado.");
        setValid(false);
      }
    };
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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <motion.div
        className="flex-grow flex items-center justify-center px-4 py-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {valid === null && <p className="text-blue-800">Verificando enlace…</p>}
        {valid === false && <p className="text-red-600">Enlace inválido.</p>}
        {valid === true && (
          <form
            onSubmit={handleSubmit}
            className="max-w-md w-full bg-gray-50 shadow-lg p-6 rounded-xl space-y-4"
          >
            <h2 className="text-xl font-bold text-blue-700 text-center">Nueva contraseña</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Introduce tu nueva contraseña"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold"
            >
              Confirmar
            </button>
          </form>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
