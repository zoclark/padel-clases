import { useEffect, useState } from "react"
import api from "@/api/axiosConfig"

export default function useUserData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/perfil/")
        setData(res.data)
      } catch (err) {
        console.error("Error al cargar perfil:", err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { data, loading, error }
}
