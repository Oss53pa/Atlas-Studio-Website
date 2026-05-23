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
      className={`relative bg-ink-200 border rounded-2xl mb-3 cursor-pointer overflow-hidden transition-all duration-300 ${
        isOpen
          ? "border-gold/40 shadow-[0_0_0_1px_rgba(169,181,126,0.15),0_8px_28px_-8px_rgba(169,181,126,0.2)]"
          : "border-white/[0.06] shadow-elev-1 hover:border-white/[0.12]"
      }`}
      onClick={onToggle}
    >
      {isOpen && (
        <div className="absolute -top-px left-[8%] right-[8%] h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.6) 50%, transparent 100%)" }}
        />
      )}
      <div className="px-6 py-5 flex justify-between items-center gap-4">
        <span className={`text-[15px] font-medium pr-2 transition-colors duration-300 ${isOpen ? "text-gold" : "text-neutral-light"}`}>
          {question}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`flex-shrink-0 transition-all duration-400 ${
            isOpen ? "rotate-180 text-gold" : "text-neutral-muted"
          }`}
        />
      </div>
      <div
        className={`overflow-hidden transition-all duration-400 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-5 text-neutral-muted text-[14px] leading-relaxed font-light">
          {answer}
        </div>
      </div>
    </div>
  );
}
