"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MonthlySalesChart({ data }: { data: Array<{ month: string; sales: number }> }) {
  return <div className="h-72 w-full" aria-label="Monthly sales chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis width={72} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [`Rs. ${Number(value).toFixed(2)}`, "Sales"]} cursor={{ fill: "#eff6ff" }} /><Bar dataKey="sales" fill="#0957d0" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
