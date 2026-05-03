import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import { blogPosts, type BlogPost, blogCategories } from "../config/blog";

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group relative block bg-ink-100 border border-white/[0.06] rounded-2xl overflow-hidden card-hover ${
        featured ? "md:col-span-2 md:grid md:grid-cols-2" : ""
      }`}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px z-10"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.4) 50%, transparent 100%)" }}
      />
      <div className={`relative overflow-hidden ${featured ? "md:h-full h-52" : "h-52"}`}>
        <img
          src={post.cover}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {/* Gradient overlay for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-100 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] bg-gold/90 backdrop-blur-md text-onyx px-2.5 py-1 rounded-md shadow-lg">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-6 md:p-7 flex flex-col justify-between">
        <div>
          <h3 className={`font-semibold text-neutral-light group-hover:text-gold transition-colors duration-300 mb-3 tracking-tight leading-snug ${
            featured ? "text-xl md:text-2xl" : "text-base md:text-lg"
          }`}>
            {post.title}
          </h3>
          <p className="text-neutral-muted text-[13px] font-light leading-relaxed line-clamp-3 mb-5">
            {post.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-neutral-muted/70 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar size={12} strokeWidth={1.5} />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {post.readTime}
            </span>
          </div>
          <ArrowRight size={16} className="text-neutral-muted/40 group-hover:text-gold group-hover:translate-x-1 transition-all duration-300" strokeWidth={1.8} />
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
      const matchSearch =
        !search ||
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

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-32 md:pb-20 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Le Blog</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gradient-light mb-5 tracking-tight leading-[1.05]">
              Le Blog <span className="font-logo text-gradient-champagne">Atlas</span>
            </h1>
            <p className="text-neutral-muted text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
              Actualités, conseils pratiques et ressources pour digitaliser votre entreprise en Afrique.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 px-5 md:px-8 border-b border-white/[0.04] bg-ink-100">
        <div className="max-w-site mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex gap-2 flex-wrap justify-center">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                  activeCategory === cat
                    ? "btn-gold !py-2 !px-4 !text-[13px] !rounded-lg"
                    : "border border-white/[0.08] text-neutral-muted hover:border-gold/40 hover:text-gold hover:bg-white/[0.03] backdrop-blur-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted/50" strokeWidth={1.8} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-9 pr-4 py-2.5 bg-ink-200 border border-white/[0.08] rounded-lg text-neutral-light text-[13px] outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all duration-200 placeholder:text-neutral-muted/50"
            />
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-14 md:py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-muted text-sm font-light">Aucun article trouvé.</p>
            </div>
          ) : (
            <>
              {featured && (
                <ScrollReveal>
                  <div className="mb-10">
                    <BlogCard post={featured} featured />
                  </div>
                </ScrollReveal>
              )}

              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post, i) => (
                    <ScrollReveal key={post.slug} delay={i * 80}>
                      <BlogCard post={post} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Newsletter */}
      <section className="relative py-16 md:py-20 px-5 md:px-8 bg-ink-100 border-t border-white/[0.04] text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] glow-gold opacity-50 pointer-events-none" />
        <div className="relative">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-semibold text-gradient-light mb-4 tracking-tight">Restez informé</h2>
            <p className="text-neutral-muted text-sm font-light mb-7 max-w-md mx-auto">
              Recevez nos derniers articles et conseils directement dans votre boîte mail.
            </p>
            <Link to="/contact" className="btn-gold">
              S'inscrire à la newsletter
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
