import '@/styles/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Wallet } from '@/context/Wallet';
import NavBar from '@/components/NavBar';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Solana Private Staking',
}

const montserrat = localFont({
    src: [
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Thin.woff2',
            weight: '100',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-ExtraLight.woff2',
            weight: '200',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Light.woff2',
            weight: '300',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Regular.woff2',
            weight: '400',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Medium.woff2',
            weight: '500',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-SemiBold.woff2',
            weight: '600',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Bold.woff2',
            weight: '700',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-ExtraBold.woff2',
            weight: '800',
        },
        {
            path: '../../public/fonts/MontserratAlt1/MontserratAlt1-Black.woff2',
            weight: '900',
        },
    ],
    variable: '--font-montserrat'
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${montserrat.variable} font-sans`}>
            <Wallet>
                <body className={`${inter.className} bg-gradient-to-r from-[#e3e2de] to-[#99acf3]`}>
                    <NavBar />
                    {children}
                </body>
            </Wallet>
        </html>
    )
}
