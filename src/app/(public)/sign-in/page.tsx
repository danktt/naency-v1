"use client";
import { IconTableFilled } from "@tabler/icons-react";

import DotGrid from "@/components/DotGrid";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <IconTableFilled className="size-6 text-primary" />
            Næncy
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <DotGrid
          dotSize={10}
          gap={15}
          baseColor="#61eaca"
          activeColor="#61eaca"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
    </div>
  );
}
