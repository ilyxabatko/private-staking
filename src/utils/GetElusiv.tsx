import { Elusiv, SEED_MESSAGE } from "@elusiv/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { MessageSignerWalletAdapterProps } from "@solana/wallet-adapter-base";

// , signMessage
export async function getElusiv(publicKey: PublicKey, signMessage: MessageSignerWalletAdapterProps['signMessage'] | undefined): Promise<{
    elusiv: Elusiv;
}> {
    if (!signMessage) throw new Error('Wallet can not sign the message');
    if (!publicKey) throw new Error("No Public Key available");

    // later will be changed on the wallet's "useConnection"
    // const connection = new Connection("https://api.devnet.solana.com");
    const connection = new Connection("https://rpc.helius.xyz/?api-key=94b5b7b2-e287-484a-ae84-00d542fc7b0f");

    const buf = Buffer.from(SEED_MESSAGE, "utf8");
    const seed = await signMessage(buf);

    const elusiv = await Elusiv.getElusivInstance(
        seed,
        publicKey,
        connection,
        "mainnet-beta"
    );

    return {
        elusiv,
    };
}