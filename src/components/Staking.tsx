"use client"

import React from 'react';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { useElusiv } from '@/context/ElusivAndBalance';
import { useMarinade } from '@/context/MarinadeContext';
import { MarinadeUtils } from '@marinade.finance/marinade-ts-sdk';

const Staking = () => {
    const { signMessage, sendTransaction } = useWallet();

    const [amount, setAmount] = useState<number | string>(0);
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
        const { transaction, associatedMSolTokenAccountAddress } = await marinade.deposit(MarinadeUtils.solToLamports(Number(amount)), {mintToOwnerAddress: publicKey});

        // send and confirm a deposit tx
        const depositSignature = await connection.sendTransaction(transaction, [burnerKeypair]);
        await connection.confirmTransaction(depositSignature, "finalized");
        console.log("Deposit signature: " + depositSignature);

        // topup private balance with mSOL from a burner
        console.log("Sending mSOL to the private balance...");

        const mSolBalance = (await connection.getTokenAccountBalance(associatedMSolTokenAccountAddress)).value.uiAmountString; // the balance as a string, using mint-prescribed decimals
        console.log("Burner mSOL balance: " + Number(mSolBalance));
        const mSolBalanceParsed = mSolBalance && parseFloat(mSolBalance);
        // const mSOLtoSend = MarinadeUtils.solToLamports(Number(mSolBalanceParsed));
        console.log("mSOL to send after cutting a part for fees: " + mSolBalanceParsed);

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

    const handleStakeButtonClick = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        toast("Depositing tokens...");
        setLoading(true);

        if (Number(amount) > 0 && Number(privateBalance) > 0) {
            try {
                const signature = await depositStake();
                toast.success(`Deposit completed with sig ${signature}`, {
                    duration: 5000, style: {
                        overflow: "auto",
                        padding: "16px"
                    }
                });
            } catch (error) {
                toast.error(`An error occured, check the console for details.`, {
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

    const handleMaxButtonClick = () => {
        if (Number(privateBalance) == 0 || !privateBalance) {
            setAmount(Number(0));
        }
        setAmount((Number(privateBalance) / LAMPORTS_PER_SOL - 0.00001).toFixed(5));
    };

    return (
        <section className="h-[70vh] flex items-center justify-center mx-auto overflow-hidden relative">

            <div className='flex flex-col space-y-4'>
                <div className='h-[350px] min-w-[330px] max-w-lg border border-[#3E79FF] border-opacity-60 rounded-[10px] bg-white w-full flex flex-col justify-start p-4 py-6'>
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
                            <button className='flex items-center justify-center text-center secondary-button-styling' disabled={amount === 0 || loading === true} onClick={(e) => { }} >
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
