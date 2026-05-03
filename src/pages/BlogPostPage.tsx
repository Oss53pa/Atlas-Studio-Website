import { useParams, Link, Navigate } from "react-router-dom";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import { blogPosts } from "../config/blog";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const related = blogPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead
        title={post.title}
        description={post.excerpt}
        canonical={`/blog/${post.slug}`}
      />

      {/* Hero image */}
      <section className="relative pt-20 md:pt-24">
        <div className="h-72 md:h-96 w-full overflow-hidden relative">
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/80 to-onyx/30" />
          <div className="absolute inset-0 bg-dotgrid opacity-20 mix-blend-overlay pointer-events-none" />
        </div>
      </section>

      {/* Content */}
      <section className="relative -mt-28 px-5 md:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-neutral-muted text-[13px] hover:text-gold transition-colors mb-7 group"
            >
              <ArrowLeft size={14} strokeWidth={1.8} className="group-hover:-translate-x-0.5 transition-transform" />
              Retour au blog
            </Link>

            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] bg-gold/90 backdrop-blur-md text-onyx px-2.5 py-1 rounded-md shadow-lg">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-neutral-muted/70 text-[11px]">
                <Calendar size={12} strokeWidth={1.5} />
                {post.date}
              </span>
              <span className="flex items-center gap-1 text-neutral-muted/70 text-[11px]">
                <Clock size={12} strokeWidth={1.5} />
                {post.readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-gradient-light mb-5 leading-[1.12] tracking-tight">
              {post.title}
            </h1>

            {post.author && (
              <p className="text-neutral-muted text-sm font-light mb-10">
                Par <span className="text-gold font-medium">{post.author}</span>
              </p>
            )}
          </ScrollReveal>

          {/* Article body */}
          <ScrollReveal>
            <div
              className="prose-atlas"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </ScrollReveal>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <ScrollReveal>
              <div className="flex items-center gap-2 flex-wrap mt-12 pt-9 border-t border-white/[0.06]">
                <Tag size={14} className="text-gold" strokeWidth={1.8} />
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-neutral-muted font-medium bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="relative py-16 px-5 md:px-8 bg-ink-100 border-t border-white/[0.04] overflow-hidden">
          <div className="relative max-w-site mx-auto">
            <ScrollReveal>
              <div className="section-eyebrow">Articles similaires</div>
              <h2 className="text-2xl md:text-3xl font-medium text-gradient-light mb-10 tracking-tight">
                Continuer la lecture
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r, i) => (
                <ScrollReveal key={r.slug} delay={i * 80}>
                  <Link
                    to={`/blog/${r.slug}`}
                    className="group relative block bg-ink-200 border border-white/[0.06] rounded-2xl overflow-hidden card-hover"
                  >
                    <div className="h-44 overflow-hidden relative">
                      <img
                        src={r.cover}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-200/80 via-transparent to-transparent" />
                    </div>
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-neutral-light group-hover:text-gold transition-colors mb-2 line-clamp-2 tracking-tight leading-snug">
                        {r.title}
                      </h3>
                      <p className="text-neutral-muted text-[12px] font-light line-clamp-2 leading-relaxed">
                        {r.excerpt}
                      </p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
