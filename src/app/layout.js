/**
 * Root application layout for NewsPub metadata, providers, and styled-components rendering.
 */

import AppProviders from "@/components/common/app-providers";
import { sharedEnv } from "@/lib/env/shared";
import StyledRegistry from "@/styles/styled-registry";

export const metadata = {
  applicationName: "NewsPub",
  title: {
    default: "NewsPub",
    template: "%s | NewsPub",
  },
  description:
    "News ingestion, review, scheduling, and publishing for website and social destinations.",
  icons: {
    apple: [{ type: "image/svg+xml", url: "/favicon.svg" }],
    icon: [{ type: "image/svg+xml", url: "/favicon.svg" }],
    shortcut: ["/favicon.svg"],
  },
  metadataBase: new URL(sharedEnv.app.url),
  openGraph: {
    description:
      "News ingestion, review, scheduling, and publishing for website and social destinations.",
    images: [
      {
        alt: "NewsPub",
        url: "/opengraph-image",
      },
    ],
    siteName: "NewsPub",
    title: "NewsPub",
    type: "website",
    url: sharedEnv.app.url,
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    description:
      "News ingestion, review, scheduling, and publishing for website and social destinations.",
    images: ["/twitter-image"],
    title: "NewsPub",
  },
};

export const viewport = {
  themeColor: "#edf4f3",
};

/**
 * Wraps the NewsPub app with global providers, fonts, and document metadata.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StyledRegistry>
          <AppProviders>{children}</AppProviders>
        </StyledRegistry>
      </body>
    </html>
  );
}
