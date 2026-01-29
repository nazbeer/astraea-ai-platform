import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Astraea AI',
        template: '%s | Astraea AI',
    },
    description: 'Astraea AI platform for chat, models, and agent workflows.',
    applicationName: 'Astraea AI',
    icons: {
        icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
        shortcut: ['/icon.svg'],
    },
    openGraph: {
        type: 'website',
        siteName: 'Astraea AI',
    },
    twitter: {
        card: 'summary_large_image',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers googleClientId={googleClientId}>{children}</Providers>
            </body>
        </html>
    );
}
