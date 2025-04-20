import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShieldCheck, LineChart, Timer } from "lucide-react";
import { ReactNode } from "react";

export default function Features() {
  return (
    <section className="bg-zinc-50 py-16 md:py-32 dark:bg-transparent">
      <div className="@container mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Trading on Mato is Simple
          </h2>
          <p className="mt-4">
            We've designed the interface to be intuitive for everyone, with
            powerful features that protect your trades.
          </p>
        </div>
        <div className="max-w-full lg:grid-cols-3 mx-auto mt-8 grid grid-cols-1 gap-6 *:text-center md:mt-16">
          <Card className="group shadow-zinc-950/5">
            <CardHeader className="pb-3">
              <CardDecorator>
                <Timer className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">Set Your Duration</h3>
            </CardHeader>

            <CardContent>
              <p className="text-sm">
                Choose how long your order gradually executes in the market.
                Longer durations typically result in better prices.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-zinc-950/5">
            <CardHeader className="pb-3">
              <CardDecorator>
                <ShieldCheck className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">Protected Trading</h3>
            </CardHeader>

            <CardContent>
              <p className="mt-3 text-sm">
                Trade with confidence knowing your orders are automatically
                protected from front-running and sandwich attacks.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-zinc-950/5">
            <CardHeader className="pb-3">
              <CardDecorator>
                <LineChart className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">See Your Savings</h3>
            </CardHeader>

            <CardContent>
              <p className="mt-3 text-sm">
                After each trade, see how much you saved compared to an
                immediate market swap. Track your trading performance in
                real-time.
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
