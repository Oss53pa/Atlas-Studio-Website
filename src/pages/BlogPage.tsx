import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import { blogPosts, type BlogPost, blogCategories } from "../config/blog";

function BlogCard({ post, featured = false, index }: { post: BlogPost; featured?: boolean; index?: number }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block relative ${featured ? "md:grid md:grid-cols-2 md:gap-10 border-y border-white/[0.10] py-10 md:py-12" : "border-t border-white/[0.06] pt-6"}`}
    >
      <div className={`relative overflow-hidden rounded-lg ${featured ? "h-64 md:h-full" : "h-44"} mb-6 md:mb-0`}>
        <img
          src={post.cover}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-onyx/40 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col justify-between">
        <div>
          <div className="meta-mono text-[10px] tracking-[0.22em] uppercase mb-3 flex items-baseline gap-3 flex-wrap text-[#A9B57E]">
            {typeof index === "number" && <span className="tabular-nums text-neutral-light/40">{String(index + 1).padStart(2, "0")}</span>}
            <span>{post.category}</span>
            <span className="text-neutral-light/25">·</span>
            <span className="text-neutral-light/45">{post.date}</span>
            <span className="text-neutral-light/25">·</span>
            <span className="text-neutral-light/45">{post.readTime}</span>
          </div>
          <h3 className={`font-display font-medium text-neutral-light group-hover:text-[#D6DDB3] transition-colors leading-tight tracking-[-0.02em] mb-3 ${
            featured ? "text-[28px] md:text-[40px] lg:text-[44px]" : "text-[20px] md:text-[22px]"
          }`}>
            {post.title}
          </h3>
          <p className={`text-neutral-muted font-light leading-relaxed ${featured ? "text-[15px] md:text-[16px] line-clamp-4" : "text-[13px] line-clamp-3"}`}>
            {post.excerpt}
          </p>
        </div>
        <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] group-hover:text-[#D6DDB3] transition-colors mt-6">
          Lire l'article →
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return blogPosts.filter((p) => {
      const matchCat = activeCategory === "Tous" || p.category === activeCategory;
      const matchSearch = !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead
        title="Blog"
        description="Actualités, conseils et ressources pour les entreprises africaines. Découvrez nos articles sur la gestion, la fiscalité et la transformation digitale."
        canonical="/blog"
      />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>§ Le Journal</span>
            <span className="text-neutral-light/25">/</span>
            <span>{blogPosts.length} articles</span>
            <span className="text-neutral-light/25 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-neutral-light/45">OHADA · Afrique francophone</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[32px] sm:text-[40px] md:text-[52px] lg:text-[60px] text-neutral-light max-w-4xl mb-8">
            Le journal{" "}
            <span className="font-logo text-gradient-champagne text-[80%]">Atlas</span>.
          </h1>
          <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[560px] leading-relaxed">
            Actualités, conseils pratiques et terrain — pour digitaliser votre entreprise en Afrique sans détour.
          </p>
        </div>
      </section>

      {/* FILTRES */}
      <section className="py-8 px-5 md:px-10 lg:px-16 border-b border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-baseline gap-6 md:justify-between">
          <div className="flex gap-2 flex-wrap items-baseline">
            <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mr-2">Filtrer</span>
            {blogCategories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`meta-mono text-[11px] tracking-[0.16em] uppercase px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "border-[#A9B57E] bg-[#A9B57E] text-[#0a0a0a]"
                      : "border-white/[0.12] text-neutral-light/70 hover:border-[#A9B57E]/40 hover:text-[#A9B57E]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-light/40" strokeWidth={1.8} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-4 py-2 bg-transparent border-b border-white/[0.12] text-neutral-light text-[13px] outline-none focus:border-[#A9B57E]/60 transition-colors placeholder:text-neutral-light/40 meta-mono"
            />
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="py-14 md:py-20 px-5 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          {filtered.length === 0 ? (
            <div className="py-20 text-center meta-mono text-[11px] tracking-[0.22em] uppercase text-neutral-light/45">
              Aucun article trouvé · ajustez vos filtres
            </div>
          ) : (
            <>
              {featured && (
                <ScrollReveal>
                  <BlogCard post={featured} featured index={0} />
                </ScrollReveal>
              )}

              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 mt-12">
                  {rest.map((post, i) => (
                    <ScrollReveal key={post.slug} delay={i * 60}>
                      <BlogCard post={post} index={i + 1} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* § FIN */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — Journal</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.98] text-[26px] sm:text-[36px] md:text-[44px] text-neutral-light max-w-3xl mb-10">
            <span className="italic font-light text-neutral-light/70">Recevez le suivant</span> dans votre boîte.
          </h2>
          <Link to="/contact" className="cta-arrow cta-arrow--primary">
            S'inscrire à la newsletter
          </Link>
        </div>
      </section>
    </div>
  );
}
