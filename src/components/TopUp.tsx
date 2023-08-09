"use client"

import React from 'react';
import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

const TopUp = () => {
    const { publicKey } = useWallet();
    const { connection } = useConnection();

    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [amount, setAmount] = useState<number | string>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const getBalance = async () => {
        if (!publicKey) return console.error("Wallet is not initialized");

        try {
            const balance = await connection.getBalance(publicKey);
            setWalletBalance(balance);
            return balance;
        } catch (error) {
            console.error(error);
        }
    }

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setAmount(parseFloat(newValue));
    };

    const handleMaxButtonClick = () => {
        setAmount((walletBalance / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
    };

    const handleTopUpButtonClick = async () => {
        toast("Topping Up...");
        setLoading(true);
    }

    useEffect(() => {
        if (!publicKey || !connection) return console.error("Wallet or Connection is not initialized");

        getBalance().then((balance) => {
            setWalletBalance(balance as number);
        })

    }, [publicKey]);

    return (
        <section className="h-[70vh] flex items-center justify-center mx-auto overflow-hidden relative">

            <div className='flex flex-col space-y-4'>
                <div className='h-[350px] xsm:h-[370px] max-w-md border border-[#3E79FF] border-opacity-60 rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
                    <div className='flex flex-col items-start'>
                        <div className='text-2xl font-montserrat font-semibold text-[#333] flex items-center mb-6'>
                            Top Up
                        </div>
                        <p className='text-sm font-light text-[#333]'>
                            Top up your private balance to start staking privately.
                        </p>
                        <div className='flex border border-[#333] border-opacity-30 bg-white w-full rounded-[5px] p-2 my-2 mx-auto items-center justify-between hover:border-[#3E79FF] focus:border-[#3E79FF] transition-all ease-in duration-150'>
                            <div className='items-center h-8'>
                                <input type="number" step="0.0001" min="0" placeholder='0' value={amount} autoComplete='off' name="amount" id="amount" className='h-full w-full p-1 px-2 text-lg border-none focus:outline-none' onChange={handleAmountChange} />
                            </div>
                            <div className='flex flex-col justify-center items-center h-full'>
                                <div onClick={handleMaxButtonClick} className='bg-[#333] bg-opacity-20 rounded-[5px] text-xs py-1 px-2 cursor-pointer hover:bg-opacity-40 transition-all ease-in duration-150'>
                                    MAX
                                </div>
                            </div>
                        </div>
                        <div className='flex w-full items-center justify-between my-1'>
                            <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                <p className=''>Wallet Balance: </p>
                                <p className='text-[#3E79FF]'>{(walletBalance / LAMPORTS_PER_SOL).toFixed(5)} SOL</p>
                            </div>
                        </div>

                        <div className='w-full flex flex-col mx-auto mt-12 gap-1'>
                            <button className='flex items-center justify-center text-center accent-button-styling' disabled={amount === 0 || loading === true} onClick={handleTopUpButtonClick}>
                                <p>Top Up</p>
                            </button>
                            <button className='flex items-center justify-center text-center secondary-button-styling' disabled={amount === 0 || loading === true}>
                                <p>Withdraw</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    )
}

export default TopUp;