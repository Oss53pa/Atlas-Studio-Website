import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  keywords?: string;
  noindex?: boolean;
  /** Titre complet — remplace le suffixe « | Atlas Studio » (SEO piloté par la console). */
  titleOverride?: string;
}

const BASE_URL = "https://atlas-studio.org";

export function SEOHead({ title, description, canonical, ogImage, keywords, noindex, titleOverride }: SEOHeadProps) {
  const fullTitle = titleOverride?.trim() ? titleOverride.trim() : `${title} | Atlas Studio`;
  const canonicalUrl = canonical
    ? (canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`)
    : undefined;
  const image = ogImage || `${BASE_URL}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
