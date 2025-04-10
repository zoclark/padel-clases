import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarSchedule({ bookings, onDateSelect }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Función para manejar el cambio de fecha en el calendario
  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // Función para formatear la fecha al estilo dd/mm/yyyy
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Función para resaltar días con reservas
  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      // Convertir la fecha a string en formato ISO (YYYY-MM-DD)
      const dateIso = date.toISOString().split("T")[0];
      // Revisamos si hay alguna reserva para ese día en bookings
      const hasBooking = bookings.some((b) => b.date === dateIso);
      return hasBooking ? "bg-green-200" : "";
    }
  };

  return (
    <div>
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        tileClassName={tileClassName}
      />
      <p className="mt-4 font-bold">
        Fecha seleccionada: {formatDate(selectedDate)}
      </p>
    </div>
  );
}
