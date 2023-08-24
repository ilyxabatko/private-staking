"use client"

import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { createContext, FC, useContext, useEffect, useState } from 'react';
import { useElusiv } from './ElusivAndBalance';
import { ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';

export interface MarinadeContextType {
    marinade: Marinade | null;
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
    const { publicKey } = useWallet();
    const { burnerKeypair, elusiv, privateMSOLBalance, topUpPrivateBalance, connection } = useElusiv();
    const [marinade, setMarinade] = useState<Marinade | null>(null);

    useEffect(() => {
        if (!burnerKeypair || !connection) {
            setMarinade(null);
            return;
        }

        console.log("Initializing Marinade provider...");

        // TODO: add refferal code support
        // const referralCode = new web3.PublicKey('referral pubkey');

        const config = new MarinadeConfig({ connection, publicKey: burnerKeypair.publicKey /*, referralCode*/ });
        const marinade = new Marinade(config);

        setMarinade(marinade);
    }, [burnerKeypair as web3.Keypair]);

    return (
        <MarinadeContext.Provider value={{ marinade }}>
            {children}
        </MarinadeContext.Provider>
    )
}