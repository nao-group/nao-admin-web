"use client";

import { useState } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";

type LineChartProps = {
  data: number[];
  labels: string[];
  color?: string;
  fill?: string;
  formatter?: (value: number) => string;
};

export function LineChart({ data, labels, color = "#d4a017", fill = "#fff4cf", formatter = String }: LineChartProps) {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const width = 760;
  const height = 230;
  const padX = 24;
  const padY = 22;
  const min = Math.min(...data) * 0.94;
  const max = Math.max(...data) * 1.04;
  const range = max - min || 1;
  const points = data.map((value, index) => ({
    x: padX + (index * (width - padX * 2)) / Math.max(1, data.length - 1),
    y: padY + ((max - value) / range) * (height - padY * 2),
    value,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padX},${height - padY} ${polyline} ${width - padX},${height - padY}`;
  const tooltip = activePoint === null ? null : points[activePoint];
  const tooltipWidth = 122;
  const tooltipX = tooltip ? Math.min(Math.max(tooltip.x - tooltipWidth / 2, 8), width - tooltipWidth - 8) : 0;
  const tooltipY = tooltip ? (tooltip.y < 64 ? tooltip.y + 18 : tooltip.y - 58) : 0;

  return (
    <Box className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik tren data. Fokuskan setiap titik untuk melihat nilai." className="line-chart">
        <defs>
          <linearGradient id={`chart-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padY + (line * (height - padY * 2)) / 3;
          return <line key={line} x1={padX} y1={y} x2={width - padX} y2={y} stroke="#e9e4d9" strokeDasharray="4 7" />;
        })}
        <polygon points={area} fill={`url(#chart-fill-${color.replace("#", "")})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g
            key={index}
            className="chart-point"
            tabIndex={0}
            role="img"
            aria-label={`${labels[index]}: ${formatter(point.value)}`}
            onMouseEnter={() => setActivePoint(index)}
            onMouseLeave={() => setActivePoint(null)}
            onFocus={() => setActivePoint(index)}
            onBlur={() => setActivePoint(null)}
          >
            <circle cx={point.x} cy={point.y} r="16" fill="transparent" />
            <circle className="chart-point-dot" data-active={activePoint === index || undefined} cx={point.x} cy={point.y} r={activePoint === index ? 6 : 4} fill="#fffdf8" stroke={color} strokeWidth="3" />
          </g>
        ))}
        {tooltip && activePoint !== null && (
          <g className="chart-tooltip-svg" pointerEvents="none">
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="46" rx="10" fill="#0f172a" />
            <text x={tooltipX + 12} y={tooltipY + 18} fill="#cbd5e1" fontSize="10" fontWeight="600">{labels[activePoint]}</text>
            <text x={tooltipX + 12} y={tooltipY + 35} fill="#ffffff" fontSize="13" fontWeight="700">{formatter(tooltip.value)}</text>
          </g>
        )}
      </svg>
      <Group justify="space-between" gap={0} wrap="nowrap" px={12} mt={-4}>
        {labels.map((label) => <Text key={label} size="xs" c="dimmed">{label}</Text>)}
      </Group>
    </Box>
  );
}

export type DonutItem = { key: string; label: string; value: number; percentage: number };

const PALETTE = ["#0f172a", "#d4a017", "#2f7a5c", "#7c3aed", "#c0392b", "#0e7490"];

export function DistributionDonut({ items, totalLabel = "total member" }: { items: DonutItem[]; totalLabel?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const activeItem = active ? items.find((item) => item.key === active) : undefined;
  const center = activeItem ?? { label: totalLabel, value: total, percentage: 100 };

  const segments = items.map((item, index) => {
    const priorPercentage = items.slice(0, index).reduce((sum, i) => sum + i.percentage, 0);
    return { ...item, color: PALETTE[index % PALETTE.length], dashoffset: -priorPercentage };
  });

  if (!items.length) {
    return <Text size="sm" c="dimmed">No members yet.</Text>;
  }

  return (
    <Box className="donut-grid">
      <Box className="donut-chart-wrap">
        <svg viewBox="0 0 200 200" className="donut-chart" role="img" aria-label={`Distribusi member: ${items.map((item) => `${item.label} ${item.value.toLocaleString("id-ID")} atau ${item.percentage}%`).join(", ")}`}>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#ece8df" strokeWidth="28" />
          {segments.map((item) => (
            <circle
              key={item.key}
              className="donut-segment"
              data-active={active === item.key || undefined}
              cx="100"
              cy="100"
              r="72"
              pathLength="100"
              fill="none"
              stroke={item.color}
              strokeWidth={active === item.key ? 34 : 28}
              strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
              strokeDashoffset={item.dashoffset}
              transform="rotate(-90 100 100)"
              tabIndex={0}
              role="img"
              aria-label={`${item.label}: ${item.value.toLocaleString("id-ID")} member, ${item.percentage}%`}
              onMouseEnter={() => setActive(item.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(item.key)}
              onBlur={() => setActive(null)}
            />
          ))}
          <text x="100" y="95" textAnchor="middle" className="donut-center-value">{center.value.toLocaleString("id-ID")}</text>
          <text x="100" y="119" textAnchor="middle" className="donut-center-label">{center.label}</text>
          {activeItem && <text x="100" y="138" textAnchor="middle" className="donut-center-percent">{activeItem.percentage}%</text>}
        </svg>
      </Box>
      <Box>
        {segments.map((item) => (
          <UnstyledButton
            key={item.key}
            className="legend-row"
            data-active={active === item.key || undefined}
            onMouseEnter={() => setActive(item.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(item.key)}
            onBlur={() => setActive(null)}
            aria-label={`${item.label}: ${item.value.toLocaleString("id-ID")} member, ${item.percentage}%`}
          >
            <Group gap={8}><span className="legend-dot" style={{ backgroundColor: item.color }} /><Text size="sm">{item.label}</Text></Group>
            <Box ta="right"><Text fw={700}>{item.value.toLocaleString("id-ID")}</Text><Text size="xs" c="dimmed">{item.percentage}%</Text></Box>
          </UnstyledButton>
        ))}
        <Text size="xs" c="dimmed" mt="md" lh={1.6}>Arahkan cursor atau fokuskan segmen untuk melihat detail distribusi.</Text>
      </Box>
    </Box>
  );
}
