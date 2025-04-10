import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Fondo fijo semitransparente */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-800/80 backdrop-blur-sm px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-white">PadelPro</div>

        <div className="flex items-center gap-4">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2"
            onClick={() => navigate("/registro")}
          >
            Registrarse
          </Button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white hover:text-gray-300 p-2"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Menú modal */}
      {menuOpen && (
        <div className="fixed top-20 right-6 z-50 bg-white shadow-lg rounded-md p-4 space-y-4 w-48 animate-fade-in">
          <button
            onClick={() => {
              setMenuOpen(false);
              navigate("/");
            }}
            className="block w-full text-left text-gray-700 hover:text-blue-600"
          >
            Inicio
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo({ top: 1000, behavior: "smooth" }); // ejemplo
            }}
            className="block w-full text-left text-gray-700 hover:text-blue-600"
          >
            Sobre nosotros
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo({ top: 2000, behavior: "smooth" }); // ejemplo
            }}
            className="block w-full text-left text-gray-700 hover:text-blue-600"
          >
            Contáctanos
          </button>
        </div>
      )}
    </>
  );
}
