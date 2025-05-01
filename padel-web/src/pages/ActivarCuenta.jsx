// src/pages/ActivarCuenta.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import toast from "react-hot-toast";

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
    <div className="text-white p-6 text-center">
      {status === "verificando" && <p>Verificando cuenta…</p>}
      {status === "activada" && <p>Redirigiendo al login…</p>}
      {status === "error" && <p>Error al activar la cuenta.</p>}
    </div>
  );
}
