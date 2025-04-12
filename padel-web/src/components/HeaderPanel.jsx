import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";

export default function HeaderPanel({ subView, setSubView }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  const [panelOpen, setPanelOpen] = useState(false);
  const togglePanel = () => setPanelOpen(!panelOpen);

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
        alert("Iría a /sobre");
      },
    },
    {
      label: "Contacto",
      onClick: () => {
        setMenuOpen(false);
        alert("Iría a /contacto");
      },
    },
  ];

  const panelLinks = [
    { key: "atributos", label: "Atributos" },
    { key: "historial", label: "Historial" },
    { key: "reservas", label: "Reservas" },
  ];

  return (
    <header className="fixed w-full top-0 z-50 bg-gray-900/80 backdrop-blur-sm text-white shadow-md">
      <div className="px-6 py-4 flex justify-between items-center">
        <div
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          PadelPro
        </div>

        <nav className="hidden md:flex gap-4 items-center">
          {fixedLinks.map((item, i) => (
            <button key={i} onClick={item.onClick} className="hover:underline">
              {item.label}
            </button>
          ))}
          <button onClick={toggleMenu} className="text-white p-2">
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </nav>

        <div className="flex md:hidden gap-2">
          {fixedLinks.length > 0 && (
            <button onClick={fixedLinks[0].onClick} className="hover:underline">
              {fixedLinks[0].label}
            </button>
          )}
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-800/80 backdrop-blur p-4"
          >
            <div className="flex flex-col gap-2 mb-2">
              {fixedLinks.map((item, i) => (
                <button
                  key={i}
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
            <div className="border-t border-gray-700 pt-2 flex flex-col gap-2">
              {menuLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={link.onClick}
                  className="hover:underline text-left"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-gray-700 px-6 py-2 flex justify-between items-center md:items-start">
        <div className="hidden md:flex gap-6">
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

        <div className="md:hidden flex flex-col items-end w-full">
          <button onClick={togglePanel} className="text-white p-2 self-end">
            {panelOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                key="panelDropdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800/80 w-full backdrop-blur p-3 mt-2 flex flex-col gap-2"
              >
                {panelLinks.map((pl) => (
                  <button
                    key={pl.key}
                    onClick={() => {
                      setSubView(pl.key);
                      setPanelOpen(false);
                    }}
                    className={`capitalize text-left hover:underline ${
                      subView === pl.key ? "font-bold underline text-blue-400" : ""
                    }`}
                  >
                    {pl.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
