"use client";

import Container from "./Container";

const footerLinks = [
  { href: "#produits", label: "Produits" },
  { href: "#vision", label: "Vision" },
  { href: "#investir", label: "Investir" },
  { href: "#contact", label: "Contact" },
];

export default function Footer() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-black text-white py-12">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-lg">Atlas Studio</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {footerLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Atlas Studio. Tous droits reserves.
          </p>
        </div>
      </Container>
    </footer>
  );
}
