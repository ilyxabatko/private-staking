"use client"

import React from 'react';
import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Keypair, PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { getElusiv } from '@/utils/GetElusiv';
import { Elusiv, TokenType } from '@elusiv/sdk';

const Staking = () => {
    const DERIVE_STRING: string = "MARINADE_LIQUID_STAKE_KEY";
    const { publicKey, signTransaction, signMessage } = useWallet();
    const { connection } = useConnection();

    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [privateBalance, setPrivateBalance] = useState<BigInt>(BigInt(0));
    const [amount, setAmount] = useState<number | string>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [elusiv, setElusiv] = useState<Elusiv | null>(null);

    useEffect(() => {
        if (!publicKey || !connection) return;

        const setParams = async () => {
            const { elusiv } = await getElusiv(publicKey, signMessage);
            setElusiv(elusiv);
            toast("Instantiated Elusiv");

            setLoading(false);
        };

        getBalance();
        setParams();
    }, [publicKey]);

    useEffect(() => {
        if (elusiv !== null) {
            getPrivateBalance();
        }
    }, [elusiv]);

    const getBalance = async () => {
        try {
            const balance = publicKey && await connection.getBalance(publicKey);
            balance && setWalletBalance(balance);
        } catch (error) {
            console.error(error);
        }
    }

    const getPrivateBalance = async () => {
        try {
            const privateBalance = elusiv && await elusiv.getLatestPrivateBalance("LAMPORTS");
            privateBalance && setPrivateBalance(privateBalance);
        } catch (error) {
            console.error(error);
        }
    }

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setAmount(parseFloat(newValue));
    };

    const handleMaxButtonClick = () => {
        setAmount((Number(privateBalance) / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
    };

    return (
        <section className="h-[70vh] flex items-center justify-center mx-auto overflow-hidden relative">

            <div className='flex flex-col space-y-4'>
                <div className='h-[360px] xsm:h-[370px] min-w-[330px] max-w-lg border border-[#3E79FF] border-opacity-60 rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
                    <div className='flex flex-col items-start'>
                        <div className='text-2xl font-montserrat font-semibold text-[#333] flex items-center mb-6'>
                            Liquid Staking
                        </div>
                        <p className='text-sm font-light text-[#333]'>
                            Start liquid staking privately.
                        </p>
                        <div className={`flex border border-[#333] border-opacity-30 bg-white w-full rounded-[5px] p-2 my-2 mx-auto items-center justify-between hover:border-[#3E79FF] focus:border-[#3E79FF] transition-all ease-in duration-150 ${loading && "cursor-not-allowed opacity-50"}`}>
                            <div className='items-center h-8'>
                                <input type="number" step="0.0001" min="0" placeholder='0' value={amount} autoComplete='off' name="amount" id="amount" className='h-full w-full p-1 px-2 text-lg border-none focus:outline-none' onChange={handleAmountChange} disabled={loading} />
                            </div>
                            <div className={`flex flex-col justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                <button onClick={handleMaxButtonClick} className='bg-[#333] bg-opacity-20 rounded-[5px] text-xs py-1 px-2 cursor-pointer hover:bg-opacity-40 transition-all ease-in duration-150' disabled={loading}>
                                    MAX
                                </button>
                            </div>
                        </div>
                        <div className='flex flex-col w-full items-start justify-between my-1'>
                            <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                <p className=''>Private Balance: </p>
                                <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL)} SOL</p>
                            </div>
                        </div>

                        <div className='w-full flex flex-col mx-auto mt-12 gap-1'>
                            <button className='flex items-center justify-center text-center accent-button-styling' disabled={amount === 0 || loading === true} onClick={(e) => {  }}>
                                <p>Stake</p>
                            </button>
                            <button className='flex items-center justify-center text-center secondary-button-styling' disabled={amount === 0 || loading === true} onClick={(e) => {  }} >
                                <p>Unstake</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    )
}

export default Staking;