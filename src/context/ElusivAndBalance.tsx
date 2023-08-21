"use client"

import React, { createContext, useContext, useState, useEffect, FC } from 'react';
import { Elusiv, TokenType, TopupTxData, SendTxData, getTokenInfo, airdropToken } from '@elusiv/sdk';
import { getElusiv } from '@/utils/GetElusiv';
import { toast } from 'react-hot-toast';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, ConfirmedSignatureInfo, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token, AccountLayout } from '@solana/spl-token';
import { MarinadeUtils } from '@marinade.finance/marinade-ts-sdk';

export const useElusiv = (): ElusivContextType => {
    const context = useContext(ElusivContext);
    if (!context) {
        throw new Error('useElusiv must be used within a BalanceProvider');
    }
    return context;
};

type Props = {
    children?: React.ReactNode
}

interface ElusivContextType {
    privateBalance: BigInt,
    privateMSOLBalance: BigInt,
    elusiv: Elusiv | null;
    publicKey: PublicKey | null;
    connection: Connection;
    burnerKeypair: Keypair | undefined;
    updatePrivateSOLBalance: () => void;
    updatePrivateMSOLBalance: () => void;
    returnSolFromBurner: () => void;
    sendFromPrivateBalance: (
        recipient: PublicKey,
        amount: number,
        tokenType: TokenType
    ) => Promise<ConfirmedSignatureInfo | null>;
    topUpPrivateBalance: (
        amount: number,
        tokenType: TokenType,
        sender?: PublicKey
    ) => Promise<ConfirmedSignatureInfo | null>;
}

const ElusivContext = createContext<ElusivContextType | undefined>(undefined);

