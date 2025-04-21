// src/pages/Registro.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "@/components/Header";
import { Lock, Mail, User } from "lucide-react";
import api from "@/api/axiosConfig";

export default function Registro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("registro/", formData);
      toast.success("Cuenta creada correctamente. ¡Ahora inicia sesión!", {
        position: "top-center",
        autoClose: 3000,
      });
      navigate("/login");
    } catch (err) {
      const res = err.response?.data;
      const errorMsg =
        res?.error ||
        res?.username?.[0] ||
        res?.email?.[0] ||
        res?.password?.[0] ||
        "Error desconocido al registrar.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-blue-200">
      <Header />
      <div className="flex-1 flex items-center justify-center pt-20">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
          <h2 className="text-3xl font-extrabold text-center text-blue-800 mb-6">
            Crear Cuenta
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center border px-3 py-2 rounded-md shadow-sm bg-white">
              <User className="text-gray-400 mr-2" size={20} />
              <input
                name="username"
                autoComplete="username"
                placeholder="Usuario"
                value={formData.username}
                onChange={handleChange}
                className="w-full focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center border px-3 py-2 rounded-md shadow-sm bg-white">
              <Mail className="text-gray-400 mr-2" size={20} />
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center border px-3 py-2 rounded-md shadow-sm bg-white">
              <Lock className="text-gray-400 mr-2" size={20} />
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                className="w-full focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-lg font-semibold transition-all"
              disabled={loading}
            >
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </form>
          {error && (
            <p className="text-red-600 text-center mt-4 text-sm font-medium">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
