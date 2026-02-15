import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atlas-studio.com"),
  title: "Atlas Studio | Applications innovantes pour l'Afrique",
  description: "Atlas Studio developpe Wedo, Advist et U'Wallet - des solutions digitales transformant l'epargne et la finance pour le marche africain.",
  keywords: "startup, fintech, afrique, tontine digitale, mobile money, signature electronique, cote d'ivoire",
  openGraph: {
    title: "Atlas Studio - L'infrastructure digitale de l'Afrique",
    description: "Decouvrez nos applications innovantes",
    images: ["/og-image.jpg"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
