import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShieldCheck, LineChart, Timer } from "lucide-react";
import { ReactNode } from "react";
import Image from "next/image";

export default function Features() {
  return (
    <section
      className="bg-zinc-50 py-16 md:py-32 dark:bg-transparent"
      id="solutions"
    >
      <div className="@container mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance font-clash text-4xl font-semibold lg:text-5xl">
            Trading as a Stream
          </h2>
          <p className="mt-4">
            Instead of treating trades as instant, all-or-nothing events, Mato
            executes orders continuously over time.
          </p>
        </div>
        <div className="max-w-full lg:grid-cols-3 mx-auto mt-8 grid grid-cols-1 gap-6 *:text-center md:mt-16">
          <Card className="group bg-black shadow-zinc-950/5">
            <CardHeader className="h-40 pb-3 items-center">
              <Image
                className="items-center"
                alt={""}
                src={"/intent.svg"}
                width={200}
                height={200}
              />
            </CardHeader>
            <CardContent>
              <h3 className="mt-6 text-xl font-medium font-clash ">
                Submit your Trade Intent
              </h3>

              <p className="text-sm mt-4">
                Set your terms by specifying quantity, limit price and trade
                duration.
              </p>
            </CardContent>
          </Card>
          <Card className="group bg-black shadow-zinc-950/5">
            <CardHeader className="h-40 pb-3 items-center">
              <Image
                className="items-center"
                alt={""}
                src={"/marketprice.svg"}
                width={180}
                height={180}
              />
            </CardHeader>
            <CardContent>
              <h3 className="mt-6 text-xl font-medium font-clash ">
                Price Discovery
              </h3>

              <p className="text-sm mt-4">
                Mato finds the market clearing price by matching supply and
                demand. Every order settles at this uniform price.
              </p>
            </CardContent>
          </Card>
          <Card className="group bg-black shadow-zinc-950/5">
            <CardHeader className="h-40 pb-3 items-center">
              <Image
                className="items-center"
                alt={""}
                src={"/automation.svg"}
                width={180}
                height={280}
              />
            </CardHeader>
            <CardContent>
              <h3 className="mt-6 text-xl font-medium font-clash ">
                Built-in Automation
              </h3>

              <p className="text-sm mt-4">
                Your trade executes continuously as long as the market stays
                within your price limits, pausing automatically when it moves
                out of range.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="relative mx-auto size-36 duration-200 [--color-border:color-mix(in_oklab,var(--color-zinc-950)10%,transparent)] group-hover:[--color-border:color-mix(in_oklab,var(--color-zinc-950)20%,transparent)] dark:[--color-border:color-mix(in_oklab,var(--color-white)15%,transparent)] dark:group-hover:bg-white/5 dark:group-hover:[--color-border:color-mix(in_oklab,var(--color-white)20%,transparent)]">
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px]"
    />
    <div
      aria-hidden
      className="bg-radial to-background absolute inset-0 from-transparent to-75%"
    />
    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t">
      {children}
    </div>
  </div>
);
