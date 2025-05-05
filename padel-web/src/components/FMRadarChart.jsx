import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

/**
 * "skills" es un array de objetos del tipo:
 * [ { skill: "Físico", value: 50 }, { skill: "Ataque", value: 75 }, ... ]
 * donde "value" va de 0 a 100.
 */
export default function FMRadarChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((s) => ({
    skill: s.skill,
    ring20: 20,
    ring40: 40,
    ring60: 60,
    ring80: 80,
    ring100: 100,
    user: s.value,
  }));

  // 2) El orden en que definamos los <Radar> determina cuál queda "encima".
  //    Queremos dibujar primero el anillo 20 (pequeño) y luego 40..100.
  //    Al final, dibujamos el "user".
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart
        data={chartData}
        cx="50%"
        cy="50%"
        outerRadius="80%"
        startAngle={90}
        endAngle={-270}
      >
        <PolarGrid
          stroke="#ccc"
          strokeOpacity={0.2}
          radialLines={true}
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="skill"
          stroke="#ddd"
          tick={{ fill: "#bbb", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={0}
          domain={[0, 100]}
          stroke="#999"
          axisLine={false}
          tick={false}
        />

        {/* 3) Cinco <Radar> de "fondo", uno para cada anillo */}
        {/* ring20: centro (color rojizo) */}
        <Radar
          name="R20"
          dataKey="ring20"
          stroke="none"
          fill="#ef4444"
          fillOpacity={0.6}
        />
        {/* ring40: siguiente anillo (naranja) */}
        <Radar
          name="R40"
          dataKey="ring40"
          stroke="none"
          fill="#f97316"
          fillOpacity={0.4}
        />
        {/* ring60: siguiente (amarillo) */}
        <Radar
          name="R60"
          dataKey="ring60"
          stroke="none"
          fill="#facc15"
          fillOpacity={0.3}
        />
        {/* ring80: siguiente (verde claro) */}
        <Radar
          name="R80"
          dataKey="ring80"
          stroke="none"
          fill="#84cc16"
          fillOpacity={0.2}
        />
        {/* ring100: borde (verde intenso) */}
        <Radar
          name="R100"
          dataKey="ring100"
          stroke="none"
          fill="#22c55e"
          fillOpacity={0.1}
        />

        {/* 4) Radar final para el "user" (la figura real del usuario) */}
        <Radar
          name="Usuario"
          dataKey="user"
          stroke="#ffffff"
          fill="#ffffff"
          fillOpacity={0.15}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
