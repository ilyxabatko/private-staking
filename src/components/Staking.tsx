"use client"

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey, Keypair } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { useElusiv } from '@/context/ElusivAndBalance';
import { useMarinade } from '@/context/MarinadeContext';
import { BN, MarinadeUtils } from '@marinade.finance/marinade-ts-sdk';
import { Tab } from '@headlessui/react'
import Link from 'next/link';

const Staking = () => {
    const { sendTransaction } = useWallet();

    const [amount, setAmount] = useState<number | string>(0);
    const [unstakeAmount, setUnstakeAmount] = useState<number | string>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [isCopyClicked, setIsCopyClicked] = useState<boolean>(false);
    const { privateBalance, privateMSOLBalance, elusiv, updatePrivateSOLBalance, updatePrivateMSOLBalance, publicKey, connection, burnerKeypair, sendFromPrivateBalance, returnSolFromBurner, returnMSolFromBurner, updateMSOLBalance, getBurnerMSOLBalance, burnerMSolBalance, updateSOLBalance } = useElusiv();
    const { marinade } = useMarinade();
    const mSOLAddress = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");

    const depositStake = async () => {
        if (!marinade || !elusiv || !burnerKeypair || !publicKey) {
            return;
        }

        // deposit a bit of SOL to a burner to initialize it:
        const rent = await connection.getMinimumBalanceForRentExemption(0);

        const transferSolTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: burnerKeypair.publicKey,
                // 125000 (0.000125 SOL) to send mSOL later, remaining SOL will be returned from the burner in the end
                lamports: (rent + 10_000_000)
            })
        );

        await sendTransaction(transferSolTx, connection);

        // build and send a Transfer tx (from private balance to a burner address)
        if (Number(privateBalance) > 0) {
            const tx = await sendFromPrivateBalance(burnerKeypair.publicKey, (Number(amount)), "LAMPORTS");
            tx && await connection.confirmTransaction(tx?.signature, "finalized");
        }

        // get burner SOL balance
        const currentBurnerSolBalance = await connection.getBalance(burnerKeypair.publicKey);
        console.log("Fetched burner SOL balance: " + currentBurnerSolBalance);
        const solToDeposit: BN = new BN(currentBurnerSolBalance - rent - MarinadeUtils.solToLamports(0.00001));

        // build a deposit tx (from a burner to a stake address)
        const { transaction, associatedMSolTokenAccountAddress } = await marinade.deposit(solToDeposit, { mintToOwnerAddress: burnerKeypair.publicKey });

        // send and confirm a deposit tx
        const depositSignature = await connection.sendTransaction(transaction, [burnerKeypair]);
        await connection.confirmTransaction(depositSignature, "finalized");
        console.log("Deposit signature: " + depositSignature);

        return depositSignature;
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
                lamports: (rent + 10_000_000)
            })
        );

        await sendTransaction(transferSolTx, connection);

        // build and send a Transfer tx (from private balance to a burner address)
        if (Number(privateMSOLBalance) > 0) {
            const tx = await sendFromPrivateBalance(burnerKeypair.publicKey, (Number(unstakeAmount)), "mSOL");
            tx && await connection.confirmTransaction(tx?.signature, "finalized");
        }

        // get burner mSOL balance
        const mSOLBurnerTokenAccount = await MarinadeUtils.getAssociatedTokenAccountAddress(mSOLAddress, burnerKeypair?.publicKey);
        const mSolBurnerBalance = mSOLBurnerTokenAccount && (await connection.getTokenAccountBalance(mSOLBurnerTokenAccount)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals
        const mSolBalanceParsed = mSolBurnerBalance && parseFloat(mSolBurnerBalance);
        console.log("Fetched burner mSOL Balance: " + mSolBalanceParsed);

        // build a deposit tx (from a burner to your private balance)
        const { transaction } = await marinade.liquidUnstake(MarinadeUtils.solToLamports(Number(mSolBalanceParsed)));

        // send and confirm an unstake tx
        const unstakeSignature = await connection.sendTransaction(transaction, [burnerKeypair]);
        await connection.confirmTransaction(unstakeSignature, "finalized");
        console.log("Unstake signature: " + unstakeSignature);

        return unstakeSignature;
    }

    const handleStakeButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Depositing tokens...", { duration: 3000 });
        setLoading(true);

        if (Number(amount) > 0 && Number(privateBalance) > 0) {
            try {
                const sig = await depositStake();
                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Transfer details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig}`} target="_blank" rel="noopener noreferrer">
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
                await onInteractionEnd();
                await refundFromBurner();
                setLoading(false);
            }
        }
    };

    const handleUnstakeButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Unstaking tokens...", { duration: 3000 });
        setLoading(true);

        if (Number(unstakeAmount) > 0 && Number(privateMSOLBalance) > 0) {
            try {
                const sig = await unstakeLiquid();

                toast((t) => (
                    <span className='px-2 py-1 overflow-auto text-base'>
                        Transfer details:
                        <Link className='text-[#3E79FF] ml-1 hover:underline' href={`https://explorer.solana.com/tx/${sig}`} target="_blank" rel="noopener noreferrer">
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
                await onInteractionEnd();
                await refundFromBurner();
                setLoading(false);
            }
        }
    };

    const onInteractionEnd = async () => {
        // return the remaining SOL and mSOL from the burner to the private balance and update mSOL balance
        await updateSOLBalance();
        await updateMSOLBalance();
        await updatePrivateMSOLBalance();
        await updatePrivateSOLBalance();
    }

    const refundFromBurner = async () => {
        await returnMSolFromBurner();
        await returnSolFromBurner();
    }

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
            setUnstakeAmount((Number(privateMSOLBalance) / LAMPORTS_PER_SOL).toFixed(5));
        }
    };

    const handleCopyKeypairButtonClick = () => {
        if (burnerKeypair) {
            navigator.clipboard.writeText(burnerKeypair.secretKey.toString());
            setIsCopyClicked(true);

            setTimeout(() => {
                setIsCopyClicked(false);
            }, 7000);
        } else {
            toast.error(`No keypair generated, try to refresh the page.`, {
                duration: 5000, style: {
                    overflow: "auto",
                    padding: "16px"
                }
            });
        }
    }

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
                            <div className='h-[380px] rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
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
                                            <p className=''>Private SOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL).toFixed(5)} SOL</p>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateMSOLBalance) / LAMPORTS_PER_SOL).toFixed(5)} mSOL</p>
                                        </div>
                                    </div>
                                    <div className='flex w-full items-start mt-2'>
                                        <div className='flex flex-col items-left text-sm font-semibold text-[#333] text-opacity-70 px-2 py-3 rounded-[5px] bg-[#333] bg-opacity-20'>
                                            <p className='font-bold text-base'>Stake at least 1.3 SOL, because:</p>
                                            <p>• Elusiv substracts send fees from your private balance.</p>
                                            <p>• Marinade allows to stake 1 SOL at least;</p>
                                        </div>
                                    </div>

                                    <div className='w-full flex flex-col mx-auto mt-6 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={!amount || Number(amount) < 1.3 || loading === true} onClick={(e) => { handleStakeButtonClick(e) }}>
                                            <p>Stake</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* UNSTAKE PANEL */}
                        <Tab.Panel>
                            <div className='h-[370px] rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
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
                                            <p className=''>Private SOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateBalance) / LAMPORTS_PER_SOL).toFixed(5)} SOL</p>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start justify-between'>
                                        <div className='flex items-center text-sm text-[#333] text-opacity-70 gap-1'>
                                            <p className=''>Private mSOL Balance: </p>
                                            <p className='text-[#3E79FF]'>{(Number(privateMSOLBalance) / LAMPORTS_PER_SOL).toFixed(5)} mSOL</p>
                                        </div>
                                    </div>
                                    <div className='flex flex-col w-full items-start mt-2'>
                                        <div className='flex flex-col items-center text-sm font-semibold text-[#333] text-opacity-70 px-2 py-3 rounded-[5px] bg-[#333] bg-opacity-20'>
                                            <p>• Elusiv substracts send fees from your private balance.</p>
                                            <p>• You can only unstake with all of your private mSOL at this point.</p>
                                        </div>
                                    </div>

                                    <div className='w-full flex flex-col mx-auto mt-5 gap-1'>
                                        <button className='flex items-center justify-center text-center accent-button-styling' disabled={unstakeAmount === 0 || loading === true} onClick={(e) => { handleUnstakeButtonClick(e) }}>
                                            <p>Unstake</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                    </Tab.Panels>

                </Tab.Group>

                <div className='w-1/3 xsm:w-1/2 flex mx-auto mt-3'>
                    <button className='flex w-full items-center justify-center text-center border border-[#3E79FF] hover:bg-slate-400 rounded-[5px] bg-[#3E79FF] bg-opacity-80 px-3 py-2 text-sm text-white font-medium disabled:bg-slate-400' disabled={burnerKeypair === undefined || isCopyClicked === true} onClick={() => { handleCopyKeypairButtonClick() }}
                        onClickCapture={() => {
                            toast.success("Private key was copied successfully!", { duration: 3000 });
                        }} >
                        Copy Keypair
                    </button>
                </div>

            </div>

        </section>
    )
}

export default Staking;
