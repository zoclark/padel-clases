import { createContext, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/api/axiosConfig"

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    setIsAuthenticated(!!token)
  }, [])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const res = await api.post("/token/", { username, password })
      localStorage.setItem("accessToken", res.data.access)
      localStorage.setItem("refreshToken", res.data.refresh)
      setIsAuthenticated(true)
      navigate("/panel")
    } catch (err) {
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    setIsAuthenticated(false)
    navigate("/")
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
