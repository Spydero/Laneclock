"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";

const tooltipStyle = {
  background: "#12201b",
  border: "1px solid rgba(45,212,191,0.2)",
  borderRadius: 8,
};

export default function AnalyticsPage() {
  const [dash, setDash] = useState<{
    otifPercent: number;
    avgCycleTimeHours: number;
    delayed: number;
    active: number;
  } | null>(null);
  const [otif, setOtif] = useState<{ date: string; otifPercent: number; volume: number }[]>([]);
  const [cycle, setCycle] = useState<{ label: string; count: number }[]>([]);
  const [dwell, setDwell] = useState<{
    byFacility: { facility: string; avgDwellHours: number }[];
    byDayOfWeek: { day: string; avgDwellHours: number }[];
  } | null>(null);
  const [lanes, setLanes] = useState<
    { lane: string; expectedHours: number; actualHours: number | null; otifPercent: number | null }[]
  >([]);
  const [carriers, setCarriers] = useState<
    { name: string; otifPercent: number; volume: number; avgDelayHours: number; exceptionRate: number }[]
  >([]);
  const [modes, setModes] = useState<{ mode: string; volume: number; delayed: number }[]>([]);
  const [pareto, setPareto] = useState<
    { reason: string; count: number; cumulativePercent: number }[]
  >([]);
  const [volOn, setVolOn] = useState<{ date: string; volume: number; onTimePercent: number }[]>([]);

  useEffect(() => {
    Promise.all([
      api<NonNullable<typeof dash>>("/v1/analytics/dashboard"),
      api<{ series: typeof otif }>("/v1/analytics/otif-trend"),
      api<{ bins: typeof cycle }>("/v1/analytics/cycle-time"),
      api<NonNullable<typeof dwell>>("/v1/analytics/dwell"),
      api<{ lanes: typeof lanes }>("/v1/analytics/lanes"),
      api<{ carriers: typeof carriers }>("/v1/analytics/carriers"),
      api<{ modes: typeof modes }>("/v1/analytics/modes"),
      api<{ reasons: typeof pareto }>("/v1/analytics/delay-pareto"),
      api<{ series: typeof volOn }>("/v1/analytics/volume-ontime"),
    ]).then(([d, o, c, dw, l, car, m, p, v]) => {
      setDash(d);
      setOtif(o.series);
      setCycle(c.bins);
      setDwell(dw);
      setLanes(l.lanes);
      setCarriers(car.carriers);
      setModes(m.modes);
      setPareto(p.reasons);
      setVolOn(v.series);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Analytics</h1>
        <p className="text-sand-400">Decision graphs for OTIF, dwell, lanes, and carriers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="OTIF" value={dash ? `${dash.otifPercent.toFixed(0)}%` : "—"} />
        <StatCard
          label="Avg cycle"
          value={dash ? `${dash.avgCycleTimeHours.toFixed(1)}h` : "—"}
        />
        <StatCard label="Delayed" value={dash?.delayed ?? "—"} />
        <StatCard label="Active" value={dash?.active ?? "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="OTIF trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={otif}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="date" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="otifPercent" stroke="#2dd4bf" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Volume vs on-time">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={volOn}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="date" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis yAxisId="l" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar yAxisId="l" dataKey="volume" fill="#0d9488" name="Volume" />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="onTimePercent"
                stroke="#c4b89a"
                name="On-time %"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Cycle-time distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cycle}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="label" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Dwell by facility">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dwell?.byFacility ?? []}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="facility" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="avgDwellHours" fill="#e3a008" name="Avg dwell h" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Dwell by day of week">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dwell?.byDayOfWeek ?? []}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="day" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="avgDwellHours" fill="#5eead4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Lane performance (expected vs actual hours)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={lanes}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="lane" tick={{ fill: "#9aab9f", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="expectedHours" fill="#2a4a3e" name="Expected" />
              <Bar dataKey="actualHours" fill="#2dd4bf" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Mode mix">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={modes}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="mode" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="volume" fill="#14b8a6" name="Volume" />
              <Bar dataKey="delayed" fill="#e85d4c" name="Delayed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Delay reasons (Pareto)">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={pareto}>
              <CartesianGrid stroke="rgba(45,212,191,0.1)" />
              <XAxis dataKey="reason" tick={{ fill: "#9aab9f", fontSize: 10 }} />
              <YAxis yAxisId="l" tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fill: "#9aab9f", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar yAxisId="l" dataKey="count" fill="#e85d4c" name="Count" />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="cumulativePercent"
                stroke="#c4b89a"
                name="Cumulative %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <section className="panel overflow-x-auto p-5">
        <h2 className="mb-4 font-display text-2xl">Carrier scorecard</h2>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-xs uppercase text-sand-400">
            <tr>
              <th className="pb-2">Carrier</th>
              <th className="pb-2">Volume</th>
              <th className="pb-2">OTIF %</th>
              <th className="pb-2">Avg delay h</th>
              <th className="pb-2">Exception rate %</th>
            </tr>
          </thead>
          <tbody>
            {carriers.map((c) => (
              <tr key={c.name} className="border-t border-teal-400/10">
                <td className="py-2">{c.name}</td>
                <td className="py-2">{c.volume}</td>
                <td className="py-2">{c.otifPercent.toFixed(0)}</td>
                <td className="py-2">{c.avgDelayHours.toFixed(1)}</td>
                <td className="py-2">{c.exceptionRate.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      {children}
    </div>
  );
}
