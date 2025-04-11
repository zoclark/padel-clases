// src/api/axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});




// Si el token de acceso está almacenado en localStorage
const accessToken = localStorage.getItem('accessToken');

api.defaults.headers['Authorization'] = `Bearer ${accessToken}`;

export default api;