// src/pages/Privacidad.jsx
import Header from "@/components/Header";

export default function Privacidad() {
  return (
    <div className="bg-white text-gray-800 min-h-screen flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-24 space-y-8 pt-32">
        <h1 className="text-4xl font-bold text-center text-blue-700">
          Política de Privacidad
        </h1>
        <section className="space-y-6 text-lg leading-relaxed">
          <p>
            Esta política de privacidad describe cómo recopilamos, usamos y protegemos la información que proporcionas al utilizar la aplicación y la plataforma web de <strong>MetrikPadel</strong>.
          </p>
          <h2 className="text-2xl font-semibold text-blue-600">1. Información que recopilamos</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Datos personales:</strong> como nombre, correo electrónico o nombre de usuario al registrarte.</li>
            <li><strong>Permisos del dispositivo:</strong> acceso a cámara, micrófono o notificaciones si el usuario lo permite.</li>
            <li><strong>Datos de uso:</strong> acciones realizadas dentro de la app, con fines de mejora y personalización.</li>
          </ul>
          <h2 className="text-2xl font-semibold text-blue-600">2. Uso de la información</h2>
          <p>Utilizamos los datos para ofrecer una experiencia personalizada, gestionar clases, reservas, progreso y enviar comunicaciones relevantes sobre tu actividad en la plataforma.</p>
          <h2 className="text-2xl font-semibold text-blue-600">3. Compartición de datos</h2>
          <p>No compartimos tu información con terceros sin tu consentimiento, salvo requerimiento legal o para ofrecer el servicio (por ejemplo, servicios de notificaciones push).</p>
          <h2 className="text-2xl font-semibold text-blue-600">4. Seguridad</h2>
          <p>Aplicamos medidas técnicas y organizativas razonables para proteger tu información contra accesos no autorizados, alteraciones o destrucción.</p>
          <h2 className="text-2xl font-semibold text-blue-600">5. Derechos del usuario</h2>
          <p>Puedes solicitar acceso, rectificación o eliminación de tus datos escribiéndonos al correo que aparece al final de esta página.</p>
          <h2 className="text-2xl font-semibold text-blue-600">6. Menores de edad</h2>
          <p>No recopilamos intencionadamente datos de menores de 13 años. Si detectamos actividad de un menor sin consentimiento parental, eliminaremos sus datos.</p>
          <h2 className="text-2xl font-semibold text-blue-600">7. Cambios en esta política</h2>
          <p>Podemos actualizar esta política en cualquier momento. Te notificaremos los cambios relevantes a través de la app o nuestra web.</p>
          <h2 className="text-2xl font-semibold text-blue-600">8. Contacto</h2>
          <p>Si tienes dudas sobre esta política o deseas ejercer tus derechos, contáctanos a:</p>
          <p>
            📧 <a href="mailto:info@metrikpadel.com" className="text-blue-600 underline">contacto@metrikpadel.com</a><br />
            🌐 <a href="https://metrikpadel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://metrikpadel.com</a>
          </p>
        </section>
      </main>
      <footer className="bg-blue-700 text-white text-center py-6">
        &copy; {new Date().getFullYear()} MetrikPadel. Todos los derechos reservados.
      </footer>
    </div>
  );
}
