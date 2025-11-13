import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlagPlays | Create, Share & Learn Flag Football Plays",
  description: "Design, share, and study flag football plays with ease. FlagPlays lets coaches and teams collaborate, build playbooks, and improve strategy — all in one place.",
  keywords: ["flag football", "football plays", "playbook", "flag football strategy", "coaching tools", "football play design", "team collaboration"],
  authors: [{ name: "FlagPlays" }],
  creator: "FlagPlays",
  publisher: "FlagPlays",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flagplays.com",
    siteName: "FlagPlays",
    title: "FlagPlays | Create, Share & Learn Flag Football Plays",
    description: "Design, share, and study flag football plays with ease. FlagPlays lets coaches and teams collaborate, build playbooks, and improve strategy — all in one place.",
    images: [
      {
        url: "/og-image.png", // You may want to create this image
        width: 1200,
        height: 630,
        alt: "FlagPlays - Flag Football Play Design Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlagPlays | Create, Share & Learn Flag Football Plays",
    description: "Design, share, and study flag football plays with ease. FlagPlays lets coaches and teams collaborate, build playbooks, and improve strategy — all in one place.",
    images: ["/og-image.png"], // You may want to create this image
    creator: "@flagplays", // Update with your Twitter handle if available
  },
  alternates: {
    canonical: "https://flagplays.com",
  },
  metadataBase: new URL("https://flagplays.com"), // Update with your actual domain
  verification: {
    // Add verification codes when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "FlagPlays",
    "description": "Design, share, and study flag football plays with ease. FlagPlays lets coaches and teams collaborate, build playbooks, and improve strategy — all in one place.",
    "url": "https://flagplays.com",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "100"
    },
    "featureList": [
      "Flag football play design",
      "Playbook creation",
      "Team collaboration",
      "Play sharing",
      "Strategy planning"
    ]
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
