# ProtectedPay: The Trust Layer for Crypto Payments

**Trustless payment infrastructure on the X Layer Testnet. No middlemen. No broken promises.**

*Live on the X Layer Testnet for this hackathon — mainnet launch coming once the hackathon wraps up.*

**🚀 Live app: [protectedpay-okx.vercel.app](https://protectedpay-okx.vercel.app/)**

---

## The Problem

Sending crypto to someone you don't fully trust is still a broken experience.

You send funds — and then what? You hope they deliver. You hope they don't disappear. You hope the address was right. There's no recourse, no protection, no way to coordinate a group payment without someone holding the bag.

ProtectedPay puts the smart contract in charge instead of people.

---

## What We Built

ProtectedPay is a payment infrastructure layer built as an EVM smart contract deployed on the X Layer Testnet. Seven payment primitives that give users real protection:

### 🔒 Protected Transfer (Native + ERC-20)
Lock funds in a smart contract. The recipient claims when ready. If they don't — you get it back. Works for OKB and any ERC-20 token. No escrow service, no third party. The contract is the escrow.

### 👥 Group Split
Need to pool money from multiple people before paying someone? Set a total, set a participant count, and let contributors join. The moment the last person pays in, the full amount auto-releases. Creator can cancel anytime and everyone gets refunded. Contributors can withdraw their share individually too.

### ⚡ Batch Payment
One transaction. Multiple recipients. Different amounts. All atomic — either every transfer succeeds, or none do. Built for payroll, airdrops, and bulk payouts.

### 🔗 Payment Links
Create a shareable link or QR code for any payment — fixed amount or open amount. Anyone with the link can pay directly from a browser. Once paid, both parties can download a PDF invoice with full receipt details including transaction hash.

### 🌐 Username Registry
Addresses are 42 characters of anxiety. Register a human-readable username on-chain. Anyone can resolve @yourname to your address instantly. Works across all features.

### 🤖 PayBot — AI Payment Assistant
Ask PayBot anything in plain English. It reads your on-chain history, resolves usernames, explains features, and — most importantly — executes real transactions directly from the chat. Say "send 1 OKB to @alice as escrow" and a wallet confirmation popup appears instantly. Powered by Mistral AI via Vercel AI SDK.

### 📜 Transaction History
Full on-chain history across all features — protected transfers, token escrows, group splits, batch payments, and payment links — with expandable details, copyable addresses, username resolution, and timestamps.

---

## Deployed on X Layer

| Property | Value |
|---|---|
| Contract Address | `0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6` |
| Network | X Layer Testnet |
| Chain ID | `1952` (`0x7A0`) |
| RPC | `https://testrpc.xlayer.tech/terigon` (alt: `https://xlayertestrpc.okx.com/terigon`) |
| Explorer | [web3.okx.com/explorer/x-layer-testnet](https://web3.okx.com/explorer/x-layer-testnet) |
| Gas Token | OKB |
| Faucet | [OKX X Layer Faucet](https://web3.okx.com/xlayer/faucet/xlayerfaucet) |
| Mainnet | Coming soon — after the hackathon ends |

### Preset Assets (Testnet)

| Item | Address |
|---|---|
| USDT | `0x9e29b3AaDa05Bf2D2c827Af80Bd28Dc0b9b4FB0c` |
| USDC | `0xcB8BF24c6cE16Ad21D707c9505421a17f2bec79D` |
| USDG | `0xA78E2baaBaf5c4f36b7Fc394725Deb68D332EeC1` |

---

## Why X Layer

X Layer is an EVM-compatible zkEVM Layer 2 built with Polygon CDK, connecting the OKX and Ethereum communities. ProtectedPay runs on the X Layer Testnet because:

- **OKB as gas** — every transaction uses OKB, the network's native token. No bridging, no wrapping.
- **EVM-compatible** — full Ethereum tooling. Same Solidity contract, same wallet experience.
- **On-chain identity** — the username registry is fully on-chain, queryable directly from the contract.
- **Non-custodial** — no admin key, no upgrade mechanism, no pause function.
- **Free test funds** — the official OKX X Layer faucet gives you OKB instantly so you can try every feature at no cost.
- **Deep OKX integration** — OKX Wallet, exchange liquidity, and fiat on/off-ramps make onboarding painless.

---

## How This Project Uses X Layer

ProtectedPay is deployed as an EVM smart contract on the **X Layer Testnet** (chain ID 1952), where every payment primitive — protected transfers, group splits, batch payments and payment links — settles natively in OKB. Beyond the native token, it escrows **USDT**, **USDC** and **USDG** as first-class preset assets, so users pick them from a dropdown instead of hunting down contract addresses.

### Built before this hackathon (ProtectedPay core)

- Protected transfer escrow — lock, claim, refund for the native token
- Generic ERC-20 escrow via a pasted token contract address
- Group split payments with auto-release and contributor withdrawals
- Atomic batch payments — one transaction, many recipients
- Payment links with QR codes and downloadable PDF invoices
- On-chain username registry with `@name` resolution
- PayBot AI assistant and full transaction history UI

### Added during this hackathon (X Layer integration)

- **Migrated the whole app to the X Layer Testnet** — chain config, RPC, explorer, OKB gas token, faucet access, single-network wallet flow
- **USDT as a preset asset** — selectable by name with its logo, no address paste, correct 6-decimal handling
- **USDC as a preset asset** — same one-click selection path
- **USDG (Global Dollar) as a preset asset** — same one-click selection path
- **Allowance-aware approval flow** — the two-step ERC-20 approve → create sequence now reads the real on-chain allowance, so existing approvals are detected and no one gets stuck re-approving

---

## Getting Test Funds

ProtectedPay runs entirely on the X Layer Testnet. Before you can send transactions, grab free OKB from the faucet:

1. Click **Get Test Funds** in the dashboard sidebar, or visit the [OKX X Layer Faucet](https://web3.okx.com/xlayer/faucet/xlayerfaucet) directly
2. Paste your wallet address
3. Request funds — the faucet dispenses OKB so you can pay gas on every feature

---

## What Makes This Different

Most "escrow" tools are custodial. A company holds your funds. ProtectedPay has no company in the loop — the contract code is the only authority. Open source. Verifiable on-chain.

Most "batch payment" tools send multiple transactions. ProtectedPay's batch is a single atomic transaction — if one transfer fails, the entire batch reverts. No partial payouts.

Most "group payment" flows require someone to collect money and then pay out. ProtectedPay's group split holds funds in the contract until the threshold is met, then releases automatically. Nobody can run with the money.

---

## Security

- **CEI pattern** on every state-changing function — reentrancy structurally impossible
- **Checked arithmetic** throughout — no overflow risks
- **Access control** on every sensitive operation — only sender can refund, only recipient can claim
- **Atomic batch execution** — entire batch reverts if any single transfer fails
- **Non-custodial by design** — no admin key, no upgrade mechanism, no pause function

---

## The Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 (EVM) |
| Blockchain | X Layer Testnet (Chain ID: 1952) — mainnet coming post-hackathon |
| Gas Token | OKB |
| Assets | OKB, USDT, USDC, USDG, any ERC-20 |
| Frontend | Next.js 16, TypeScript |
| Wallet | RainbowKit v2 (MetaMask, Rainbow, WalletConnect, Coinbase, Trust) |
| Chain SDK | wagmi v2 + viem v2 |
| AI Assistant | PayBot — Mistral Large via Vercel AI SDK with tool-calling |
| Invoice | Canvas API — PDF receipts, zero dependencies |
| Styling | CSS custom properties, dark/light theme |

---

## Features

- ✅ Protected transfers — native OKB with claim and refund
- ✅ ERC-20 token escrow — approve once, create, claim or refund
- ✅ USDT, USDC and USDG as one-click preset assets, plus any custom ERC-20
- ✅ Group split payments — auto-release, contributor tracking, individual withdrawals
- ✅ Atomic batch transfers — one tx, multiple recipients
- ✅ Payment links with QR codes and downloadable PDF invoices
- ✅ On-chain username registry with @mention resolution
- ✅ PayBot AI — natural language interface, executes real transactions from chat
- ✅ Full transaction history across all feature types
- ✅ Live OKB balance display
- ✅ One-click access to the X Layer faucet for test funds
- ✅ Multi-wallet support via RainbowKit
- ✅ Light and dark mode
- ✅ Mobile responsive

---

**[Live App](https://protectedpay-okx.vercel.app/) · [Follow on X](https://x.com/protected_pay) · [View on GitHub](https://github.com/Spydiecy/ProtectedPay)**
