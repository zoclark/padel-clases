// src/components/BookingOptions.jsx
export default function BookingOptions({ onSelect }) {
    const options = [
      { type: "solo", label: "Clase individual" },
      { type: "duo", label: "Clase para 2" },
      { type: "grupal", label: "Clase grupal" },
    ];
  
    return (
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold mb-4">Reservar Clase</h2>
        {options.map((option) => (
          <button
            key={option.type}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
            onClick={() => onSelect(option.type)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
  