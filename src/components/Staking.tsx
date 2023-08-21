"use client"

import React from 'react';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { useElusiv } from '@/context/ElusivAndBalance';
import { useMarinade } from '@/context/MarinadeContext';
import { MarinadeUtils } from '@marinade.finance/marinade-ts-sdk';
import { Tab } from '@headlessui/react'
import Link from 'next/link';

const Staking = () => {
    const { signMessage, sendTransaction } = useWallet();

    const [amount, setAmount] = useState<number | string>(0);
    const [unstakeAmount, setUnstakeAmount] = useState<number | string>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const { privateBalance, privateMSOLBalance, elusiv, updatePrivateSOLBalance, updatePrivateMSOLBalance, publicKey, connection, burnerKeypair, sendFromPrivateBalance, topUpPrivateBalance, returnSolFromBurner } = useElusiv();
    const { marinade } = useMarinade();

    const depositStake = async () => {
        if (!marinade || !elusiv || !burnerKeypair || !publicKey) {
            return;
        }

        // deposit a bit of SOL to a burner to initialize it:
        const rent = await connection.getMinimumBalanceForRentExemption(0, "confirmed");

        const transferSolTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: burnerKeypair.publicKey,
                // 125000 (0.000125 SOL) to send mSOL later, remaining SOL will be returned from the burner in the end
                lamports: (rent + 50_000_000)
            })
        );

        await sendTransaction(transferSolTx, connection);

        // build and send a Transfer tx (from private balance to a burner address)
        if (Number(privateBalance) > 0) {
            const sendFee = (await elusiv.estimateSendFee({ amount: Number(amount), tokenType: "LAMPORTS", recipient: burnerKeypair.publicKey })).txFee / LAMPORTS_PER_SOL;
            await sendFromPrivateBalance(burnerKeypair.publicKey, (Number(amount) + sendFee), "LAMPORTS");
        }

        // build a deposit tx (from a burner to a stake address)
        const { transaction, associatedMSolTokenAccountAddress } = await marinade.deposit(MarinadeUtils.solToLamports(Number(amount)));

        // send and confirm a deposit tx
        const depositSignature = await connection.sendTransaction(transaction, [burnerKeypair]);
        await connection.confirmTransaction(depositSignature, "finalized");
        console.log("Deposit signature: " + depositSignature);

        // topup private balance with mSOL from a burner
        console.log("Sending mSOL to the private balance...");

        const mSolBalance = (await connection.getTokenAccountBalance(associatedMSolTokenAccountAddress)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals
        console.log("Burner mSOL balance: " + Number(mSolBalance));
        const mSolBalanceParsed = mSolBalance && parseFloat(mSolBalance);

        try {
            const topUpSignature = mSolBalance && await topUpPrivateBalance(mSolBalanceParsed as number, "mSOL", burnerKeypair.publicKey).then(() => updatePrivateMSOLBalance());

            console.log(mSolBalance + " mSOL tokens were sent to the private balance");
            return topUpSignature;
        } catch (error) {
            console.log("An error topping up mSOL private balance: " + error);
        }

        // return the remaining SOL from the burner to the private balance
        returnSolFromBurner();
    }

    const unstakeLiquid = async () => {
        if (!marinade || !elusiv || !burnerKeypair || !publicKey) {
            return;
        }

        // deposit a bit of SOL to a burner for fees:
        const rent = await connection.getMinimumBalanceForRentExemption(0, "confirmed");

        const transferSolTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: burnerKeypair.publicKey,
                // 125000 (0.000125 SOL) to send mSOL later, remaining SOL will be returned from the burner in the end
                lamports: (rent + 50_000_000)
            })
        );

        await sendTransaction(transferSolTx, connection);

        // build and send a Transfer tx (from private balance to a burner address)
        if (Number(privateMSOLBalance) > 0) {
            const sendFee = (await elusiv.estimateSendFee({ amount: Number(unstakeAmount), tokenType: "mSOL", recipient: burnerKeypair.publicKey })).txFee / LAMPORTS_PER_SOL;
            await sendFromPrivateBalance(burnerKeypair.publicKey, (Number(unstakeAmount) + sendFee), "mSOL");
        }

        // build a deposit tx (from a burner to your private balance)
        const { transaction } = await marinade.liquidUnstake(MarinadeUtils.solToLamports(Number(unstakeAmount)));

        // send and confirm an unstake tx
        const unstakeSignature = await connection.sendTransaction(transaction, [burnerKeypair]);
        await connection.confirmTransaction(unstakeSignature, "finalized").then(() => {
            updatePrivateSOLBalance();
        });
        console.log("Unstake signature: " + unstakeSignature);

        // return the unstaked and the remaining SOL from the burner to the private balance
        returnSolFromBurner();
        return unstakeSignature;
    }

    const handleStakeButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Depositing tokens...");
        setLoading(true);

        if (Number(amount) > 0 && Number(privateBalance) > 0) {
            try {
                const sig = await depositStake();
                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Transfer details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}>
                            click
                        </Link>
                    </span>
                ), { duration: 5000 });
            } catch (error) {
                toast.error(`Stake deposit error, check the console for details.`, {
                    duration: 5000, style: {
                        overflow: "auto",
                        padding: "16px"
                    }
                });
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUnstakeButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Unstaking tokens...");
        setLoading(true);

        if (Number(unstakeAmount) > 0 && Number(privateMSOLBalance) > 0) {
            try {
                const sig = await unstakeLiquid();

                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Transfer details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}>
                            click
                        </Link>
                    </span>
                ), { duration: 5000 });
            } catch (error) {
                toast.error(`Unstake error, check the console for details.`, {
                    duration: 5000, style: {
                        overflow: "auto",
                        padding: "16px"
                    }
                });
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setAmount(parseFloat(newValue));
    };

    const handleUnstakeAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setUnstakeAmount(parseFloat(newValue));
    };

    const handleMaxButtonClick = () => {
        if (Number(privateBalance) === 0 || !privateBalance) {
            setAmount(Number(0));
        } else {
            setAmount((Number(privateBalance) / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
        }
    };

    const handleUnstakeMaxButtonClick = () => {
        if (Number(privateMSOLBalance) === 0 || !privateMSOLBalance) {
            setUnstakeAmount(Number(0));
        } else {
            setUnstakeAmount((Number(privateMSOLBalance)).toFixed(5));
        }
    };

    return (
        <section className="h-[70vh] flex items-center justify-center mx-auto overflow-hidden relative">

            <div className='flex flex-col min-w-[320px] w-[400px] space-y-4'>
                <Tab.Group>

                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                        <Tab
                            className={({ selected }) =>
                                `${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'} 
                            w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-[#3E79FF] 
                            focus:outline-none`
                            }
                        > Stake
                        </Tab>
                        <Tab
                            className={({ selected }) =>
                                `${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'} 
                            w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-[#3E79FF] 
                             focus:outline-none`
                            }
                        > Unstake
                        </Tab>
                    </Tab.List>

                    <Tab.Panels>

                        {/* STAKE PANEL */}
                        <Tab.Panel>
                            <div className='h-[310px] rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
                                <div className='flex flex-col items-start'>
                                    <div className='text-lg font-semibold text-[#333] flex items-center mb-6'>
                                        Start liquid staking privately
                                    </div>
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
                                    <div className='flex flex-col w-full items-start justify-between mt-1'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL)} SOL</p>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateMSOLBalance) / LAMPORTS_PER_SOL)} mSOL</p>
                                        </div>
                                    </div>

                                    <div className='w-full flex flex-col mx-auto mt-12 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={amount === 0 || loading === true} onClick={(e) => { handleStakeButtonClick(e) }}>
                                            <p>Stake</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* UNSTAKE PANEL */}
                        <Tab.Panel>
                            <div className='h-[310px] rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
                                <div className='flex flex-col items-start'>
                                    <div className='text-lg font-semibold text-[#333] flex items-center mb-6'>
                                        Unstake your SOL
                                    </div>
                                    <div className={`flex border border-[#333] border-opacity-30 bg-white w-full rounded-[5px] p-2 my-2 mx-auto items-center justify-between hover:border-[#3E79FF] focus:border-[#3E79FF] transition-all ease-in duration-150 ${loading && "cursor-not-allowed opacity-50"}`}>
                                        <div className='items-center h-8'>
                                            <input type="number" step="0.0001" min="0" placeholder='0' value={unstakeAmount} autoComplete='off' name="amount" id="amount" className='h-full w-full p-1 px-2 text-lg border-none focus:outline-none' onChange={handleUnstakeAmountChange} disabled={loading} />
                                        </div>
                                        <div className={`flex flex-col justify-center items-center h-full ${loading && "cursor-not-allowed opacity-50"}`}>
                                            <button onClick={handleUnstakeMaxButtonClick} className='bg-[#333] bg-opacity-20 rounded-[5px] text-xs py-1 px-2 cursor-pointer hover:bg-opacity-40 transition-all ease-in duration-150' disabled={loading}>
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between mt-1'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL)} SOL</p>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateMSOLBalance) / LAMPORTS_PER_SOL)} mSOL</p>
                                        </div>
                                    </div>

                                    <div className='w-full flex flex-col mx-auto mt-12 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={unstakeAmount === 0 || loading === true} onClick={(e) => { handleUnstakeButtonClick(e) }}>
                                            <p>Unstake</p>
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

export default Staking;
