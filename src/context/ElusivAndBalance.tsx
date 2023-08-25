"use client"

import React, { createContext, useContext, useState, useEffect, FC } from 'react';
import { Elusiv, TokenType, getTokenInfo } from '@elusiv/sdk';
import { getElusiv } from '@/utils/GetElusiv';
import { toast } from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, ConfirmedSignatureInfo, Transaction, SystemProgram } from '@solana/web3.js';
import { MarinadeUtils } from '@marinade.finance/marinade-ts-sdk';
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';

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
    solBalance: number;
    mSolBalance: number;
    burnerMSolBalance: number;
    burnerKeypair: Keypair | undefined;
    updatePrivateSOLBalance: () => Promise<void>;
    updatePrivateMSOLBalance: () => Promise<void>;
    updateSOLBalance: () => Promise<void>;
    updateMSOLBalance: () => Promise<void>;
    getBurnerMSOLBalance: () => Promise<void>;
    returnSolFromBurner: () => Promise<string | undefined>;
    returnMSolFromBurner: () => Promise<string | undefined>;
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
    const [solBalance, setSolBalance] = useState<number>(0);
    const [mSolBalance, setMSOLBalance] = useState<number>(0);
    const [burnerMSolBalance, setBurnerMSolBalance] = useState<number>(0);
    const [elusiv, setElusiv] = useState<Elusiv | null>(null);
    const [burnerKeypair, setBurnerKeypair] = useState<Keypair | undefined>(undefined);
    const { publicKey, signTransaction, signMessage } = useWallet();
    const connection = new Connection("https://rpc.helius.xyz/?api-key=94b5b7b2-e287-484a-ae84-00d542fc7b0f");
    const mSOLAddress = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");
    const DERIVE_STRING: string = "MARINADE_LIQUID_STAKE_KEY";
    const SOLANA_OUTPUT_KEY_SIZE: number = 32;

    useEffect(() => {
        const getParams = async () => {
            if (!publicKey) {
                return;
            };

            const { elusiv } = await getElusiv(publicKey, signMessage);
            setElusiv(elusiv);
        }

        getParams();
    }, [publicKey]);

    useEffect(() => {
        if (elusiv) {
            updatePrivateSOLBalance();
            updatePrivateMSOLBalance();
            getBurner();
        }
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
                    console.log("Temp solution - burner keypair: " + burnerKeypair?.secretKey);
                    setBurnerKeypair(burnerKeypair);

                    // for testing purposes

                    // const burnerKeypair = Keypair.fromSecretKey(new Uint8Array([]));
                    // console.log("Temp solution - burner pubkey: " + keypair.publicKey);
                    // setBurnerKeypair(keypair);
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

        if (amount <= 0) {
            console.error("Trying to send 0 or a negative amount from your private balance.");
            return null;
        }

        console.log("Amount inside the Send func: " + amount);
        const denominatedAmount = amount * getTokenInfo(tokenType).denomination;
        console.log("Amount after denomination: " + denominatedAmount);

        // rent for SOL account
        const rent = await connection.getMinimumBalanceForRentExemption(0);

        // calculate fee
        const fee = await elusiv.estimateSendFee({ amount: denominatedAmount, tokenType, recipient });
        const amountToSend = tokenType === "LAMPORTS" ? denominatedAmount - fee.txFee - rent : denominatedAmount - (fee.txFee);
        console.log(amountToSend + " " + tokenType + " will be sent.");

        // Build the send transaction
        const sendTx = await elusiv.buildSendTx(amountToSend, recipient, tokenType);
        // Send it off
        const tx = await elusiv.sendElusivTx(sendTx);

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

        if (amount <= 0) {
            console.error("Trying to topup 0 or a negative amount to your private balance.");
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

    const updateSOLBalance = async () => {
        try {
            const balance = publicKey && await connection.getBalance(publicKey);
            balance && setSolBalance(balance);
        } catch (error) {
            console.error("An error fetching wallet balance: " + error);
        }
    };

    const updateMSOLBalance = async () => {
        if (publicKey) {
            try {
                const mSOLTokenAccount = await MarinadeUtils.getAssociatedTokenAccountAddress(mSOLAddress, publicKey);
                const mSolBalance = mSOLTokenAccount && (await connection.getTokenAccountBalance(mSOLTokenAccount, "confirmed")).value.uiAmountString; // the balance as a string, using mint-prescribed decimals

                setMSOLBalance(Number(mSolBalance));
            } catch (error) {
                console.error("An error updating mSOL balance: " + error);
            }
        }
    };

    const getBurnerMSOLBalance = async () => {
        if (burnerKeypair) {
            try {
                const mSOLBurnerTokenAccount = await MarinadeUtils.getAssociatedTokenAccountAddress(mSOLAddress, burnerKeypair?.publicKey);
                const mSolBurnerBalance = mSOLBurnerTokenAccount && (await connection.getTokenAccountBalance(mSOLBurnerTokenAccount)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals

                console.log("Fetched burner mSOL Balance: " + mSolBurnerBalance);
                setBurnerMSolBalance(Number(mSolBurnerBalance));
            } catch (error) {
                console.error("An error getting burner's mSOL balance: " + error);
            }
        }
    };

    const returnSolFromBurner = async () => {
        if (!burnerKeypair || !elusiv) return;

        try {
            if (Number(privateBalance) > 0) {
                console.log("Sending all the burner's SOL back to the private balance...");

                // calculate rent for an on-curve account (a wallet)
                const rent = await connection.getMinimumBalanceForRentExemption(0);

                const burnerLamports = await connection.getBalance(burnerKeypair.publicKey, "confirmed");
                console.log("Burner lamports balance: " + burnerLamports);

                // calculate amount to send
                const topupFee = await elusiv.estimateTopupFee({ amount: burnerLamports, tokenType: "LAMPORTS" });
                const lamportsToSend = (burnerLamports - rent - topupFee.txFee) / LAMPORTS_PER_SOL;

                const topUpSignature = lamportsToSend && await topUpPrivateBalance(lamportsToSend, "LAMPORTS", burnerKeypair.publicKey);
                console.log(lamportsToSend + " SOL were sent back to the private balance");
                return (topUpSignature as ConfirmedSignatureInfo).signature;
            } else {
                console.log("Can't withdraw SOL from the burner, SOL balance is 0!");
            }
        } catch (error) {
            console.log("Can't withdraw SOL: " + error);
            console.log("Transferring SOL from the burner directly to the main wallet...");

            // send remaining SOL to the main wallet
            const burnerLamports = publicKey && await connection.getBalance(publicKey);

            const transaction = publicKey && burnerLamports && new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: burnerKeypair.publicKey,
                    toPubkey: publicKey,
                    // 125000 (0.000125 SOL) to send mSOL later, remaining SOL will be returned from the burner in the end
                    lamports: burnerLamports
                })
            )

            const withdrawSignature = transaction && await connection.sendTransaction(transaction, [burnerKeypair]);
            await connection.confirmTransaction(withdrawSignature as string, "finalized");
            console.log("Sol withdraw signature: " + withdrawSignature);
        }

    }

    const returnMSolFromBurner = async () => {
        if (!burnerKeypair || !elusiv) return;

        // get burner mSOL balance
        const mSOLBurnerTokenAccount = await MarinadeUtils.getAssociatedTokenAccountAddress(mSOLAddress, burnerKeypair?.publicKey);
        const mSolBurnerBalance = mSOLBurnerTokenAccount && (await connection.getTokenAccountBalance(mSOLBurnerTokenAccount)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals
        console.log("Fetched mSOL balance inside the returnMSolFromBurner function: " + mSolBurnerBalance);
        const mSolBalanceParsed = mSolBurnerBalance && (parseFloat(mSolBurnerBalance));

        try {
            if (Number(mSolBalanceParsed) > 0) {
                console.log("Sending all the burner's mSOL back to the private balance...");

                // calculate fees to log
                const topupFee = (await elusiv.estimateTopupFee({ amount: (Number(mSolBalanceParsed) * getTokenInfo("mSOL").denomination), tokenType: "mSOL" })).txFee;
                console.log("Topup fee for returning mSOL from burner: " + topupFee);
                const mSolToSend = Number(mSolBalanceParsed) - (topupFee / getTokenInfo("mSOL").denomination);

                const topUpSignature = await topUpPrivateBalance(mSolToSend, "mSOL", burnerKeypair.publicKey);
                console.log("~" + mSolToSend + " mSOL were sent back to the private balance");
                return (topUpSignature as ConfirmedSignatureInfo).signature;
            } else {
                console.log("Can't withdraw mSOL from the burner, mSOL balance is 0!");
            }
        } catch (error) {
            console.log("Can't withdraw mSOL: " + error);
            console.log("Transferring mSOL from the burner directly to the main wallet...");

            const transaction = publicKey && new Transaction().add(
                Token.createTransferInstruction(
                    TOKEN_PROGRAM_ID,
                    mSOLBurnerTokenAccount,
                    publicKey,
                    burnerKeypair.publicKey,
                    [],
                    Number(mSolBalanceParsed) * getTokenInfo("mSOL").denomination
                )
            );

            const withdrawSignature = transaction && await connection.sendTransaction(transaction, [burnerKeypair]);
            await connection.confirmTransaction(withdrawSignature as string, "finalized");
            console.log("mSOL withdraw signature: " + withdrawSignature);
        }
    }

    return (
        <ElusivContext.Provider value={{ privateBalance, privateMSOLBalance, elusiv, updatePrivateSOLBalance, updatePrivateMSOLBalance, updateMSOLBalance, updateSOLBalance, publicKey, connection, burnerKeypair, sendFromPrivateBalance, topUpPrivateBalance, returnSolFromBurner, returnMSolFromBurner, getBurnerMSOLBalance, solBalance, mSolBalance, burnerMSolBalance }}>
            {children}
        </ElusivContext.Provider>
    );
};
