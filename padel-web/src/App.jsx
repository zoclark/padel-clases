
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Entrenamiento from "./pages/Entrenamiento";
import Registro from "./pages/Registro";
import AlumnoPanel from "./pages/AlumnoPanel";
import ProtectedRoute from "./components/ProtectedRoute";
import CookieConsent from "react-cookie-consent";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App() {
  return (
    <>
      <AuthProvider>
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
        </Routes>
      </AuthProvider>

      <CookieConsent
        location="bottom"
        buttonText="Aceptar"
        style={{ background: "#2B373B" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
        expires={150}
      >
        Esta web utiliza cookies técnicas para asegurar la mejor experiencia.
      </CookieConsent>
    </>
  );
}
