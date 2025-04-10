// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import api from "../api/axiosConfig";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("token/", formData);
      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      navigate("/panel");
    } catch (err) {
      console.error(err);
      setError(JSON.stringify(err.response?.data || "Error en el login"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-gray-100 pt-20">
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">Iniciar sesión</h2>
          <form onSubmit={handleSubmit}>
          <input
            name="username"
            autoComplete="username"
            placeholder="Usuario"
            value={formData.username}
            onChange={handleChange}
            className="w-full mb-4 px-3 py-2 border rounded"
            required
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            className="w-full mb-4 px-3 py-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded">
            Entrar
          </button>
        </form>

          {error && <p className="text-red-600 mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}
