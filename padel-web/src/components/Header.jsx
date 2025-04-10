// src/components/Header.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const navigate = useNavigate();

  // Verifica el token para login/logout
  const [isLogged, setIsLogged] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLogged(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setIsLogged(false);
    navigate("/");
  };

  // Estado para el menú desplegable (Entrenamiento, Sobre Nosotros, Contacto)
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Enlaces fijos en la barra: “Inicio” + según login
  // (fuera del menú desplegable)
  const fixedLinks = [
    {
      label: "Inicio",
      onClick: () => navigate("/"),
    },
    ...(isLogged
      ? [
          { label: "Panel Usuario", onClick: () => navigate("/panel") },
          { label: "Cerrar sesión", onClick: handleLogout },
        ]
      : [
          { label: "Iniciar sesión", onClick: () => navigate("/login") },
          { label: "Registrarse", onClick: () => navigate("/registro") },
        ]),
  ];

  // Opciones específicas del menú desplegable
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
        alert("Aquí iría tu sección Sobre Nosotros, o navigate('/sobre')...");
      },
    },
    {
      label: "Contacto",
      onClick: () => {
        setMenuOpen(false);
        alert("Aquí iría tu sección Contacto, o navigate('/contacto')...");
      },
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm text-white shadow-md">
      <div className="px-6 py-4 flex justify-between items-center">
        <div 
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          PadelPro
        </div>

        <div className="flex items-center gap-4">
          {/* Enlaces fijos en la barra */}
          {fixedLinks.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="hover:underline"
            >
              {item.label}
            </button>
          ))}

          {/* Botón para abrir/cerrar el menú desplegable */}
          <button onClick={toggleMenu} className="text-white p-2">
            {menuOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
        </div>
      </div>

      {/* Menú desplegable (pequeño, con opacidad) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="dropdown"
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-16 right-6 w-56 bg-gray-800/80 backdrop-blur-sm p-4 rounded shadow-md z-40"
          >
            <div className="flex flex-col space-y-2">
              {menuLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={link.onClick}
                  className="text-left hover:bg-gray-700 px-3 py-2 rounded"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
