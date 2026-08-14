# FlarePay: The Trust Layer for Crypto Payments

**Trustless payment infrastructure on the Flare Testnet Coston2. No middlemen. No broken promises.**

---

## The Problem

Sending crypto to someone you don't fully trust is still a broken experience.

You send funds — and then what? You hope they deliver. You hope they don't disappear. You hope the address was right. There's no recourse, no protection, no way to coordinate a group payment without someone holding the bag.

FlarePay puts the smart contract in charge instead of people.

---

## What We Built

FlarePay is a payment infrastructure layer built as an EVM smart contract deployed on the Flare Testnet Coston2. Seven payment primitives that give users real protection:

### 🔒 Protected Transfer (Native + ERC-20)
Lock funds in a smart contract. The recipient claims when ready. If they don't — you get it back. Works for C2FLR and any ERC-20 token. No escrow service, no third party. The contract is the escrow.

### 👥 Group Split
Need to pool money from multiple people before paying someone? Set a total, set a participant count, and let contributors join. The moment the last person pays in, the full amount auto-releases. Creator can cancel anytime and everyone gets refunded. Contributors can withdraw their share individually too.

### ⚡ Batch Payment
One transaction. Multiple recipients. Different amounts. All atomic — either every transfer succeeds, or none do. Built for payroll, airdrops, and bulk payouts.

### 🔗 Payment Links
Create a shareable link or QR code for any payment — fixed amount or open amount. Anyone with the link can pay directly from a browser. Once paid, both parties can download a PDF invoice with full receipt details including transaction hash.

### 🌐 Username Registry
Addresses are 42 characters of anxiety. Register a human-readable username on-chain. Anyone can resolve @yourname to your address instantly. Works across all features.

### 🤖 PayBot — AI Payment Assistant
Ask PayBot anything in plain English. It reads your on-chain history, resolves usernames, explains features, and — most importantly — executes real transactions directly from the chat. Say "send 1 C2FLR to @alice as escrow" and a wallet confirmation popup appears instantly. Powered by Mistral AI via Vercel AI SDK.

### 📜 Transaction History
Full on-chain history across all features — protected transfers, token escrows, group splits, batch payments, and payment links — with expandable details, copyable addresses, username resolution, and timestamps.

---

## Deployed on Flare

