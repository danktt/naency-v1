"use client";

import { gsap } from "gsap";
import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NeonCardProps {
  children: React.ReactNode;
  glowColor?: string;
  clickEffect?: boolean;
  className?: string;
}

export function NeonCard({
  children,
  glowColor = "#61eaca",
  clickEffect = true,
  className,
}: NeonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const rgb = hexToRgb(glowColor);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);

      // brilho reage ao movimento do mouse
      gsap.to(el, {
        "--opacity": 1,
        "--x": `${x}px`,
        "--y": `${y}px`,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        "--opacity": 0,
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("div");
      ripple.className = "absolute rounded-full pointer-events-none";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = ripple.style.height = "300px";
      ripple.style.background = `radial-gradient(circle, ${glowColor}55 0%, transparent 70%)`;
      ripple.style.transform = "translate(-50%, -50%) scale(0)";
      ripple.style.opacity = "1";
      el.appendChild(ripple);

      gsap.to(ripple, {
        scale: 1,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => ripple.remove(),
      });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("click", handleClick);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("click", handleClick);
    };
  }, [glowColor, clickEffect]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-xl border  bg-card p-5 shadow-sm transition-all duration-300 ease-out",
        "before:absolute before:inset-0 before:content-[''] before:rounded-xl before:pointer-events-none",
        "after:absolute after:inset-0 after:content-[''] after:rounded-xl after:pointer-events-none",
        className,
      )}
      style={{
        ["--x" as any]: "50%",
        ["--y" as any]: "50%",
        ["--opacity" as any]: 0,
        background: `
          radial-gradient(400px circle at var(--x) var(--y),
            rgba(97, 234, 202, 0.06),
            transparent 60%
          ),
          var(--tw-bg-card)
        `,
      }}
    >
      {/* Glow nas bordas */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-[2]"
        style={{
          background: `
            radial-gradient(600px circle at var(--x) var(--y),
              rgba(97,234,202,0.6),
              transparent 40%)
          `,
          WebkitMask: `
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0)
          `,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "2px",
          opacity: "var(--opacity)",
        }}
      ></div>

      {/* Borda neon viva */}
      {/* <div
        className="absolute inset-0 rounded-xl z-[1] pointer-events-none"
        style={{
          boxShadow: `
            0 0 20px rgba(97,234,202,0.25),
            inset 0 0 20px rgba(97,234,202,0.25)
          `,
          border: `1px solid rgba(97,234,202,0.5)`,
        }}
      ></div> */}

      <div className="relative z-[3]">{children}</div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
