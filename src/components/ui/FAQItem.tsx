import { ChevronDown } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div
      className={`bg-white border rounded-xl mb-2 cursor-pointer overflow-hidden transition-colors duration-200 ${
        isOpen ? "border-gold/30" : "border-warm-border"
      }`}
      onClick={onToggle}
    >
      <div className="px-6 py-4 flex justify-between items-center">
        <span className="text-neutral-text text-[15px] font-semibold pr-4">{question}</span>
        <ChevronDown
          size={20}
          className={`text-neutral-placeholder flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-4 text-neutral-body text-sm leading-relaxed">{answer}</div>
      </div>
    </div>
  );
}
