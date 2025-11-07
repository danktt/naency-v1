"use client";

import { IconTableFilled } from "@tabler/icons-react";

import DotGrid from "@/components/DotGrid";
import { SignUpForm } from "@/components/forms/sign-up-form";
import Silk from "@/components/Silk";

export default function SignUpPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-3">
      <div className="flex flex-col gap-4 p-6 md:p-10 col-span-1">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <IconTableFilled className="size-6 text-primary" />
            Næncy
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignUpForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block col-span-2">
        <Silk
          speed={5}
          scale={1}
          color="#61eaca"
          noiseIntensity={1.5}
          rotation={0}
        />
        <DotGrid />
      </div>
    </div>
  );
}

