import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

export default function RadarChart({ data = [], size = 220 }) {
  if (!data.length) return null;

  const center = size / 2;
  const radius = size * 0.35;
  const angleSlice = (2 * Math.PI) / data.length;

  const getPoint = (angle, value, max = 100) => {
    const r = (value / max) * radius;
    return {
      x: center + r * Math.sin(angle),
      y: center - r * Math.cos(angle),
    };
  };

  const backgroundPolygons = [20, 40, 60, 80, 100].map((lvl) =>
    data.map((_, i) => {
      const angle = i * angleSlice;
      return getPoint(angle, lvl);
    })
  );

  const userPoints = data.map((item, i) => {
    const angle = i * angleSlice;
    return getPoint(angle, item.valor);
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circles or polygons */}
        {backgroundPolygons.map((ring, idx) => (
          <Polygon
            key={idx}
            points={ring.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#ccc"
            strokeOpacity={0.15}
          />
        ))}

        {/* Lines from center to each axis */}
        {data.map((_, i) => {
          const angle = i * angleSlice;
          const { x, y } = getPoint(angle, 100);
          return (
            <Line
              key={`line-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#999"
              strokeOpacity={0.2}
            />
          );
        })}

        {/* Labels */}
        {data.map((item, i) => {
          const angle = i * angleSlice;
          const { x, y } = getPoint(angle, 110);
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fill="#aaa"
              fontSize="10"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {item.nombre}
            </SvgText>
          );
        })}

        {/* User polygon */}
        <Polygon
          points={userPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(0,255,128,0.2)"
          stroke="#00ff88"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
}
