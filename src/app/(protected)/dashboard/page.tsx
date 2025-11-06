import { ArrowUpRight, CalendarDays, CheckCircle2, Zap } from "lucide-react";

const metrics = [
  {
    title: "Active automations",
    value: "12",
    change: "+3 this week",
    icon: Zap,
  },
  {
    title: "Completed tasks",
    value: "248",
    change: "+42 this month",
    icon: CheckCircle2,
  },
  {
    title: "Upcoming reviews",
    value: "4",
    change: "Next on Nov 12",
    icon: CalendarDays,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what has been happening across your workspaces today.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="border-border/60 bg-card text-card-foreground relative overflow-hidden rounded-xl border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{metric.title}</p>
              <metric.icon className="text-muted-foreground size-4" />
            </div>
            <div className="mt-4 text-2xl font-semibold">{metric.value}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {metric.change}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="border-border/60 bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm">
          <div className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">Recent activity</h3>
              <p className="text-muted-foreground text-sm">
                Track the latest updates across automations and teams.
              </p>
            </div>
            <button className="text-primary inline-flex items-center gap-1 text-sm font-medium">
              View all
              <ArrowUpRight className="size-4" />
            </button>
          </div>
          <div className="space-y-4 px-6 py-5">
            {["Automation sync deployed", "New prompt published", "Dataset refreshed"].map(
              (item) => (
                <div
                  key={item}
                  className="border-border/60 flex items-start justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{item}</p>
                    <p className="text-muted-foreground text-xs">
                      2 hours ago · by you
                    </p>
                  </div>
                  <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs">
                    workspace
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

