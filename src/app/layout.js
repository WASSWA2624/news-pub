import { Manrope, Newsreader } from "next/font/google";

import AppProviders from "@/components/common/app-providers";
import { env } from "@/lib/env/server";
import { buildAbsoluteUrl } from "@/lib/seo";
import StyledRegistry from "@/styles/styled-registry";

const uiFont = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ui",
});

const editorialFont = Newsreader({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-editorial",
});

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
  metadataBase: new URL(env.app.url),
  openGraph: {
    description:
      "News ingestion, review, scheduling, and publishing for website and social destinations.",
    images: [
      {
        alt: "NewsPub",
        url: buildAbsoluteUrl("/opengraph-image"),
      },
    ],
    siteName: "NewsPub",
    title: "NewsPub",
    type: "website",
    url: env.app.url,
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    description:
      "News ingestion, review, scheduling, and publishing for website and social destinations.",
    images: [buildAbsoluteUrl("/twitter-image")],
    title: "NewsPub",
  },
};

export const viewport = {
  themeColor: "#e8f1ff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${uiFont.variable} ${editorialFont.variable}`}>
        <StyledRegistry>
          <AppProviders>{children}</AppProviders>
        </StyledRegistry>
      </body>
    </html>
  );
}
