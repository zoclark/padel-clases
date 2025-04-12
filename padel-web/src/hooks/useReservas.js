import { useEffect, useState } from "react"
import api from "@/api/axiosConfig"

export default function useReservas() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const res = await api.get("/reservas/")
        setData(res.data)
      } catch (err) {
        console.error("Error al cargar reservas:", err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchReservas()
  }, [])

  return { data, loading, error }
}
