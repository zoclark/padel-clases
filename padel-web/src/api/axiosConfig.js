// src/api/axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// Auto añadir token
const accessToken = localStorage.getItem("accessToken");
if (accessToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
}

export default api;