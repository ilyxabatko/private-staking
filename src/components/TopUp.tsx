"use client"

import React, { HTMLProps } from 'react';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL, Keypair, PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { TokenType } from '@elusiv/sdk';
import { useElusiv } from '@/context/ElusivAndBalance';
import { Tab, Menu } from '@headlessui/react'
import { useMarinade } from '@/context/MarinadeContext';
import Link from 'next/link';

const TopUp = () => {
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [amount, setAmount] = useState<number | string>(0);
    const [withdrawAmount, setWithdrawAmount] = useState<number | string>(0);
    const [inputTokenType, setInputTokenType] = useState<TokenType>("LAMPORTS");
    const [loading, setLoading] = useState<boolean>(false);
    const { privateBalance, privateMSOLBalance, elusiv, updatePrivateSOLBalance, publicKey, connection, sendFromPrivateBalance, topUpPrivateBalance } = useElusiv();
    const { mSolBalance, updateMSOLBalance } = useMarinade();

    useEffect(() => {
        if (!publicKey || !connection) return;
        getBalance();
        updatePrivateSOLBalance();
        updateMSOLBalance();
    }, [publicKey]);

    const getBalance = async () => {
        try {
            const balance = publicKey && await connection.getBalance(publicKey, "confirmed");
            balance && setWalletBalance(balance);
        } catch (error) {
            console.error("An error fetching wallet balance: " + error);
        }
    }

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setAmount(parseFloat(newValue));
    };

    const handleWithdrawAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setWithdrawAmount(parseFloat(newValue));
    };

    const handleMaxButtonClick = () => {
        if (inputTokenType === "LAMPORTS") {
            if (Number(walletBalance) == 0 || !walletBalance) {
                setAmount(Number(0));
            } else {
                setAmount((Number(walletBalance) / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
            }
        } else {
            if (Number(mSolBalance) == 0 || !mSolBalance) {
                setAmount(Number(0));
            } else {
                setAmount(Number(mSolBalance).toFixed(5));
            }
        }
    };

    const handleWithdrawMaxButtonClick = () => {
        if (inputTokenType === "LAMPORTS") {
            if (Number(privateBalance) == 0 || !privateBalance) {
                setWithdrawAmount(Number(0));
            } else {
                setWithdrawAmount((Number(privateBalance) / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
            }
        } else {
            if (Number(privateMSOLBalance) == 0 || !privateMSOLBalance) {
                setWithdrawAmount(Number(0));
            } else {
                setWithdrawAmount(Number(privateMSOLBalance).toFixed(5));
            }
        }
    };

    const handleTopUpButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Topping Up...");
        setLoading(true);

        if (walletBalance > 0 && publicKey) {
            try {
                const sig = elusiv && await topUpPrivateBalance(amount as number, inputTokenType);

                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Topup details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig?.signature}?cluster=devnet`}>
                            click
                        </Link>
                    </span>
                ), { duration: 5000 });
                await getBalance();
            } catch (error) {
                toast.error(`Topup error, check the console for details.`, {
                    duration: 5000, style: {
                        overflow: "auto",
                        padding: "16px"
                    }
                });
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
    }

    const handleSendButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Sending private balance tokens...");
        setLoading(true);

        if (Number(privateBalance) > 0) {
            try {
                const sig = elusiv && publicKey && await sendFromPrivateBalance(publicKey, withdrawAmount as number, inputTokenType);

                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Transfer details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig?.signature}?cluster=devnet`}>
                            click
                        </Link>
                    </span>
                ), { duration: 5000 });
                await getBalance();
            } catch (error) {
                toast.error(`Transfer from private balance error, check the console for details`, {
                    duration: 5000, style: {
                        overflow: "auto",
                        padding: "16px"
                    }
                });
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <section className="h-[70vh] flex items-center justify-center mx-auto overflow-hidden relative">

            <div className='flex min-w-[320px] w-[400px] flex-col space-y-4'>

                <Tab.Group>

                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                        <Tab
                            className={({ selected }) =>
                                `${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'} 
                            w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-[#3E79FF] 
                            focus:outline-none`
                            }
                        > Top Up
                        </Tab>
                        <Tab
                            className={({ selected }) =>
                                `${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'} 
                            w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-[#3E79FF] 
                             focus:outline-none`
                            }
                        > Withdraw
                        </Tab>
                    </Tab.List>

                    {/* TOP UP PANEL */}
                    <Tab.Panels>
                        <Tab.Panel>
                            <div className='h-[330px] rounded-[10px] bg-white flex flex-col justify-start p-4 py-6'>
                                <div className='flex flex-col items-start'>
                                    <div className='text-lg font-semibold text-[#333] flex items-center mb-6'>
                                        Send to the private balance
                                    </div>
                                    <div className={`flex border border-[#333] border-opacity-30 bg-white w-full rounded-[5px] p-2 my-2 mx-auto items-center justify-between hover:border-[#3E79FF] focus:border-[#3E79FF] transition-all ease-in duration-150 ${loading && "cursor-not-allowed opacity-50"}`}>
                                        <div className='flex w-full items-center h-8'>
                                            <input type="number" step="0.0001" min="0" placeholder='0' value={amount} autoComplete='off' name="amount" id="amount" className='flex h-full w-full p-1 px-2 text-lg border-none focus:outline-none' onChange={handleAmountChange} disabled={loading} />
                                        </div>
                                        <div className={`flex flex-col justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                            <button onClick={handleMaxButtonClick} className='bg-[#333] bg-opacity-20 rounded-[5px] text-xs py-1 px-2 cursor-pointer hover:bg-opacity-40 transition-all ease-in duration-150' disabled={loading}>
                                                MAX
                                            </button>
                                        </div>

                                        <div className={`flex flex-col ml-3 justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                            <Menu as="div" className="relative inline-block text-left">
                                                <Menu.Button className="inline-flex w-full justify-center rounded-[5px] px-2 py-1 text-lg font-medium text-[#3E79FF] hover:bg-opacity-30 focus:outline-none">{inputTokenType === "LAMPORTS" ? "SOL" : inputTokenType}</Menu.Button>
                                                <Menu.Items className="absolute right-0 mt-2 w-28 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                    <div className='p-2'>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <div
                                                                    className={`${active && 'bg-[#779ef8]'} rounded-md px-2 py-2 text-sm`}
                                                                    onClick={() => setInputTokenType("LAMPORTS")}
                                                                >
                                                                    SOL
                                                                </div>
                                                            )}
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <div
                                                                    className={`${active && 'bg-[#779ef8]'} flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                    onClick={() => setInputTokenType("mSOL")}
                                                                >
                                                                    mSOL
                                                                </div>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                </Menu.Items>
                                            </Menu>
                                        </div>

                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between my-1'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Wallet SOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(walletBalance / LAMPORTS_PER_SOL)} SOL</p>
                                        </div>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Wallet mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{mSolBalance} mSOL</p>
                                        </div>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private SOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL)} SOL</p>
                                        </div>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{Number(privateMSOLBalance)} mSOL</p>
                                        </div>
                                    </div>

                                    <div className='w-full flex flex-col mx-auto mt-10 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={amount === 0 || loading === true} onClick={(e) => { handleTopUpButtonClick(e) }}>
                                            <p>Top Up</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* WITHDRAW PANEL */}
                        <Tab.Panel>
                            <div className='h-[310px] w-full rounded-[10px] bg-white flex flex-col justify-start p-4 py-6'>
                                <div className='flex flex-col items-start'>
                                    <div className='text-lg font-semibold text-[#333] flex items-center mb-6'>
                                        Withdraw from the private balance
                                    </div>
                                    <div className={`flex border border-[#333] border-opacity-30 bg-white w-full rounded-[5px] p-2 my-2 mx-auto items-center justify-between hover:border-[#3E79FF] focus:border-[#3E79FF] transition-all ease-in duration-150 ${loading && "cursor-not-allowed opacity-50"}`}>
                                        <div className='items-center h-8'>
                                            <input type="number" step="0.0001" min="0" placeholder='0' value={withdrawAmount} autoComplete='off' name="amount" id="amount" className='h-full w-full p-1 px-2 text-lg border-none focus:outline-none' onChange={handleWithdrawAmountChange} disabled={loading} />
                                        </div>
                                        <div className={`flex flex-col justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                            <button onClick={handleWithdrawMaxButtonClick} className='bg-[#333] bg-opacity-20 rounded-[5px] text-xs py-1 px-2 cursor-pointer hover:bg-opacity-40 transition-all ease-in duration-150' disabled={loading}>
                                                MAX
                                            </button>
                                        </div>
                                        <div className={`flex flex-col ml-3 justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                            <Menu as="div" className="relative inline-block text-left">
                                                <Menu.Button className="inline-flex w-full justify-center rounded-[5px] px-2 py-1 text-lg font-medium text-[#3E79FF] hover:bg-opacity-30 focus:outline-none">{inputTokenType === "LAMPORTS" ? "SOL" : inputTokenType}</Menu.Button>
                                                <Menu.Items className="absolute right-0 mt-2 w-28 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                    <div className='p-2'>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <div
                                                                    className={`${active && 'bg-[#779ef8]'} rounded-md px-2 py-2 text-sm`}
                                                                    onClick={() => setInputTokenType("LAMPORTS")}
                                                                >
                                                                    SOL
                                                                </div>
                                                            )}
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <div
                                                                    className={`${active && 'bg-[#779ef8]'} flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                                    onClick={() => setInputTokenType("mSOL")}
                                                                >
                                                                    mSOL
                                                                </div>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                </Menu.Items>
                                            </Menu>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between my-1'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private SOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL)} SOL</p>
                                        </div>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{Number(privateMSOLBalance)} mSOL</p>
                                        </div>
                                    </div>
                                    <div className='w-full flex flex-col mx-auto mt-12 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={withdrawAmount == 0 || loading === true} onClick={(e) => { handleSendButtonClick(e) }}>
                                            <p>Withdraw</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>

                </Tab.Group>
            </div>

        </section>
    )
}

export default TopUp;