import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  type = "button",
  variant = "primary", // nuevo: controla variantes
}) {
  const base =
    "px-4 py-2 font-semibold rounded transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-black border border-gray-300 hover:bg-gray-100",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}