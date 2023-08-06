import Link from 'next/link';
import Image from 'next/image'

export default function Home() {
    return (
        <section className="w-full flex flex-col items-center mt-24">
            {/* <h1 className="head_text text-center">Discover & Share</h1> */}
            {/* <br className="max-md:hidden" /> */}
            <h1 className="text-4xl sm:text-2xl text-[#333333] font-montserrat font-bold">Private Staking</h1>
            <span className='text-9xl sm:text-7xl font-montserrat font-extrabold bg-gradient-to-r from-[#99acf3] via-[#3E79FF] to-[#00A3B8] bg-clip-text text-transparent'>Stakenz</span>
            <p className="mt-5 text-lg text-[#333333] max-w-lg sm:text-base sm:max-w-md text-center">
                A cloak of secrecy for your Solana riches, Stakenz lets you stake in private and flourish in silence.
            </p>

            <Link href="/stake" className='remove-tap-highlight'>
                <div
                    className="text-xl px-10 rounded-full font-montserrat font-bold w-fit flex mx-auto py-4 border-4 cursor-pointer mt-14 xsm:mt-24 xsm:px-8 xsm:text-base button-anim bg-white"
                >
                    <p className='mt-1'>Start staking</p>
                </div>
            </Link>
        </section>
    )
}
