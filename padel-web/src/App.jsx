// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Entrenamiento from "./pages/Entrenamiento";
import Registro from "./pages/Registro";
import AlumnoPanel from "./pages/AlumnoPanel";
import PanelOrganizador from "./pages/PanelOrganizador";
import PanelProfesor from "./pages/PanelProfesor";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginRouteWrapper from "./components/LoginRouteWrapper";
import ActivarCuenta from "./pages/ActivarCuenta";

import { AuthProvider, AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";

function AppRoutes() {
  const { rol, loading } = useContext(AuthContext);

  // ⌛ opcional, un loader global al arrancar del todo
  if (loading) {
    return <div className="text-white p-6">Cargando sesión…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/entrenamiento" element={<Entrenamiento />} />

      {/* Enlace de verificación web */}
      <Route path="/activar-cuenta/:uid/:token" element={<ActivarCuenta />} />

      {/* 🔒 ruta login protegida con el wrapper robusto */}
      <Route path="/login" element={<LoginRouteWrapper />} />

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
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
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
