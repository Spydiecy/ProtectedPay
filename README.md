# ProtectedPay

**Trustless payments on Portaldot. No middlemen. No broken promises.**

---

## The Problem

Sending money on-chain is still broken in ways that matter.

You send funds to someone — and then what? You hope they deliver. You hope they don't disappear. You hope the address was right. There's no recourse, no protection, no way to coordinate a group payment without someone holding the bag. Crypto made money programmable, but most payment flows still rely on trust.

That's the gap ProtectedPay fills.

---

## What We Built

ProtectedPay is a payment infrastructure layer built as an ink! smart contract on Portaldot. It gives users four primitives that don't exist anywhere else on the chain:

### 🔒 Protected Transfer
Lock funds in a smart contract. The recipient claims when they're ready. If they don't — you get it back. No escrow service. No third party. The contract is the escrow.

### 👥 Group Split
Need to pool money from multiple people before paying someone? Set a total, set a participant count, and let contributors join. The moment the last person pays in, the full amount auto-releases to the recipient. No one holds the funds in between.

### ⚡ Batch Payment
One transaction. Multiple recipients. Different amounts. All atomic — either every transfer succeeds, or none of them do. Built for payroll, airdrops, and anything that involves paying more than one person at once.

### 🌐 Username Registry
Addresses are 48 characters of anxiety. Register a human-readable username on-chain. Anyone can resolve `@yourname` to your address instantly. Send to people, not strings.

---

## Why Portaldot

Portaldot isn't just another EVM chain with a different token. It's a Substrate-based runtime with pallet-contracts — which means ink! smart contracts run natively, gas is paid in POT, and the execution environment is deterministic and auditable in ways EVM chains aren't.

ProtectedPay is a natural fit because:

- **POT as gas** — every interaction on ProtectedPay uses POT, Portaldot's native token. There's no wrapped token, no bridging, no abstraction layer between the user and the chain.
- **ink! for correctness** — the contract is written in ink! v5.1, which compiles to WASM and runs inside pallet-contracts. The CEI (Checks-Effects-Interactions) pattern is enforced throughout, making reentrancy attacks structurally impossible.
- **On-chain identity** — the username registry is fully on-chain with no off-chain indexer. Portaldot's storage model makes this efficient and queryable directly from the contract.
- **Substrate composability** — as Portaldot's ecosystem grows, ProtectedPay's primitives can be composed with other pallets and contracts without leaving the native runtime.

---

## What Makes This Different

Most "escrow" products are custodial. A company holds your funds and promises to release them under certain conditions. ProtectedPay has no company in the loop. The contract code is the only authority. It's open source, deployed on-chain, and verifiable by anyone.

Most "batch payment" tools are off-chain scripts that submit multiple transactions. ProtectedPay's batch is a single atomic transaction — if one transfer fails, the entire batch reverts. No partial payouts. No manual cleanup.

Most "group payment" flows require someone to collect money and then pay out. ProtectedPay's group split holds funds in the contract until the threshold is met, then releases automatically. The creator can't run with the money. Neither can anyone else.

---

## The Stack

| Layer | Technology |
|---|---|
| Smart Contract | ink! v5.1 (Rust) |
| Blockchain | Portaldot (substrate-contracts-node) |
| Gas Token | POT |
| Frontend | Next.js 16, TypeScript, Material Design 3 |
| Wallet | Polkadot.js, SubWallet, Talisman |
| Deployment | Python substrate-interface |

---

## Contract

```
Address:  5EXhCTjWL5FoaVFTMBZfeMKKHk5cZchHUW3KQ73bpZUxm85J
Network:  Portaldot (local)
Pallet:   pallet-contracts v16
ink!:     v5.1.1
License:  MIT
```

---

## Security

The contract is built with security as a first principle, not an afterthought:

- **CEI pattern** on every state-changing function — state updates happen before any token transfer, making reentrancy structurally impossible
- **Checked arithmetic** throughout — `checked_div`, `checked_mul`, `saturating_add` everywhere integers are involved
- **Access control** on every sensitive operation — only the sender can refund, only the recipient can claim, only the creator can cancel
- **Atomic batch execution** — the entire batch reverts if any single transfer fails
- **Non-custodial by design** — no admin key, no upgrade mechanism, no pause function

---

## Built for Portaldot Mini Hackathon S1

> *"Portaldot hackathon support confirmed that Season 1 runs on localhost as the official setup. The local dev node runs the real Portaldot runtime and uses POT for on-chain fees. A local transaction hash counts as native deployment evidence."*

ProtectedPay was built specifically for this environment — not ported from another chain, not adapted from an EVM contract. Every design decision was made with Portaldot's runtime in mind.

---

**[Follow on X](https://x.com/protected_pay) · [View on GitHub](https://github.com/Spydiecy/ProtectedPay_Portaldot)**