| Property | Value |
|---|---|
| Contract Address | `0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6` |
| Network | Flare Testnet Coston2 |
| Chain ID | `114` |
| RPC | `https://coston2-api.flare.network/ext/C/rpc` |
| Explorer | [coston2-explorer.flare.network](https://coston2-explorer.flare.network) |
| Gas Token | C2FLR |
| Faucet | [faucet.flare.network](https://faucet.flare.network/) |

### Assets & Oracles (Coston2)

| Item | Address |
|---|---|
| FXRP (FTestXRP) | `0x0b6A3645c240605887a5532109323A3E12273dc7` |
| USDT0 | `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` |
| FtsoV2 (via registry) | `0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d` |
| FlareContractRegistry | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` |

---

## Why Flare

Flare is a high-performance EVM-compatible blockchain built for decentralized data. FlarePay runs on the Coston2 testnet because:

- **C2FLR as gas** — every transaction uses C2FLR, the testnet's native token. No bridging, no wrapping.
- **EVM-compatible** — full Ethereum tooling. Same Solidity contract, same wallet experience.
- **On-chain identity** — the username registry is fully on-chain, queryable directly from the contract.
- **Non-custodial** — no admin key, no upgrade mechanism, no pause function.
- **Free test funds** — the official Flare faucet gives you C2FLR instantly so you can try every feature at no cost.

---

## How This Project Uses Flare

FlarePay is deployed as an EVM smart contract on **Flare Testnet Coston2** (chain ID 114), where every payment primitive — protected transfers, group splits, batch payments and payment links — settles natively in C2FLR. Beyond the native token, it escrows **FXRP** (the FAssets 1:1 representation of XRP) and **USDT0** as first-class preset assets, so users pick them from a dropdown instead of hunting down contract addresses. Live **FTSOv2** block-latency feeds are read on top of that to show a "≈ $X" USD equivalent beside every amount, pulling FLR/USD, XRP/USD and USDT/USD directly from Flare's enshrined oracle rather than a third-party price API. The result is a payment layer where the asset, the settlement and the pricing all come from Flare's own protocol stack.

### Built before this hackathon (ProtectedPay core)

- Protected transfer escrow — lock, claim, refund for the native token
- Generic ERC-20 escrow via a pasted token contract address
- Group split payments with auto-release and contributor withdrawals
- Atomic batch payments — one transaction, many recipients
- Payment links with QR codes and downloadable PDF invoices
- On-chain username registry with `@name` resolution
- PayBot AI assistant and full transaction history UI

### Added during this hackathon (Flare integration)

- **Migrated the whole app to Flare Testnet Coston2** — chain config, RPC, explorer, C2FLR gas token, faucet access, single-network wallet flow
- **FXRP as a preset asset** — selectable by name with its logo, no address paste, correct 6-decimal handling
- **USDT0 as a preset asset** — same one-click selection path
- **FTSOv2 live pricing** — `FlarePayPriceFeed.sol` exposes `getUsdPrice(bytes21)` via `ContractRegistry.getTestFtsoV2()`; the frontend resolves `FtsoV2` through the `FlareContractRegistry` and renders "≈ $X" next to amounts in escrow, history, dashboard balance and payment-link flows
- **Allowance-aware approval flow** — the two-step ERC-20 approve → create sequence now reads the real on-chain allowance, so existing approvals are detected and no one gets stuck re-approving

---

## FTSOv2 Price Feeds

USD equivalents come from Flare's native oracle, not an off-chain price API.

| Asset | Feed | Feed ID |
|---|---|---|
| C2FLR (native) | FLR/USD | `0x01464c522f55534400000000000000000000000000` |
| FXRP | XRP/USD | `0x015852502f55534400000000000000000000000000` |
| USDT0 | USDT/USD | `0x01555344542f555344000000000000000000000000` |

`contracts/FlarePayPriceFeed.sol` is the on-chain adapter, exposing:

```solidity
function getUsdPrice(bytes21 feedId)
    external view returns (uint256 value, int8 decimals, uint64 timestamp);
```

It resolves FTSOv2 through `ContractRegistry.getTestFtsoV2()` so no address is ever hardcoded. Block-latency feeds are free to read and update roughly every 1.8 seconds. The contract holds no funds and has no owner — it is a read-only adapter, entirely separate from the escrow logic.

The frontend reads the same feeds directly (`app/lib/ftso.ts` + `app/hooks/usePrices.ts`), resolving `FtsoV2` via the `FlareContractRegistry` at `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`, with one shared poller behind every price label. Note each feed reports its own decimals — FLR/USD returns 8, XRP/USD and USDT/USD return 6 — so decimals are always applied per feed rather than assumed.

---

## Getting Test Funds

FlarePay runs entirely on the Flare Testnet Coston2. Before you can send transactions, grab free C2FLR from the faucet:

1. Click **Get Test Funds** in the dashboard sidebar, or visit [faucet.flare.network](https://faucet.flare.network/) directly
2. Paste your wallet address
3. Request funds — the Coston2 faucet dispenses C2FLR plus test **FXRP** and **USDT0**, so you can try both the native and token escrow flows

---

## What Makes This Different

Most "escrow" tools are custodial. A company holds your funds. FlarePay has no company in the loop — the contract code is the only authority. Open source. Verifiable on-chain.

Most "batch payment" tools send multiple transactions. FlarePay's batch is a single atomic transaction — if one transfer fails, the entire batch reverts. No partial payouts.

Most "group payment" flows require someone to collect money and then pay out. FlarePay's group split holds funds in the contract until the threshold is met, then releases automatically. Nobody can run with the money.

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
| Blockchain | Flare Testnet Coston2 (Chain ID: 114) |
| Gas Token | C2FLR |
| Assets | C2FLR, FXRP (FAssets), USDT0, any ERC-20 |
| Oracle | FTSOv2 block-latency feeds via `flare-periphery-contracts` |
| Frontend | Next.js 16, TypeScript |
| Wallet | RainbowKit v2 (MetaMask, Rainbow, WalletConnect, Coinbase, Trust) |
| Chain SDK | wagmi v2 + viem v2 |
| AI Assistant | PayBot — Mistral Large via Vercel AI SDK with tool-calling |
| Invoice | Canvas API — PDF receipts, zero dependencies |
| Styling | CSS custom properties, dark/light theme |

---

## Features

- ✅ Protected transfers — native C2FLR with claim and refund
- ✅ ERC-20 token escrow — approve once, create, claim or refund
- ✅ FXRP and USDT0 as one-click preset assets, plus any custom ERC-20
- ✅ Live FTSOv2 USD pricing — "≈ $X" beside every amount
- ✅ Group split payments — auto-release, contributor tracking, individual withdrawals
- ✅ Atomic batch transfers — one tx, multiple recipients
- ✅ Payment links with QR codes and downloadable PDF invoices
- ✅ On-chain username registry with @mention resolution
- ✅ PayBot AI — natural language interface, executes real transactions from chat
- ✅ Full transaction history across all feature types
- ✅ Live C2FLR balance display
- ✅ One-click access to the Flare faucet for test funds
- ✅ Multi-wallet support via RainbowKit
- ✅ Light and dark mode
- ✅ Mobile responsive

---

**[Follow on X](https://x.com/FlarePay) · [View on GitHub](https://github.com/Spydiecy/FlarePay)**
