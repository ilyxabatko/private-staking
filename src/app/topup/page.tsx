import React from 'react';
import TopUp from '@/components/TopUp';
import { Toaster } from 'react-hot-toast';


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