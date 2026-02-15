interface TestimonialCardProps {
  name: string;
  role: string;
  company: string;
  text: string;
  avatar: string;
}

export function TestimonialCard({ name, role, company, text, avatar }: TestimonialCardProps) {
  return (
    <div className="bg-white border border-warm-border rounded-2xl p-7 card-hover">
      <div className="text-gold/40 text-4xl font-logo mb-2">"</div>
      <p className="text-neutral-body text-sm leading-relaxed mb-5 italic">{text}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-onyx text-[13px] font-bold">
          {avatar}
        </div>
        <div>
          <div className="text-neutral-text text-sm font-semibold">{name}</div>
          <div className="text-neutral-muted text-xs">{role}</div>
          <div className="text-neutral-placeholder text-[11px]">{company}</div>
        </div>
      </div>
    </div>
  );
}
