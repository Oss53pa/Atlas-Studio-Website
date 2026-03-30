interface TestimonialCardProps {
  name: string;
  role: string;
  company: string;
  text: string;
  avatar: string;
}

export function TestimonialCard({ name, role, company, text, avatar }: TestimonialCardProps) {
  return (
    <div className="relative bg-dark-bg3 border border-dark-border rounded-xl p-7 card-hover overflow-hidden">
      <div className="relative">
        <div className="text-gold text-[13px] mb-3 tracking-wider">★★★★★</div>
        <p className="text-neutral-muted text-sm leading-relaxed mb-5 italic font-light">"{text}"</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-bg2 border border-dark-border2 flex items-center justify-center text-gold text-[13px] font-bold">
            {avatar}
          </div>
          <div>
            <div className="text-neutral-light text-sm font-semibold">{name}</div>
            <div className="text-neutral-muted text-xs font-light">{role}</div>
            <div className="text-neutral-muted/60 text-[11px] font-light">{company}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
