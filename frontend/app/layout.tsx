'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    return (
        <html lang="en">
            <body className={inter.className}>
                <GoogleOAuthProvider clientId={googleClientId}>
                    {children}
                </GoogleOAuthProvider>
            </body>
        </html>
    );
}
