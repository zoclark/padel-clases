// ✅ HeaderPanel.jsx actualizado
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "@/contexts/AuthContext";
import Logo from "@/assets/MetrikPadel_Logo.svg";

export default function HeaderPanel({ subView, setSubView }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const fixedLinks = isAuthenticated
    ? [
        { label: "Inicio", onClick: () => navigate("/") },
        { label: "Panel Usuario", onClick: () => navigate("/panel") },
      ]
    : [
        { label: "Inicio", onClick: () => navigate("/") },
        {
          label: "Iniciar sesión",
          onClick: () => navigate("/login"),
        },
        {
          label: "Registrarse",
          onClick: () => navigate("/registro"),
        },
      ];

  const menuLinks = [
    {
      label: "Entrenamiento",
      onClick: () => {
        navigate("/entrenamiento");
        setMenuOpen(false);
      },
    },
    {
      label: "Sobre Nosotros",
      onClick: () => {
        alert("Iría a /sobre");
        setMenuOpen(false);
      },
    },
    {
      label: "Contacto",
      onClick: () => {
        alert("Iría a /contacto");
        setMenuOpen(false);
      },
    },
  ];

  const panelLinks = [
    { key: "atributos", label: "Atributos" },
    { key: "historial", label: "Historial" },
    { key: "reservas", label: "Reservas" },
    { key: "recursos", label: "Recursos" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/90 text-white shadow-lg backdrop-blur">
      <div className="px-4 sm:px-6 md:px-8 py-3 flex justify-between items-center gap-6">
        <div
          className="relative h-20 w-20 flex-shrink-0 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src={Logo}
            alt="Metrik Pádel"
            className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto"
          />
        </div>

        <nav className="hidden xl:flex items-center gap-6 flex-1 justify-center">
          {[...fixedLinks, ...menuLinks].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={
                item.className ||
                "text-lg font-semibold hover:text-blue-600 transition-all"
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-4">
          {isAuthenticated && (
            <button onClick={logout} className="header-logout">
              Cerrar sesión
            </button>
          )}
        </div>

        <div className="xl:hidden">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      <div className="hidden xl:flex justify-center mt-6">
        <div className="flex gap-4 px-6 py-3 bg-slate-800/70 rounded-2xl shadow-xl ring-1 ring-white/10">
          {panelLinks.map((pl) => (
            <button
              key={pl.key}
              onClick={() => setSubView(pl.key)}
              className={`relative px-5 py-2 rounded-lg text-base font-medium transition-all duration-300
                ${
                  subView === pl.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-white/50"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
            >
              {pl.label}
              {subView === pl.key && (
                <span className="absolute -bottom-[6px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-md"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobileMenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="xl:hidden bg-[#E8E6E0] shadow-md text-black"
          >
            <div className="flex flex-col p-4 gap-2">
              {[...fixedLinks, ...menuLinks].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className={
                    item.className ||
                    "text-left text-lg font-semibold hover:text-blue-600 transition-all"
                  }
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-gray-400 my-2" />
              {panelLinks.map((pl) => (
                <button
                  key={pl.key}
                  onClick={() => {
                    setSubView(pl.key);
                    setMenuOpen(false);
                  }}
                  className={`text-left capitalize text-lg font-semibold hover:text-blue-600 transition-all ${
                    subView === pl.key ? "font-bold underline text-blue-700" : ""
                  }`}
                >
                  {pl.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}