import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { ObservatoryProvider } from "@/components/ObservatoryContext";
import { NetworkLab } from "@/components/lab/NetworkLab";
import { Stages } from "@/components/Stages";
import { Comparison } from "@/components/Comparison";
import { WhyItMatters } from "@/components/WhyItMatters";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ObservatoryProvider>
          <NetworkLab />
          <Stages />
          <Comparison />
        </ObservatoryProvider>
        <WhyItMatters />
      </main>
      <Footer />
    </>
  );
}