export const ElusivProvider: FC<Props> = ({ children }) => {
    const [privateBalance, setPrivateBalance] = useState<BigInt>(BigInt(0));
    const [privateMSOLBalance, setPrivateMSOLBalance] = useState<BigInt>(BigInt(0));
    const [elusiv, setElusiv] = useState<Elusiv | null>(null);
    const [burnerKeypair, setBurnerKeypair] = useState<Keypair | undefined>(undefined);
    const { publicKey, signTransaction, signMessage } = useWallet();
    const { connection } = useConnection();
    const DERIVE_STRING: string = "MARINADE_LIQUID_STAKE_KEY";
    const SOLANA_OUTPUT_KEY_SIZE: number = 32;

    useEffect(() => {
        const getParams = async () => {
            if (!publicKey) {
                return;
            };

            const { elusiv } = await getElusiv(publicKey, signMessage);
            setElusiv(elusiv);
            updatePrivateSOLBalance();
            updatePrivateMSOLBalance();
            toast("Instantiated Elusiv");
        }

        getParams();
    }, [publicKey]);

    useEffect(() => {
        updatePrivateSOLBalance();
        updatePrivateMSOLBalance();
        getBurner();
    }, [elusiv])

    const getTimeStamp = async () => {
        const slot = await connection.getSlot({ commitment: "confirmed" });
        const timestamp = await connection.getBlockTime(slot);
        return timestamp;
    }

    const getBurner = async () => {
        try {
            if (elusiv) {
                const currentTimeStamp = await getTimeStamp();
                if (currentTimeStamp) {
                    const burnerArray = await elusiv?.deriveKeyExternal(DERIVE_STRING, currentTimeStamp, SOLANA_OUTPUT_KEY_SIZE);

                    const burnerKeypair = Keypair.fromSeed(burnerArray);

                    console.log("Burner pubkey: " + burnerKeypair?.publicKey.toBase58());
                    setBurnerKeypair(burnerKeypair);
                }
            }
        } catch (error) {
            console.log("Error getting a burner keypair: " + error);
        }
    }

    const sendFromPrivateBalance = async (
        recipient: PublicKey,
        amount: number,
        tokenType: TokenType
    ) => {
        if (!elusiv) {
            console.error("Elusiv is not initialized");
            return null;
        }

        console.log("Amount inside the Send func: " + amount);
        const denominatedAmount = amount * getTokenInfo(tokenType).denomination;
        console.log("Amount after denomination: " + denominatedAmount);

        // calculate fee
        // const fee = await elusiv.estimateSendFee({ amount: denominatedAmount, tokenType, recipient });
        // const amountToSend = denominatedAmount - fee.txFee * 1.1; 
        // console.log(amountToSend + "will be sent");

        // Build the send transaction
        const sendTx = await elusiv.buildSendTx(denominatedAmount, recipient, tokenType);
        // Send it off
        const tx = await elusiv.sendElusivTx(sendTx);

        // update balances
        await updatePrivateSOLBalance();

        console.log("Transfer transaction info: ", tx);
        return tx;
    };

    const topUpPrivateBalance = async (
        amount: number,
        tokenType: TokenType,
        sender?: PublicKey
    ) => {
        if (!elusiv) {
            console.error("Elusiv is not initialized");
            return null;
        }

        // clean amount
        console.log(tokenType + " amount inside the Topup func: " + amount);
        const amountToSend = amount * getTokenInfo(tokenType).denomination;
        console.log("Amount after denomination: " + amountToSend);

        // Build a topup transaction
        const topupTx = sender ? await elusiv.buildTopUpTx(amountToSend, tokenType, undefined, undefined, sender) : await elusiv.buildTopUpTx(amountToSend, tokenType);

        // Sign it (only needed for topups, as we're topping up from our public key there)
        const signedTx = sender ? burnerKeypair && topupTx.tx.partialSign(burnerKeypair) : signTransaction && await signTransaction(topupTx.tx);
        signedTx && topupTx.setSignedTx(signedTx);

        // Send it off
        const tx = await elusiv.sendElusivTx(topupTx);

        // update balances
        await updatePrivateSOLBalance();

        console.log("Topup transaction info: ", tx);
        return tx;
    };

    const updatePrivateSOLBalance = async () => {
        try {
            const privateBalance = elusiv && await elusiv.getLatestPrivateBalance("LAMPORTS");
            privateBalance && setPrivateBalance(privateBalance);
        } catch (error) {
            console.error("An error updating private SOL balance occured: " + error);
        }
    };

    const updatePrivateMSOLBalance = async () => {
        try {
            const privateMSOLBalance = elusiv && await elusiv.getLatestPrivateBalance("mSOL");
            privateMSOLBalance && setPrivateMSOLBalance(privateMSOLBalance);
        } catch (error) {
            console.error("An error updating private mSOL balance occured: " + error);
        }
    };

    const returnSolFromBurner = async () => {
        if (!burnerKeypair || !elusiv) return;

        // calculate rent for an on-curve account (a wallet)
        const rent = await connection.getMinimumBalanceForRentExemption(0);

        // send token
        console.log("Sending all the burner's SOL back to the private balance...");

        const burnerLamports = await connection.getBalance(burnerKeypair.publicKey);
        console.log("Burner lamports balance: " + burnerLamports);

        // calculate amount to send
        const topupFee = await elusiv.estimateTopupFee({ amount: burnerLamports, tokenType: "LAMPORTS" });
        const lamportsToSend = (burnerLamports - rent - topupFee.txFee) / LAMPORTS_PER_SOL;

        const topUpSignature = lamportsToSend && await topUpPrivateBalance(lamportsToSend, "LAMPORTS", burnerKeypair.publicKey);
        console.log(lamportsToSend + " SOL were sent back to the private balance");
        return (topUpSignature as ConfirmedSignatureInfo).signature;
    }

    return (
        <ElusivContext.Provider value={{ privateBalance, privateMSOLBalance, elusiv, updatePrivateSOLBalance, updatePrivateMSOLBalance, publicKey, connection, burnerKeypair, sendFromPrivateBalance, topUpPrivateBalance, returnSolFromBurner }}>
            {children}
        </ElusivContext.Provider>
    );
};
