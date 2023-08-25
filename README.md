# StakenZ - Private Liquidity Staking on Solana

StakenZ is a groundbreaking application that enables users to liquidity stake privately on the Solana blockchain. By harnessing the power of Elusiv and Marinade Protocol, StakenZ brings together cutting-edge privacy technology and efficient staking solutions.

## About StakenZ

StakenZ leverages the innovative Elusiv protocol, a blockchain-based, zero-knowledge privacy solution that empowers users and applications with universal encryption capabilities. Elusiv employs zk-SNARKs technology to facilitate private transactions and decentralized compliance solutions, striking a harmonious balance between privacy and compliance.

Additionally, StakenZ integrates with the Marinade Protocol, a Solana-based staking protocol. This integration enables users to liquidity stake SOL tokens and seamlessly initiate instant unstaking operations.

## Features

- **Private Balance Management:** StakenZ enables users to top up their private balance and withdraw funds using the Elusiv protocol.
- **Effortless Liquidity Staking:** With Marinade Protocol, users can liquidity stake SOL tokens and easily initiate unstaking operations.
- **Upcoming GUI Enhancements:** While the current front-end may not be fully polished, rest assured that StakenZ has plans to provide a more intuitive and informative graphical user interface (GUI) in the near future.
- **Future-Focused:** StakenZ is currently available on the Devnet network, but excitingly, it will soon launch on the Solana mainnet, expanding its reach and capabilities.

## Workflow

### Staking: 
- Top-up your SOL private balance.
- Private assets are sent to a one-time unique burner account.
- Burner deposits your SOL on a Marinade staking account and receive mSOL.
- All the mSOL and SOL tokens are sent from a burner either to your private balance or your connected wallet account if an error with the former process occurs.

## Local start

Clone the repository

`git clone https://github.com/ilyxabatko/private-staking.git`

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Note

StakenZ acknowledges that errors might occur during staking and unstaking transactions at this stage. If you encounter errors, change input amount or reload the page and try again. 

All the funds that was stuck in the burner wallet due to an error will be refunded to either your private balance or your connected wallet in the end, BUT be sure to save your private keypair to be able to ge your funds back in case unexpected behaviour occurs. This is a temporary solution to be sure that you won't lose your funds.

The app operates on mainnet due to Elusiv "mSOL" incompatibility on Devnet, so at this point I'll ask someone from Elusiv team to review my code and be sure that your assets is safu.

## Resources

- [Elusiv](https://elusiv.io/): Learn more about the privacy protocol that powers secure transactions and compliance solutions.
- [Marinade Protocol](https://marinade.finance/): Explore the staking protocol that enables efficient liquidity staking on the Solana blockchain.


## Author

[Elijah](https://twitter.com/elijahbrnv) - passionate Solana and Rust developer.