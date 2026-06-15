# ProtectedPay

**Trustless payment infrastructure on QIE Testnet. No middlemen. No broken promises.**

---

## The Problem

Sending crypto to someone you don't fully trust is still a broken experience.

You send funds — and then what? You hope they deliver. You hope they don't disappear. You hope the address was right. There's no recourse, no protection, no way to coordinate a group payment without someone holding the bag.

ProtectedPay puts the smart contract in charge instead of people.

---

## What We Built

ProtectedPay is a payment infrastructure layer built as an EVM smart contract deployed on QIE Testnet. Four payment primitives that give users real protection:

### 🔒 Protected Transfer
Lock funds in a smart contract. The recipient claims when they're ready. If they don't — you get it back. No escrow service, no third party. The contract is the escrow.

### 👥 Group Split
Need to pool money from multiple people before paying someone? Set a total, set a participant count, and let contributors join. The moment the last person pays in, the full amount auto-releases to the recipient. Nobody holds the funds in between.

### ⚡ Batch Payment
One transaction. Multiple recipients. Different amounts. All atomic — either every transfer succeeds, or none of them do. Built for payroll, airdrops, and anything that involves paying more than one person at once.

### 🌐 Username Registry
Addresses are 48 characters of anxiety. Register a human-readable username on-chain. Anyone can resolve @yourname to your address instantly. Send to people, not strings.

---

## Deployed on QIE Testnet

| Property | Value |
|---|---|
| Contract Address | `0xF93132d75c20EfeD556EC2Bc5aC777750665D3a9` |
| Network | QIE Testnet |
| Chain ID | `1983` |
| RPC | `https://rpc1testnet.qie.digital` |
| Explorer | [testnet.qie.digital](https://testnet.qie.digital) |
| Gas Token | QIE |

---

## Why QIE

QIE is a high-performance Layer 1 blockchain with EVM compatibility. ProtectedPay runs natively on QIE because:

- **QIE as gas** — every transaction on ProtectedPay uses QIE, the chain's native token. No bridging, no wrapping, no extra steps.
- **EVM-compatible** — full Ethereum tooling compatibility. The same Solidity contract, the same wallet experience users already know.
- **On-chain identity** — the username registry is fully on-chain, queryable directly from the contract with no off-chain indexer needed.
- **Non-custodial** — no admin key, no upgrade mechanism, no pause function. The contract is the only authority.

---

## What Makes This Different

Most "escrow" tools are custodial. A company holds your funds. ProtectedPay has no company in the loop — the contract code is the only authority. Open source. Verifiable on-chain.

Most "batch payment" tools send multiple transactions. ProtectedPay's batch is a single atomic transaction — if one transfer fails, the entire batch reverts. No partial payouts.

Most "group payment" flows require someone to collect money and then pay out. ProtectedPay's group split holds funds in the contract until the threshold is met, then releases automatically. Nobody can run with the money.

---

## Security

The contract is built with security first:

- **CEI pattern** on every state-changing function — state updated before any ETH transfer, making reentrancy structurally impossible
- **Checked arithmetic** throughout — no overflow risks
- **Access control** on every sensitive operation — only sender can refund, only recipient can claim, only creator can cancel
- **Atomic batch execution** — entire batch reverts if any single transfer fails
- **Non-custodial by design** — no admin key, no upgrade mechanism, no pause function

---

## The Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 (EVM) |
| Blockchain | QIE Testnet (Chain ID: 1983) |
| Gas Token | QIE |
| Frontend | Next.js 16, TypeScript, Material Design 3 |
| Wallet | RainbowKit v2 (MetaMask, Rainbow, WalletConnect, Coinbase, Trust) |
| Chain SDK | wagmi v2 + viem v2 |
| Styling | CSS custom properties, dark/light theme |

---

## Features

- ✅ Protected transfers with claim and refund
- ✅ Group split payments with auto-release
- ✅ Atomic batch transfers
- ✅ On-chain username registry with @mention resolution
- ✅ Full transaction history per user
- ✅ Live balance display in QIE
- ✅ Multi-wallet support via RainbowKit
- ✅ Light and dark mode
- ✅ Mobile responsive

---

**[Follow on X](https://x.com/protected_pay) · [View on GitHub](https://github.com/Spydiecy/ProtectedPay_Qie)**
