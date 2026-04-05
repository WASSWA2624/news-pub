import { getRenderableImageUrl } from "@/lib/media";
import { sanitizeExternalUrl } from "@/lib/security";

/**
 * Converts stored NewsPub structured article content into markdown and HTML
 * artifacts for publishing and editor previews.
 */
function escapeHtml(value) {
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdownList(items, formatter) {
  return items.map((item) => `- ${formatter(item)}`).join("\n");
}

function renderHtmlList(items, formatter) {
  return `<ul>${items.map((item) => `<li>${formatter(item)}</li>`).join("")}</ul>`;
}

function renderMarkdownLink(label, url) {
  const safeUrl = sanitizeExternalUrl(url);

  return safeUrl ? `[${label}](${safeUrl})` : label;
}

function renderHtmlExternalLink(label, url) {
  const safeUrl = sanitizeExternalUrl(url);
  const safeLabel = escapeHtml(label);

  return safeUrl ? `<a href="${escapeHtml(safeUrl)}">${safeLabel}</a>` : safeLabel;
}

function resolveImageSourceUrl(image) {
  return image?.url || image?.sourceUrl || image?.publicUrl || "";
}

function renderMarkdownSection(section) {
  const lines = [`## ${section.title}`];

  if (section.kind === "image_gallery") {
    if (section.intro) {
      lines.push(section.intro);
    }

    for (const image of section.images || []) {
      const imageAlt = image.alt || image.caption || section.title;
      const imageUrl = getRenderableImageUrl(resolveImageSourceUrl(image), {
        alt: imageAlt,
        caption: image.caption || section.title,
        height: image.height,
        width: image.width,
      });

      if (!imageUrl) {
        continue;
      }

      lines.push(`![${imageAlt}](${imageUrl})`);

      if (image.caption) {
        lines.push(`_${image.caption}_`);
      }
    }
  } else if (section.kind === "text") {
    lines.push(...(section.paragraphs || []));
  } else if (section.kind === "list") {
    if (section.intro) {
      lines.push(section.intro);
    }

    lines.push(
      renderMarkdownList(section.items || [], (item) =>
        item.description ? `**${item.title}**: ${item.description}` : item.title,
      ),
    );
  } else if (section.kind === "steps") {
    if (section.intro) {
      lines.push(section.intro);
    }

    lines.push(
      (section.steps || [])
        .map((step, index) => `${index + 1}. ${step.title}${step.description ? `: ${step.description}` : ""}`)
        .join("\n"),
    );
  } else if (section.kind === "faq") {
    for (const faq of section.items || []) {
      lines.push(`### ${faq.question}`);
      lines.push(faq.answer);
    }
  } else if (section.kind === "references") {
    if (section.intro) {
      lines.push(section.intro);
    }

    lines.push(
      renderMarkdownList(section.items || [], (item) => renderMarkdownLink(item.title, item.url)),
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

function renderHtmlSection(section) {
  const title = `<h2>${escapeHtml(section.title)}</h2>`;

  if (section.kind === "image_gallery") {
    const gallery = (section.images || [])
      .map((image) => {
        const imageAlt = image.alt || image.caption || section.title;
        const imageUrl = getRenderableImageUrl(resolveImageSourceUrl(image), {
          alt: imageAlt,
          caption: image.caption || section.title,
          height: image.height,
          width: image.width,
        });

        if (!imageUrl) {
          return "";
        }

        return `<figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
          imageAlt,
        )}" loading="lazy" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`;
      })
      .join("");

    return `<section>${title}${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}${gallery}</section>`;
  }

  if (section.kind === "text") {
    const body = (section.paragraphs || [])
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");

    return `<section>${title}${body}</section>`;
  }

  if (section.kind === "list") {
    return `<section>${title}${
      section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""
    }${renderHtmlList(section.items || [], (item) =>
      item.description
        ? `<strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(item.description)}`
        : escapeHtml(item.title),
    )}</section>`;
  }

  if (section.kind === "steps") {
    const steps = (section.steps || [])
      .map(
        (step) =>
          `<li><strong>${escapeHtml(step.title)}</strong>${
            step.description ? `: ${escapeHtml(step.description)}` : ""
          }</li>`,
      )
      .join("");

    return `<section>${title}${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}<ol>${steps}</ol></section>`;
  }

  if (section.kind === "faq") {
    const items = (section.items || [])
      .map(
        (faq) =>
          `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></article>`,
      )
      .join("");

    return `<section>${title}${items}</section>`;
  }

  if (section.kind === "references") {
    return `<section>${title}${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}${renderHtmlList(
      section.items || [],
      (item) => renderHtmlExternalLink(item.title, item.url),
    )}</section>`;
  }

  return `<section>${title}</section>`;
}

/** Builds the markdown version of a stored structured article. */
export function buildMarkdownFromStructuredArticle(article) {
  const parts = [`# ${article.title}`, article.excerpt];

  for (const section of article.sections || []) {
    parts.push(renderMarkdownSection(section));
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Builds the HTML version of a stored structured article. */
export function buildHtmlFromStructuredArticle(article) {
  const sections = (article.sections || []).map(renderHtmlSection).join("");

  return `<article><header><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(
    article.excerpt,
  )}</p></header>${sections}</article>`;
}
