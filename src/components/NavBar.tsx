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
        <nav className="flex justify-between sm:justify-center sticky top-3 w-full pt-3 z-50">
            <Link href="/" className="flex items-center gap-1 ml-10 sm:ml-0 remove-tap-highlight">
                <Image
                    src="/privacy.png"
                    alt="Privacy Logo"
                    width={30}
                    height={30}
                    className="object-contain"
                />
                <p className="sm:hidden font-montserrat font-bold mt-1 text-lg text-[#333333] tracking-wide">Stakenz</p>
            </Link>

            <div className='flex w-full justify-end gap-6 sm:gap-6 xsm:gap-3'>
                <Link href="/stake" className='flex items-center rounded-[10px] px-3 sm:px-0 hover:bg-[#3333331d]'>
                    <div className='font-montserrat font-medium'>
                        Stake
                    </div>
                </Link>

                <Link href="/topup" className='flex items-center rounded-[10px] px-3 sm:px-0 hover:bg-[#3333331d]'>
                    <div className='font-montserrat font-medium'>
                        Topup
                    </div>
                </Link>

                <div className="mr-10 xsm:mr-0">
                    {isMounted && <WalletMultiButton />}
                </div>
            </div>
        </nav>
    )
}

export default NavBar;