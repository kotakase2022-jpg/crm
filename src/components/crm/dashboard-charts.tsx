"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const palette = ["#0f172a", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#be123c", "#475569"];

export function StageAmountChart({ data }: { data: { stage: string; count: number; amount: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={90} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString("ja-JP")}円`} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={palette[index % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskPieChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
            {rows.map((_, index) => (
              <Cell key={index} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
