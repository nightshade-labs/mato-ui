"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export default function FAQsFour() {
  const faqItems = [
    {
      id: "item-1",
      question: "How does Mato's gradual execution work?",
      answer:
        "Instead of executing your trade all at once, Mato spreads your order over a duration you choose. This minimizes price impact and protects against front-running bots, helping you achieve better average prices compared to immediate swaps.",
    },
    {
      id: "item-2",
      question: "How do I set up a trade on Mato?",
      answer:
        "Trading on Mato is simple. You only need to set three things: the amount you want to trade, the duration for gradual execution (we recommend 10 minutes for optimal balance), and your limit price to ensure trades execute at or better than your desired level.",
    },
    {
      id: "item-3",
      question: "What happens if market prices don't reach my limit?",
      answer:
        "If the market doesn't meet your limit price during the set duration, your funds are safely returned to your wallet. We'll clearly inform you that \"No trades executed—market prices did not reach your limit. Your funds have been returned.\"",
    },
    {
      id: "item-4",
      question: "How does Mato protect against front-running bots?",
      answer:
        "Front-running and sandwich attacks are automatically prevented by Mato's gradual execution design. Unlike traditional DEXs, our approach shields your orders from malicious bots that typically exploit large, instant swaps.",
    },
    {
      id: "item-5",
      question: "What are Mato's trading fees?",
      answer:
        "Built natively on Solana, Mato leverages the network's speed for near-instant order processing with ultra-low transaction costs. After each successful trade, we show you how much you saved compared to an immediate market swap.",
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl font-clash">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-center mt-4 text-balance">
            Discover quick and comprehensive answers to common questions about
            our platform, services, and features.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl">
          <Accordion
            type="single"
            collapsible
            className="bg-muted dark:bg-muted/50 w-full rounded-2xl p-1"
          >
            {faqItems.map((item) => (
              <div className="group" key={item.id}>
                <AccordionItem
                  value={item.id}
                  className="data-[state=open]:bg-card dark:data-[state=open]:bg-muted peer rounded-xl border-none px-7 py-1 data-[state=open]:border-none data-[state=open]:shadow-sm"
                >
                  <AccordionTrigger className="cursor-pointer text-base hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
                <hr className="mx-7 border-dashed group-last:hidden peer-data-[state=open]:opacity-0" />
              </div>
            ))}
          </Accordion>

          <p className="text-muted-foreground text-center mt-6 px-8">
            Can't find what you're looking for? Contact our{" "}
            <Link href="#" className="text-primary font-medium hover:underline">
              team
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
