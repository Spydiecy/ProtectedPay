# ProtectedPay: The Trust Layer for Crypto Payments

**Trustless payment infrastructure on QIE Testnet. No middlemen. No broken promises.**

---

## The Problem

Sending crypto to someone you don't fully trust is still a broken experience.

You send funds — and then what? You hope they deliver. You hope they don't disappear. You hope the address was right. There's no recourse, no protection, no way to coordinate a group payment without someone holding the bag.

ProtectedPay puts the smart contract in charge instead of people.

---

## What We Built

ProtectedPay is a payment infrastructure layer built as an EVM smart contract deployed on QIE Testnet. Seven payment primitives that give users real protection:

### 🔒 Protected Transfer (Native + ERC-20)
Lock funds in a smart contract. The recipient claims when ready. If they don't — you get it back. Works for QIE and any ERC-20 token. No escrow service, no third party. The contract is the escrow.

### 👥 Group Split
Need to pool money from multiple people before paying someone? Set a total, set a participant count, and let contributors join. The moment the last person pays in, the full amount auto-releases. Creator can cancel anytime and everyone gets refunded. Contributors can withdraw their share individually too.

### ⚡ Batch Payment
One transaction. Multiple recipients. Different amounts. All atomic — either every transfer succeeds, or none do. Built for payroll, airdrops, and bulk payouts.

### 🔗 Payment Links
Create a shareable link or QR code for any payment — fixed amount or open amount. Anyone with the link can pay directly from a browser. Once paid, both parties can download a PDF invoice with full receipt details including transaction hash.

### 🌐 Username Registry
Addresses are 48 characters of anxiety. Register a human-readable username on-chain. Anyone can resolve @yourname to your address instantly. Works across all features.

### 🤖 PayBot — AI Payment Assistant
Ask PayBot anything in plain English. It reads your on-chain history, resolves usernames, explains features, and — most importantly — executes real transactions directly from the chat. Say "send 1 QIE to @alice as escrow" and a wallet confirmation popup appears instantly. Powered by Mistral AI via Vercel AI SDK.

### 📜 Transaction History
Full on-chain history across all features — protected transfers, token escrows, group splits, batch payments, and payment links — with expandable details, copyable addresses, username resolution, and timestamps.

---

## Deployed on QIE Testnet

| Property | Value |
|---|---|
| Contract Address | `0xb2f4b7e37A8A4B63337eb7735FBB1Bca88A65E57` |
| Network | QIE Testnet |
| Chain ID | `1983` |
| RPC | `https://rpc1testnet.qie.digital` |
| Explorer | [testnet.qie.digital](https://testnet.qie.digital) |
| Gas Token | QIE |

---

## Why QIE

QIE is a high-performance Layer 1 blockchain with EVM compatibility. ProtectedPay runs natively on QIE because:

- **QIE as gas** — every transaction uses QIE, the chain's native token. No bridging, no wrapping.
- **EVM-compatible** — full Ethereum tooling. Same Solidity contract, same wallet experience.
- **On-chain identity** — the username registry is fully on-chain, queryable directly from the contract.
- **Non-custodial** — no admin key, no upgrade mechanism, no pause function.

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
| Blockchain | QIE Testnet (Chain ID: 1983) |
| Gas Token | QIE |
| Frontend | Next.js 16, TypeScript |
| Wallet | RainbowKit v2 (MetaMask, Rainbow, WalletConnect, Coinbase, Trust) |
| Chain SDK | wagmi v2 + viem v2 |
| AI Assistant | PayBot — Mistral Large via Vercel AI SDK with tool-calling |
| Invoice | Canvas API — PDF receipts, zero dependencies |
| Styling | CSS custom properties, dark/light theme |

---

## Features

- ✅ Protected transfers — native QIE with claim and refund
- ✅ ERC-20 token escrow — approve once, create, claim or refund
- ✅ Group split payments — auto-release, contributor tracking, individual withdrawals
- ✅ Atomic batch transfers — one tx, multiple recipients
- ✅ Payment links with QR codes and downloadable PDF invoices
- ✅ On-chain username registry with @mention resolution
- ✅ PayBot AI — natural language interface, executes real transactions from chat
- ✅ Full transaction history across all feature types
- ✅ Live QIE balance display
- ✅ Multi-wallet support via RainbowKit
- ✅ Light and dark mode
- ✅ Mobile responsive

---

**[Follow on X](https://x.com/protected_pay) · [View on GitHub](https://github.com/Spydiecy/ProtectedPay_Qie)**
