import FAQsFour from "@/components/faqs-4";
import Features from "@/components/features-1";
import FeaturesSection from "@/components/features-9";
import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import React from "react";

function LandingPage() {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <Features />
      <FAQsFour />
      <FooterSection />
    </div>
  );
}

export default LandingPage;
