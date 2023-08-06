"use client"

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import useIsMounted from '@/utils/Mount';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const NavBar = () => {
    const isMounted = useIsMounted();

    useEffect(() => {

    }, []);

    return (
        <nav className="flex flex-between sticky top-3 w-full mb-16 pt-3 z-50">
            <Link href="/" className="flex items-center gap-1 ml-10 xsm:ml-2 remove-tap-highlight">
                <Image
                    src="/privacy.png"
                    alt="Privacy Logo"
                    width={30}
                    height={30}
                    className="object-contain"
                />
                <p className="xsm:hidden font-montserrat font-bold mt-1 text-lg text-[#333333] tracking-wide">Stakenz</p>
            </Link>

            {/* Desktop Navigation */}
            <div className="sm:flex hidden">
                <div className='flex gap-3 md:gap-5'>

                </div>

            </div>

            <div className="ml-auto mr-10 xsm:mr-2">
                {isMounted && <WalletMultiButton />}
            </div>
        </nav>
    )
}

export default NavBar;