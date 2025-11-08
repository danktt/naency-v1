import EventProvisions from "@/components/EventProvisions";
import { EventCalendar } from "@/components/event-calendar";

export default function ModelsPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what has been happening across your workspaces today.
        </p>
      </section>
    </div>
  );
}
