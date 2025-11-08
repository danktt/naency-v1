import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
import { IncomesForm } from "@/components/forms/incomesForm";
import { IncomesTable } from "./_components/IncomesTable";

const metrics = [
  {
    title: "Total incomes",
    value: "12",
    change: "R$ 100,00",
    icon: Zap,
  },
  {
    title: "Total expenses",
    value: "248",
    change: "R$ 100,00",
    icon: CheckCircle2,
  },
  {
    title: "Net balance",
    value: "4",
    change: "R$ 100,00",
    icon: CalendarDays,
  },
];

export default function IncomesPage() {
  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Incomes</h2>
          <p className="text-muted-foreground text-sm">Manage your incomes.</p>
        </div>
        <div>
          <IncomesForm />
        </div>
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
        <IncomesTable />
      </section>
    </div>
  );
}
