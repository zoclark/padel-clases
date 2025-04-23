// src/components/OnboardingPopup.jsx
import React from "react";

export default function OnboardingPopup({ onComplete }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center relative">
        <h2 className="text-2xl font-bold mb-4">¡Bienvenido a MetrikPadel!</h2>
        <p className="mb-6">
          Por favor, completa tu onboarding inicial para personalizar tu experiencia.<br />
          (Aquí irá el cuestionario real cuando esté listo)
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold"
        >
          Empezar
        </button>
      </div>
    </div>
  );
}