// src/api/axiosConfig.js
import axios from "axios";
import { toast } from "react-toastify";

console.log("BASE_URL:", import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let sessionExpiredToastShown = false;

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isLoginRoute = originalRequest.url.endsWith("/token/");
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRoute) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}token/refresh/`,
          { refresh: refreshToken }
        );

        const newAccess = res.data.access;
        localStorage.setItem("accessToken", newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Solo mostrar un toast una vez
        if (!sessionExpiredToastShown) {
          toast.error("Tu sesión ha caducado. Inicia sesión de nuevo.", {
            position: "top-center",
            autoClose: 4000,
          });
          sessionExpiredToastShown = true;
          setTimeout(() => {
            sessionExpiredToastShown = false;
          }, 8000);
        }

        // No redirigir directamente
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


export default api;
