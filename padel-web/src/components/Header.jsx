import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Enlaces siempre visibles (dependiendo de sesión)
  const fixedLinks = [
    {
      label: "Inicio",
      onClick: () => navigate("/"),
    },
    ...(isAuthenticated
      ? [
          { label: "Panel Usuario", onClick: () => navigate("/panel") },
          { label: "Cerrar sesión", onClick: logout },
        ]
      : [
          { label: "Iniciar sesión", onClick: () => navigate("/login") },
          { label: "Registrarse", onClick: () => navigate("/registro") },
        ]),
  ];

  // Enlaces secundarios (ejemplo)
  const menuLinks = [
    {
      label: "Entrenamiento",
      onClick: () => {
        setMenuOpen(false);
        navigate("/entrenamiento");
      },
    },
    {
      label: "Sobre Nosotros",
      onClick: () => {
        setMenuOpen(false);
        alert("Aquí iría tu sección Sobre Nosotros");
      },
    },
    {
      label: "Contacto",
      onClick: () => {
        setMenuOpen(false);
        alert("Aquí iría tu sección Contacto");
      },
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm text-white shadow-md">
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Logo o título */}
        <div
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          PadelPro
        </div>

        {/* -- Sección Desktop -- */}
        <nav className="hidden md:flex items-center gap-6">
          {fixedLinks.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="hover:underline"
            >
              {item.label}
            </button>
          ))}
          {menuLinks.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="hover:underline"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* -- Hamburguesa (versión móvil) -- */}
        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobileMenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-800/80 backdrop-blur-sm shadow-md"
          >
            <div className="flex flex-col p-4 gap-3">
              {fixedLinks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className="hover:underline text-left"
                >
                  {item.label}
                </button>
              ))}
              <hr className="border-gray-700" />
              {menuLinks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className="hover:underline text-left"
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
