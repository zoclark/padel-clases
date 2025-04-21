import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Entrenamiento from "./pages/Entrenamiento";
import Registro from "./pages/Registro";
import AlumnoPanel from "./pages/AlumnoPanel";
import PanelOrganizador from "./pages/PanelOrganizador";
import PanelProfesor from "./pages/PanelProfesor";
import ProtectedRoute from "./components/ProtectedRoute";

import { AuthProvider, AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

// Notificaciones
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Cookies
import CookieConsent from "react-cookie-consent";

function AppRoutes() {
  const { rol, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="text-white p-6">Cargando sesión...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/entrenamiento" element={<Entrenamiento />} />

      <Route
        path="/panel"
        element={
          <ProtectedRoute>
            <AlumnoPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/panel-organizador"
        element={
          rol === "organizador" ? (
            <PanelOrganizador />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/panel-profesor"
        element={
          rol === "profesor" ? (
            <PanelProfesor />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-center" autoClose={3000} />
      <CookieConsent
        location="bottom"
        buttonText="Aceptar"
        style={{ background: "#2B373B" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
        expires={150}
      >
        Esta web utiliza cookies técnicas para asegurar la mejor experiencia.
      </CookieConsent>
    </AuthProvider>
  );
}
