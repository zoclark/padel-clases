// src/pages/Registro.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/Button";
// Ajusta si tienes un axios o fetch
import api from "@/api/axiosConfig";

export default function Registro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Envía datos al endpoint de registro que definiste en Django
      await api.post("registro/", formData);
      // Si todo OK, redirige al login o panel
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Error en el registro");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center bg-gray-100 pt-20"
      >
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">Crear Cuenta</h2>
          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="mb-4">
              <label className="block font-semibold mb-1">Usuario</label>
              <input
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1">Email</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1">Contraseña</label>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
            >
              Registrarse
            </Button>
          </form>
          {error && (
            <div className="text-red-600 mt-4">{error}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
