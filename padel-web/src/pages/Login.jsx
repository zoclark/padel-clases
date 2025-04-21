import { useState, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Lock, User } from "lucide-react";

export default function Login() {
  const { login, loading } = useContext(AuthContext);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // ⛔ evitar comportamiento por defecto
    e.stopPropagation();

    setError(""); // limpia errores anteriores

    login(formData.username, formData.password)
      .catch((err) => {
        console.error("💥 Error en login.jsx:", err.message);
        setError(err.message || "Error inesperado al iniciar sesión.");
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-blue-200">
      <Header />
      <div className="flex-1 flex items-center justify-center pt-20">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
          <h2 className="text-3xl font-extrabold text-center text-blue-800 mb-6">
            Iniciar sesión
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-center border px-3 py-2 rounded-md shadow-sm bg-white">
              <User className="text-gray-400 mr-2" size={20} />
              <input
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Usuario"
                value={formData.username}
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
                autoComplete="current-password"
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
              {loading ? "Entrando..." : "Entrar"}
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
