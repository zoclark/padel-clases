import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import Logo from "@/assets/MetrikPadel_Logo.svg";

export default function HeaderPanel({ subView, setSubView }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const fixedLinks = isAuthenticated
    ? [
        { label: "Inicio", onClick: () => navigate("/") },
        { label: "Panel Usuario", onClick: () => navigate("/panel") },
      ]
    : [
        { label: "Inicio", onClick: () => navigate("/") },
        { label: "Iniciar sesión", onClick: () => navigate("/login"), className: "header-link" },
        { label: "Registrarse", onClick: () => navigate("/registro"), className: "header-auth" },
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
  ];

  return (
    <header className="fixed w-full top-0 z-50 bg-[#E8E6E0]/95 text-black shadow-md">
      <div className="px-4 sm:px-6 py-3 flex justify-between items-center gap-6">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src={Logo}
            alt="Metrik Pádel"
            className="h-12 w-12 bg-white p-1 rounded-full shadow-sm"
          />
          <span className="text-xl font-serif font-semibold tracking-tight text-blue-700">
            Metrik Pádel
          </span>
        </div>

        {/* Navegación desktop */}
        <nav className="hidden xl:flex items-center gap-6 flex-1 justify-center">
          {[...fixedLinks, ...menuLinks].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={item.className || "header-link"}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Cerrar sesión si autenticado */}
        <div className="hidden xl:flex items-center gap-4">
          {isAuthenticated && (
            <button
              onClick={logout}
              className="header-logout"
            >
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Hamburguesa móvil */}
        <div className="xl:hidden">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Subnavegación del panel */}
      <div className="hidden xl:flex border-t border-gray-300 px-6 py-2 gap-6">
        {panelLinks.map((pl) => (
          <button
            key={pl.key}
            onClick={() => setSubView(pl.key)}
            className={`capitalize header-link ${
              subView === pl.key ? "font-bold underline text-blue-600" : ""
            }`}
          >
            {pl.label}
          </button>
        ))}
      </div>

      {/* Menú móvil */}
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
                  className={item.className || "text-left header-link"}
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
                  className={`text-left capitalize header-link ${
                    subView === pl.key
                      ? "font-bold underline text-blue-600"
                      : ""
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
