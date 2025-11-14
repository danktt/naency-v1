"use client";

import { animate } from "framer-motion";
import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}
const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          const center = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(
            mouseX - center[0],
            mouseY - center[1],
          );
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          const targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) /
              Math.PI +
            90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration],
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "block!",
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                  : `radial-gradient(circle, #61eaca 10%, #dd7bbb00 20%),
                radial-gradient(circle at 40% 40%, #61eaca 5%, #d79f1e00 15%),
                radial-gradient(circle at 60% 60%, #61eaca 10%, #5a922c00 20%), 
                radial-gradient(circle at 40% 60%, #61eaca 10%, #4c789400 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #61eaca 0%,
                  #61eaca calc(25% / var(--repeating-conic-gradient-times)),
                  #61eaca calc(50% / var(--repeating-conic-gradient-times)), 
                  #61eaca calc(75% / var(--repeating-conic-gradient-times)),
                  #61eaca calc(100% / var(--repeating-conic-gradient-times))
                )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-(--blur) ",
            className,
            disabled && "hidden!",
          )}
        >
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:bg-fixed",
              "after:opacity-(--active) after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:mask-intersect",
              "after:mask-[linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]",
            )}
          />
        </div>
      </>
    );
  },
);

GlowingEffect.displayName = "GlowingEffect";

export function GlowingEffectMetricsDemo() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GridItem
        icon={<Zap className="h-5 w-5 text-black dark:text-neutral-400" />}
        title="Total Incomes"
        value="R$ 12.000"
        description="Up 5% from last month"
      />

      <GridItem
        icon={
          <CheckCircle2 className="h-5 w-5 text-black dark:text-neutral-400" />
        }
        title="Total Expenses"
        value="R$ 8.240"
        description="Down 2% from last month"
      />

      <GridItem
        icon={
          <CalendarDays className="h-5 w-5 text-black dark:text-neutral-400" />
        }
        title="Net Balance"
        value="R$ 3.760"
        description="Stable"
      />
    </ul>
  );
}

interface GridItemProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  valueClassName?: string;
  iconContainerClassName?: string;
}

const GridItem = ({
  icon,
  title,
  value,
  description,
  valueClassName,
  iconContainerClassName,
}: GridItemProps) => {
  return (
    <li className="list-none">
      <div className="relative h-full rounded-xl border p">
        {/* Bordas animadas em #61eaca */}
        <GlowingEffect
          blur={0}
          borderWidth={2}
          spread={70}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.05}
        />

        {/* Conteúdo do card */}
        <div className="border-0.75 relative z-2 flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl p-6 ">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              {title}
            </h3>
            <div
              className={cn(
                "w-fit rounded-full bg-muted p-2 text-black dark:text-neutral-400",
                iconContainerClassName,
              )}
            >
              {icon}
            </div>
          </div>

          <div>
            <p
              className={cn(
                "text-2xl font-semibold text-black dark:text-white",
                valueClassName,
              )}
            >
              {value}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed min-h-8">
              {description}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
};
interface GlowCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  hasAction?: React.ReactNode;
}

const GlowCard = ({
  title,
  description,
  trailing,
  children,
  className,
  contentClassName,
  hasAction,
}: GlowCardProps) => {
  const showHeader = Boolean(title || description || trailing);
  const showAction = Boolean(hasAction);
  return (
    <div className={cn("relative rounded-xl border p", className)}>
      <GlowingEffect
        blur={0}
        borderWidth={2}
        spread={70}
        glow={true}
        disabled={false}
        proximity={96}
        inactiveZone={0.05}
      />
      <div
        className={cn(
          "border-0.75 relative z-2 flex flex-col gap-4 overflow-hidden rounded-xl p-6",
          contentClassName,
        )}
      >
        {showHeader ? (
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                {title ? (
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    {title}
                  </h3>
                ) : null}
                {description ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {description}
                  </p>
                ) : null}
              </div>
              {showAction && <div className="shrink-0">{showAction}</div>}
            </div>
            {trailing ? <div className="shrink-0">{trailing}</div> : null}
          </div>
        ) : null}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};
export { GlowingEffect, GridItem, GlowCard };
