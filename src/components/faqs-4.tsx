"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQsFour() {
  const leftColumnFaqs = [
    {
      id: "item-1",
      question:
        "What is Mato and how does it differ from other decentralized exchanges?",
      answer:
        "Mato is a decentralized exchange built on Solana that uses a unique Time-Weighted Order Book (TWOB) model. Unlike traditional DEXs that execute trades instantly, Mato spreads your orders over time to minimize price impact and protect against front-running, giving you better average prices.",
    },
    {
      id: "item-2",
      question:
        "Why doesn't Mato show exactly how much I'll receive from a trade?",
      answer:
        "Because Mato executes trades continuously over your chosen duration, the exact amount you receive depends on market conditions during that time. We show you the minimum you'll receive based on your limit price, but you often get better rates due to our time-weighted execution.",
    },
    {
      id: "item-3",
      question: "Is my crypto safe when trading on Mato?",
      answer:
        "Yes, your funds are secure. Mato is built on Solana's proven blockchain infrastructure with smart contracts that have been audited. Your assets remain in your wallet until trades execute, and if your limit price isn't met, funds are automatically returned.",
    },
    {
      id: "item-4",
      question: 'What does "Time-Weighted Order Book" or "TWOB" mean?',
      answer:
        "TWOB is Mato's innovative trading mechanism that spreads your order across time instead of executing it all at once. This approach reduces price impact, prevents front-running, and often results in better average execution prices compared to instant swaps.",
    },
    {
      id: "item-5",
      question: "Can I cancel my trade after submitting it?",
      answer:
        "Yes, you can cancel your trade at any time during the execution period. Any portion of your trade that hasn't been executed yet will be returned to your wallet immediately.",
    },
  ];

  const rightColumnFaqs = [
    {
      id: "item-6",
      question: "Does Mato support staking or liquidity provision?",
      answer:
        "Currently, Mato focuses on providing the best trading experience through our Time-Weighted Order Book. We're exploring additional features like staking and liquidity provision for future releases based on community feedback.",
    },
    {
      id: "item-7",
      question:
        "What happens if my limit price isn't reached within the chosen duration?",
      answer:
        "If market prices don't reach your limit during the set duration, your remaining funds are automatically returned to your wallet. You'll receive a clear notification that no trades were executed and your funds have been safely returned.",
    },
    {
      id: "item-8",
      question: "How does Mato prevent front-running or bot exploitation?",
      answer:
        "Mato's time-weighted execution makes it nearly impossible for bots to front-run your trades. Since orders are spread over time in unpredictable patterns, malicious actors can't anticipate and exploit your transactions like they do on traditional DEXs.",
    },
    {
      id: "item-9",
      question: "What blockchain network does Mato run on, and why?",
      answer:
        "Mato is built exclusively on Solana for its high speed, low transaction costs, and robust infrastructure. Solana's capabilities enable our time-weighted execution model while keeping fees minimal and processing lightning-fast.",
    },
    {
      id: "item-10",
      question: "How can I start trading on Mato?",
      answer:
        "Getting started is simple: connect your Solana wallet, choose the tokens you want to trade, set your trade amount, duration (we recommend 10 minutes), and limit price. That's it! Mato handles the rest with its intelligent execution system.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#101111]" id="faqs">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl md:text-5xl font-medium mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/80  text-lg font-medium max-w-4xl mx-auto">
            Find clear answers to common questions about MATO, decentralized
            trading on Solana, and our unique Time-Weighted Order Book (TWOB)
            model.
          </p>
        </div>

        {/* Two Column FAQ Layout */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Left Column */}
          <div className="flex-1 space-y-3">
            {leftColumnFaqs.map((item) => (
              <div
                key={item.id}
                className="bg-[#101111] border border-[#202626] rounded-lg p-5"
              >
                <Accordion type="single" collapsible>
                  <AccordionItem value={item.id} className="border-none">
                    <AccordionTrigger className="text-white text-lg font-normal hover:no-underline text-left py-0">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-white/80 text-base pt-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-3">
            {rightColumnFaqs.map((item) => (
              <div
                key={item.id}
                className="bg-[#101111] border border-[#202626] rounded-lg p-5"
              >
                <Accordion type="single" collapsible>
                  <AccordionItem value={item.id} className="border-none">
                    <AccordionTrigger className="text-white text-lg font-normal hover:no-underline text-left py-0">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-white/80 text-base pt-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
