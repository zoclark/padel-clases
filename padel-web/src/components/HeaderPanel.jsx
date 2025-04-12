import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";

export default function HeaderPanel({ subView, setSubView }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Control menú hamburguesa general
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Enlaces globales, según si está o no autenticado
  const fixedLinks = isAuthenticated
    ? [
        { label: "Inicio", onClick: () => navigate("/") },
        { label: "Panel Usuario", onClick: () => navigate("/panel") },
        { label: "Cerrar sesión", onClick: logout },
      ]
    : [
        { label: "Inicio", onClick: () => navigate("/") },
        { label: "Iniciar sesión", onClick: () => navigate("/login") },
        { label: "Registrarse", onClick: () => navigate("/registro") },
      ];

  // Enlaces “genéricos” del menú
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

  // Enlaces **del panel** (cambia la vista interna)
  const panelLinks = [
    { key: "atributos", label: "Atributos" },
    { key: "historial", label: "Historial" },
    { key: "reservas", label: "Reservas" },
  ];

  return (
    <header className="fixed w-full top-0 z-50 bg-gray-900/80 backdrop-blur-sm text-white shadow-md">
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          PadelPro
        </div>

        {/* -- NAV Desktop -- */}
        <nav className="hidden md:flex items-center gap-6">
          {fixedLinks.map((item, i) => (
            <button key={i} onClick={item.onClick} className="hover:underline">
              {item.label}
            </button>
          ))}
          {menuLinks.map((link, i) => (
            <button key={i} onClick={link.onClick} className="hover:underline">
              {link.label}
            </button>
          ))}
        </nav>

        {/* -- Icono Hamburguesa (Mobile) -- */}
        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* -- Links del Panel en Desktop -- */}
      <div className="hidden md:flex border-t border-gray-700 px-6 py-2 gap-6">
        {panelLinks.map((pl) => (
          <button
            key={pl.key}
            onClick={() => setSubView(pl.key)}
            className={`capitalize hover:underline ${
              subView === pl.key ? "font-bold underline text-blue-400" : ""
            }`}
          >
            {pl.label}
          </button>
        ))}
      </div>

      {/* -- Menú móvil (AnimatePresence) -- */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobileMenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-800/80 backdrop-blur-sm"
          >
            <div className="flex flex-col p-4 gap-2">
              {/* 1. Links fijos */}
              {fixedLinks.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className="text-left hover:underline"
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-gray-700 my-2" />
              {/* 2. Links genéricos */}
              {menuLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => {
                    link.onClick();
                    setMenuOpen(false);
                  }}
                  className="text-left hover:underline"
                >
                  {link.label}
                </button>
              ))}
              <hr className="border-gray-700 my-2" />
              {/* 3. Links específicos del Panel */}
              {panelLinks.map((pl) => (
                <button
                  key={pl.key}
                  onClick={() => {
                    setSubView(pl.key);
                    setMenuOpen(false);
                  }}
                  className={`text-left capitalize hover:underline ${
                    subView === pl.key ? "font-bold underline text-blue-400" : ""
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
