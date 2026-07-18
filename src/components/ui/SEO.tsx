import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  schema?: Record<string, any> | Record<string, any>[];
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage = 'https://sspharmacy.com/products/logo/logo.webp',
  ogType = 'website',
  schema,
}: SEOProps) {
  // Sync document title explicitly to ensure immediate tab title update on navigation
  useEffect(() => {
    document.title = title;
  }, [title]);

  const siteUrl = 'https://sspharmacy.com';

  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical || siteUrl} />
      <meta property="og:type" content={ogType} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {/* Dynamic JSON-LD Structured Data Schema */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </>
  );
}
