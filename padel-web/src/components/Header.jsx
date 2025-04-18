import { useState, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import Logo from "@/assets/MetrikPadel_Logo.svg";

const Header = forwardRef(function Header(_, ref) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (window.innerWidth < 1024) {
        setHideHeader(currentY > lastScrollY && currentY > 80);
        setLastScrollY(currentY);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const mainLinks = [
    { label: "Inicio", onClick: () => navigate("/") },
    { label: "Entrenamiento", onClick: () => navigate("/entrenamiento") },
    { label: "Sobre Nosotros", onClick: () => alert("Aquí iría tu sección Sobre Nosotros") },
    { label: "Contacto", onClick: () => alert("Aquí iría tu sección Contacto") },
  ];

  const authLinks = isAuthenticated
    ? [
        {
          label: "Panel Usuario",
          onClick: () => navigate("/panel"),
          className: "text-lg font-semibold hover:text-blue-600 transition-all",
        },
        {
          label: "Cerrar sesión",
          onClick: logout,
          className: "header-logout",
        },
      ]
    : [
        {
          label: "Iniciar sesión",
          onClick: () => navigate("/login"),
          className: "text-lg font-semibold hover:text-blue-600 transition-all",
        },
        {
          label: "Registrarse",
          onClick: () => navigate("/registro"),
          className: "header-auth",
        },
      ];

  return (
    <header
      ref={ref}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0f172a]/80 text-white transition-transform duration-300 ${
        hideHeader ? "-translate-y-full" : "translate-y-0 shadow-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 md:px-8 py-3">
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

        <nav className="hidden xl:flex flex-1 justify-center items-center gap-6">
          {mainLinks.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="text-lg font-semibold hover:text-blue-600 transition-all"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-3 pr-4">
          {authLinks.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className={item.className}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="xl:hidden px-4 sm:px-0">
          <button onClick={toggleMenu}>
            {menuOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
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
            <div className="flex flex-col p-4 gap-3">
              {[...mainLinks, ...authLinks].map((item, idx) => (
                <button
                  key={idx}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});

export default Header;
