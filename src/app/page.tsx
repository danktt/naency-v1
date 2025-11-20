import { auth } from "@clerk/nextjs/server";
import { Features } from "./_components/features";
import { Footer } from "./_components/footer";
import { Hero } from "./_components/hero";
import { Navbar } from "./_components/navbar";
import { Pricing } from "./_components/pricing";

export default async function Home() {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <main className="min-h-screen relative bg-black text-white selection:bg-primary selection:text-white overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar isAuthenticated={isAuthenticated} />
        <Hero />
        <Features />
        <Pricing />
        <Footer />
      </div>
    </main>
  );
}
