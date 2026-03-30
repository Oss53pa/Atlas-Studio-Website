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
        <div className="h-64 md:h-80 w-full overflow-hidden">
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/60 to-transparent" />
        </div>
      </section>

      {/* Content */}
      <section className="relative -mt-20 px-5 md:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-neutral-muted text-[13px] hover:text-gold transition-colors mb-6"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              Retour au blog
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-gold/90 text-onyx px-2.5 py-1 rounded-md">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-neutral-muted/60 text-[11px]">
                <Calendar size={12} strokeWidth={1.5} />
                {post.date}
              </span>
              <span className="flex items-center gap-1 text-neutral-muted/60 text-[11px]">
                <Clock size={12} strokeWidth={1.5} />
                {post.readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-4 leading-tight">
              {post.title}
            </h1>

            {post.author && (
              <p className="text-neutral-muted text-sm font-light mb-8">
                Par <span className="text-neutral-light font-medium">{post.author}</span>
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
              <div className="flex items-center gap-2 flex-wrap mt-10 pt-8 border-t border-dark-border">
                <Tag size={14} className="text-neutral-muted/40" strokeWidth={1.5} />
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-neutral-muted bg-white/5 px-3 py-1 rounded-full"
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
        <section className="py-14 px-5 md:px-8 bg-dark-bg2 border-t border-dark-border">
          <div className="max-w-site mx-auto">
            <ScrollReveal>
              <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">
                Articles similaires
              </div>
              <h2 className="text-2xl font-bold text-neutral-light mb-8">
                Continuer la lecture
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r, i) => (
                <ScrollReveal key={r.slug} delay={i * 80}>
                  <Link
                    to={`/blog/${r.slug}`}
                    className="group block bg-onyx border border-dark-border rounded-xl overflow-hidden card-hover"
                  >
                    <div className="h-40 overflow-hidden">
                      <img
                        src={r.cover}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-neutral-light group-hover:text-gold transition-colors mb-2 line-clamp-2">
                        {r.title}
                      </h3>
                      <p className="text-neutral-muted text-[12px] font-light line-clamp-2">
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
