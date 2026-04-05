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
  applicationName: "Equip Blog",
  title: {
    default: "Equip Blog",
    template: "%s | Equip Blog",
  },
  description:
    "Locale-ready scaffold for the Equip Blog public site and admin workspace.",
  icons: {
    icon: [{ type: "image/svg+xml", url: "/favicon.svg" }],
    shortcut: ["/favicon.svg"],
    apple: [{ type: "image/svg+xml", url: "/favicon.svg" }],
  },
  metadataBase: new URL(env.app.url),
  openGraph: {
    description: "Locale-ready scaffold for the Equip Blog public site and admin workspace.",
    images: [
      {
        alt: "Equip Blog",
        url: buildAbsoluteUrl("/opengraph-image"),
      },
    ],
    siteName: "Equip Blog",
    title: "Equip Blog",
    type: "website",
    url: env.app.url,
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    description: "Locale-ready scaffold for the Equip Blog public site and admin workspace.",
    images: [buildAbsoluteUrl("/twitter-image")],
    title: "Equip Blog",
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
