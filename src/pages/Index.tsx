import React from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import LogoBar from "../components/landing/LogoBar";
import Services from "../components/landing/Services";
import CaseStudies from "../components/landing/CaseStudies";
import WorkingProcess from "../components/landing/WorkingProcess";
import Team from "../components/landing/Team";
import Testimonials from "../components/landing/Testimonials";
import ContactForm from "../components/landing/ContactForm";
import Footer from "../components/landing/Footer";

const Index: React.FC = () => {
  return (
    <div className="bg-white flex flex-col items-stretch pt-[60px]">
      <div className="w-full max-md:max-w-full">
        <Navbar />
        <Hero />
        <LogoBar />
      </div>

      <Services />
      <CaseStudies />
      <WorkingProcess />
      <Team />
      <Testimonials />
      <ContactForm />
      <Footer />
    </div>
  );
};

export default Index;
