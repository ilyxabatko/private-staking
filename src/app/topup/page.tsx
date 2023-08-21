import React from 'react';
import { useEffect, useState } from 'react';
import TopUp from '@/components/TopUp';
import { Toaster } from 'react-hot-toast';
import { ElusivProvider } from '@/context/ElusivAndBalance';


const Topup = () => {

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

            <TopUp />
        </>
    )
}

export default Topup;