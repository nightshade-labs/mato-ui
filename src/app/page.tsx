import FAQsFour from "@/components/faqs-4";
import Features from "@/components/features-1";
import FeaturesSection from "@/components/features-9";
import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import HowItWorks from "@/components/how-it-works";
import SocialProof from "@/components/social-proof";
import WhyChooseMato from "@/components/why-choose-mato";
import CTASection from "@/components/cta-section";
import React from "react";
import HeroSectionNew from "@/components/landing/HeroSectionNew";

function LandingPage() {
  return (
    <div className="bg-[#101111]">
      {/* <HeroSection /> */}
      <HeroSectionNew />
      <div className="max-w-6xl  mx-auto flex flex-col gap-16">
        {/* <Features /> */}
        <WhyChooseMato />
        <CTASection />
        <FeaturesSection />

        <HowItWorks />
        <SocialProof />

        <FAQsFour />
        <CTASection />
        <FooterSection />
      </div>
    </div>
  );
}

export default LandingPage;
