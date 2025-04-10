// src/components/PistaVisual.jsx
export default function PistaVisual({ posicion }) {
    // Normaliza la posición en minúsculas
    const pos = (posicion || "").toLowerCase();
  
    // Si es 'reves', el jugador se dibuja en la izquierda (cx=30), 
    // si no (ej. 'drive'), en la derecha (cx=70).
    const cxValue = pos === "Revés" ? 30 : 70;
  
    return (
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full object-contain"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fondo pista en color verde claro */}
        <rect x="0" y="0" width="100" height="100" fill="#48BB78" />
  
        {/* Línea central blanca */}
        <line x1="50" y1="0" x2="50" y2="100" stroke="#fff" strokeWidth="2" />
  
        {/* Jugador (círculo rojo) */}
        <circle
          cx={cxValue}
          cy="50"
          r="7"
          fill="red"
        />
      </svg>
    );
  }
  