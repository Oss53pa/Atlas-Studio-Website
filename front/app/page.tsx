import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Hero from "./components/sections/Hero";
import Metrics from "./components/sections/Metrics";
import Products from "./components/sections/Products";
import Vision from "./components/sections/Vision";
import Team from "./components/sections/Team";
import InvestorSection from "./components/sections/InvestorSection";
import ContactForm from "./components/sections/ContactForm";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Metrics />
      <Products />
      <Vision />
      <Team />
      <InvestorSection />
      <ContactForm />
      <Footer />
    </main>
  );
}
