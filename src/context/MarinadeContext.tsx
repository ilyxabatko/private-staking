"use client"

import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { createContext, FC, useContext, useEffect, useState } from 'react';
import { useElusiv } from './ElusivAndBalance';
import { PublicKey } from '@solana/web3.js';

export interface MarinadeContextType {
    marinade: Marinade | null;
    mSolBalance: number;
    updateMSOLBalance: () => void;
}

const MarinadeContext = createContext<MarinadeContextType | undefined>(undefined);

export const useMarinade = (): MarinadeContextType => {
    const context = useContext(MarinadeContext);
    if (!context) {
        throw new Error('useMarinade must be used within a MarinadeProvider');
    }
    return context;
};

interface MarinadeProviderProps {
    children: React.ReactNode;
}

export const MarinadeProvider: FC<MarinadeProviderProps> = ({ children }) => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const { burnerKeypair } = useElusiv();
    const [marinade, setMarinade] = useState<Marinade | null>(null);
    const [mSolBalance, setMSOLBalance] = useState<number>(0);
    const mSOLAddress = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");

    useEffect(() => {
        if (!burnerKeypair) {
            setMarinade(null);
            return;
        }

        console.log("Initializing Marinade provider...");

        // TODO: add refferal code support
        // const referralCode = new web3.PublicKey('referral pubkey');

        const config = new MarinadeConfig({ connection, publicKey: burnerKeypair.publicKey /*, referralCode*/ });
        const marinade = new Marinade(config);

        setMarinade(marinade);
    }, [burnerKeypair as web3.Keypair])

    const updateMSOLBalance = async () => {
        if (publicKey) {
            try {
                const mSOLTokenAccount = await MarinadeUtils.getAssociatedTokenAccountAddress(mSOLAddress, publicKey);
                const mSolBalance = mSOLTokenAccount && (await connection.getTokenAccountBalance(mSOLTokenAccount)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals
    
                setMSOLBalance(Number(mSolBalance));
            } catch (error) {
                console.error("An error updating mSOL balance: " + error);
            }
        }
    };

    return (
        <MarinadeContext.Provider value={{ marinade, mSolBalance, updateMSOLBalance }}>
            {children}
        </MarinadeContext.Provider>
    )
}