import { IconTableFilled } from "@tabler/icons-react";
import Image from "next/image";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
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
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block col-span-2">
        <Image
          src="https://plus.unsplash.com/premium_photo-1681487769650-a0c3fbaed85a?q=80&w=1255&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Image"
          width={1000}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
