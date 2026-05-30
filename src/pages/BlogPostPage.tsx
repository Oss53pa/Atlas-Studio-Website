import { useParams, Link, Navigate } from "react-router-dom";
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
      <SEOHead title={post.title} description={post.excerpt} canonical={`/blog/${post.slug}`} />

      {/* HERO — image + meta editoriale */}
      <section className="relative pt-24 md:pt-28 px-5 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <Link to="/blog" className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55 hover:text-[#A9B57E] transition-colors inline-flex items-baseline gap-2 mb-10">
            <span>←</span><span>Retour au journal</span>
          </Link>

          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase flex items-baseline gap-3 md:gap-4 mb-10 flex-wrap text-[#A9B57E]">
            <span>§ Article</span>
            <span className="text-neutral-light/25">/</span>
            <span>{post.category}</span>
            <span className="text-neutral-light/25">/</span>
            <span className="text-neutral-light/55">{post.date}</span>
            <span className="text-neutral-light/25">/</span>
            <span className="text-neutral-light/55">{post.readTime}</span>
          </div>

          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[36px] sm:text-[52px] md:text-[72px] lg:text-[88px] text-neutral-light max-w-5xl mb-10">
            {post.title}
          </h1>

          {post.author && (
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 mb-10">
              Par <span className="text-[#A9B57E] ml-2">{post.author}</span>
            </div>
          )}

          <div className="relative w-full h-72 md:h-[480px] overflow-hidden rounded-xl">
            <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-onyx/40" />
          </div>
        </div>
      </section>

      {/* CORPS DE L'ARTICLE */}
      <section className="relative px-5 md:px-10 lg:px-16 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div
              className="prose-atlas"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </ScrollReveal>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-16 pt-10 border-t border-white/[0.06]">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                § Tags
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 meta-mono text-[11px] tracking-[0.16em] uppercase text-neutral-light/65">
                {post.tags.map((tag, i, arr) => (
                  <span key={tag} className="inline-flex items-center">
                    {tag}
                    {i < arr.length - 1 && <span className="text-[#A9B57E]/40 ml-4">·</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SUITE — articles liés */}
      {related.length > 0 && (
        <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
          <div className="relative max-w-[1280px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
              <div className="lg:col-span-8">
                <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                  § Suite
                </div>
                <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[32px] md:text-[44px] lg:text-[52px] text-neutral-light">
                  Continuer la lecture
                </h2>
              </div>
              <div className="lg:col-span-4 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45">
                Catégorie · {post.category}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10">
              {related.map((r, i) => (
                <ScrollReveal key={r.slug} delay={i * 80}>
                  <Link to={`/blog/${r.slug}`} className="group block border-t border-white/[0.06] pt-6">
                    <div className="relative h-44 overflow-hidden rounded-lg mb-5">
                      <img src={r.cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-3 tabular-nums">
                      {String(i + 1).padStart(2, "0")} · {r.readTime}
                    </div>
                    <h3 className="font-display font-medium text-[18px] md:text-[20px] text-neutral-light group-hover:text-[#D6DDB3] transition-colors mb-3 leading-snug tracking-tight">
                      {r.title}
                    </h3>
                    <p className="text-[13px] text-neutral-muted font-light line-clamp-2 leading-relaxed">
                      {r.excerpt}
                    </p>
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
