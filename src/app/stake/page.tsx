import React from 'react';
import { Toaster } from 'react-hot-toast';
import Staking from '@/components/Staking';


const Stake = () => {

    return (
        <>
            <div>
                <Toaster
                    position="bottom-center"
                    reverseOrder={false}
                    toastOptions={{
                        duration: 3000,
                    }}
                />
            </div>

            <Staking />
        </>
    )
}

export default Stake;