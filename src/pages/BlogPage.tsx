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
      className={`group block bg-dark-bg2 border border-dark-border rounded-xl overflow-hidden card-hover ${
        featured ? "md:col-span-2 md:grid md:grid-cols-2" : ""
      }`}
    >
      <div className={`relative overflow-hidden ${featured ? "md:h-full h-48" : "h-48"}`}>
        <img
          src={post.cover}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-normal uppercase tracking-wider bg-gold/90 text-onyx px-2.5 py-1 rounded-md">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-5 md:p-6 flex flex-col justify-between">
        <div>
          <h3 className={`font-normal text-neutral-light group-hover:text-gold transition-colors mb-2 ${
            featured ? "text-xl md:text-2xl" : "text-base"
          }`}>
            {post.title}
          </h3>
          <p className="text-neutral-muted text-[13px] font-light leading-relaxed line-clamp-3 mb-4">
            {post.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-neutral-muted/60 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar size={12} strokeWidth={1.5} />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {post.readTime}
            </span>
          </div>
          <ArrowRight size={16} className="text-neutral-muted/40 group-hover:text-gold group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
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
      <section className="pt-24 pb-14 md:pt-28 md:pb-20 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-normal text-neutral-light mb-4">
              Le Blog <span className="font-logo text-gold">Atlas</span>
            </h1>
            <p className="text-neutral-muted text-base font-light max-w-xl mx-auto">
              Actualités, conseils pratiques et ressources pour digitaliser votre entreprise en Afrique.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-site mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex gap-2 flex-wrap justify-center">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-gold text-onyx"
                    : "bg-white/5 text-neutral-muted hover:bg-white/10 hover:text-neutral-light"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted/40" strokeWidth={1.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-[13px] outline-none focus:border-gold/50 transition-colors placeholder:text-neutral-600"
            />
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-12 md:py-16 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-muted text-sm">Aucun article trouvé.</p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <ScrollReveal>
                  <div className="mb-10">
                    <BlogCard post={featured} featured />
                  </div>
                </ScrollReveal>
              )}

              {/* Grid */}
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
      <section className="py-14 md:py-20 px-5 md:px-8 bg-dark-bg2 border-t border-dark-border text-center">
        <ScrollReveal>
          <h2 className="text-2xl font-normal text-neutral-light mb-4">Restez informé</h2>
          <p className="text-neutral-muted text-sm font-light mb-6 max-w-md mx-auto">
            Recevez nos derniers articles et conseils directement dans votre boîte mail.
          </p>
          <Link to="/contact" className="btn-gold">S'inscrire à la newsletter</Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
