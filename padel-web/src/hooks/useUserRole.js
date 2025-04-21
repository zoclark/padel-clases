// src/hooks/useUserRole.js
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export default function useUserRole() {
  const { user, loading } = useContext(AuthContext);
  return { rol: user?.rol || null, loading };
}