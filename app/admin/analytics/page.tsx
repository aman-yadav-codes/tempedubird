export default function AnalyticsPage() {
  const data = [
    { month: "Jan", visits: 4200, revenue: 8400 },
    { month: "Feb", visits: 5800, revenue: 11200 },
    { month: "Mar", visits: 4900, revenue: 9800 },
    { month: "Apr", visits: 7100, revenue: 14200 },
    { month: "May", visits: 6300, revenue: 12600 },
    { month: "Jun", visits: 8200, revenue: 16400 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your platform performance over time.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Visits", value: "36,500", sub: "+18% from last period" },
          { label: "Avg. Session", value: "3m 42s", sub: "+5% from last period" },
          { label: "Bounce Rate", value: "24.1%", sub: "-3% from last period" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart simulation */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-6">Monthly Visits</h2>
        <div className="flex items-end gap-4 h-40">
          {data.map((d) => (
            <div key={d.month} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-full rounded-t-md bg-primary/80 transition-all duration-500"
                style={{ height: `${(d.visits / 8200) * 100}%` }}
              />
              <span className="text-xs text-muted-foreground">{d.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
