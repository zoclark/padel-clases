import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import Logo from "@/assets/MetrikPadel_Logo.svg";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const mainLinks = [
    { label: "Inicio", onClick: () => navigate("/") },
    { label: "Entrenamiento", onClick: () => navigate("/entrenamiento") },
    { label: "Sobre Nosotros", onClick: () => alert("Aquí iría tu sección Sobre Nosotros") },
    { label: "Contacto", onClick: () => alert("Aquí iría tu sección Contacto") },
  ];

  const authLinks = isAuthenticated
    ? [
        { label: "Panel Usuario", onClick: () => navigate("/panel"), className: "header-link" },
        { label: "Cerrar sesión", onClick: logout, className: "header-logout" },
      ]
    : [
        { label: "Iniciar sesión", onClick: () => navigate("/login"), className: "header-link" },
        { label: "Registrarse", onClick: () => navigate("/registro"), className: "header-auth" },
      ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#E8E6E0]/95 text-black shadow-md">
      <div className="flex items-center justify-between gap-6 px-0 sm:px-4 md:px-6 py-3">
        {/* LOGO ÚNICO */}
        <div
          className="pl-4 cursor-pointer flex-shrink-0"
          onClick={() => navigate("/")}
        >
          <img src={Logo} alt="Metrik Pádel" className="h-20 w-auto" />
        </div>

        {/* ENLACES DESKTOP */}
        <nav className="hidden xl:flex flex-1 justify-center items-center gap-6">
          {mainLinks.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="header-link">
              {item.label}
            </button>
          ))}
        </nav>

        {/* AUTENTICACIÓN */}
        <div className="hidden xl:flex items-center gap-3 pr-4">
          {authLinks.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={item.className}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* HAMBURGUESA */}
        <div className="xl:hidden pr-4">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
        </div>
      </div>

      {/* MENÚ MÓVIL */}
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
            <div className="flex flex-col p-4 gap-3">
              {[...mainLinks, ...authLinks].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className={item.className || "header-link text-left"}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
