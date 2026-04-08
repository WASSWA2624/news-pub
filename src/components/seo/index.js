/**
 * React helpers for rendering structured SEO data on NewsPub public pages.
 */

function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
/**
 * Renders the structured Data Script in NewsPub UI.
 */

export function StructuredDataScript({ data, id }) {
  if (!data) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
      id={id}
      type="application/ld+json"
    />
  );
}
/**
 * Renders the structured Data Bundle in NewsPub UI.
 */

export function StructuredDataBundle({ idPrefix = "structured-data", items = [] }) {
  const entries = (items || []).filter(Boolean);

  if (!entries.length) {
    return null;
  }

  return entries.map((item, index) => (
    <StructuredDataScript data={item} id={`${idPrefix}-${index + 1}`} key={`${idPrefix}-${index + 1}`} />
  ));
}
