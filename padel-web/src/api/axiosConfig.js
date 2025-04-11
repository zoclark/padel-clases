// src/api/axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://padel-clases.onrender.com/api/",
  headers: {
    "Content-Type": "application/json",
  },
});


// Si el token de acceso está almacenado en localStorage
const accessToken = localStorage.getItem('accessToken');

api.defaults.headers['Authorization'] = `Bearer ${accessToken}`;

export default api;