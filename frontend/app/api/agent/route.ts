import { createMistral } from '@ai-sdk/mistral';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createPublicClient, http, formatEther } from 'viem';

const NATIVE_SYMBOL = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'HSK';

// ── Chain definitions ─────────────────────────────────────────────────────────
const hashkeyTestnet = {
  id: 133,
  name: 'HashKey Chain Testnet',
  nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet.hsk.xyz'] } },
} as const;

const hashkeyMainnet = {
  id: 177,
  name: 'HashKey Chain',
  nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.hsk.xyz'] } },
} as const;

// ── Contract addresses per chain ──────────────────────────────────────────────
const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  133: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET || '0xF93132d75c20EfeD556EC2Bc5aC777750665D3a9') as `0x${string}`,
  177: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET || '0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6') as `0x${string}`,
};

// ── Explorer URLs per chain ───────────────────────────────────────────────────
const EXPLORER_URLS: Record<number, string> = {
  133: 'https://testnet-explorer.hsk.xyz',
  177: 'https://hashkey.blockscout.com',
};

// ── Build a chain-specific public client ──────────────────────────────────────
function getClient(chainId: number) {
  if (chainId === 177) {
    return createPublicClient({ chain: hashkeyMainnet as never, transport: http('https://mainnet.hsk.xyz') });
  }
  return createPublicClient({ chain: hashkeyTestnet as never, transport: http('https://testnet.hsk.xyz') });
}

function getNetworkName(chainId: number) {
  return chainId === 177 ? 'HashKey Chain Mainnet' : 'HashKey Chain Testnet';
}

const ABI = [
  { name: 'resolveUsername',    type: 'function', stateMutability: 'view', inputs: [{ name: 'username', type: 'string' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'getUser',            type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'username', type: 'string' }, { name: 'createdAt', type: 'uint256' }] }] },
  { name: 'isRegistered',       type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getUserEscrows',     type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'remarks', type: 'string' }] }] },
  { name: 'getUserGroups',      type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'creator', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'amountPerPerson', type: 'uint256' }, { name: 'numParticipants', type: 'uint32' }, { name: 'amountCollected', type: 'uint256' }, { name: 'contributedCount', type: 'uint32' }, { name: 'createdAt', type: 'uint256' }, { name: 'remarks', type: 'string' }, { name: 'status', type: 'uint8' }] }] },
  { name: 'getUserBatches',     type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'creator', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'recipientCount', type: 'uint32' }, { name: 'createdAt', type: 'uint256' }, { name: 'remarks', type: 'string' }] }] },
  { name: 'getUserPaymentLinks', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'linkId', type: 'bytes32' }, { name: 'creator', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'paidAt', type: 'uint256' }, { name: 'paidBy', type: 'address' }, { name: 'remarks', type: 'string' }] }] },
  { name: 'getGroupContributors', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'address[]' }] },
] as const;

const ESCROW_STATUS = ['Pending', 'Claimed', 'Refunded'];
const GROUP_STATUS  = ['Open', 'Completed', 'Cancelled'];
const LINK_STATUS   = ['Active', 'Paid', 'Cancelled'];

const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY });

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are PayBot, the friendly AI assistant built into HashKey Pay — a trustless on-chain payment platform on HashKey Chain (EVM, Chain ID 133 testnet / 177 mainnet, native gas token: ${NATIVE_SYMBOL}).

## Personality
You ONLY discuss HashKey Pay and crypto payments. You are NOT a general-purpose AI.
When asked about anything unrelated (weather, sports, news, recipes, general coding, etc.) give a short, warm, witty redirect back to HashKey Pay. Examples:
- Weather → "Not sure about the weather, but ${NATIVE_SYMBOL} transfers on HashKey Chain are flowing smoothly! Want to send some?"
- Sports → "I'm more of a payments guy! How about sending a batch payment to your team after the game?"
- Crypto prices → "I don't track prices, but I can check your ${NATIVE_SYMBOL} balance on-chain — want me to?"
Never flatly refuse. Always steer back to HashKey Pay.

## Navigation rules — CRITICAL
- NEVER invent external URLs like "https://hashkeypay.xyz/anything"
- All navigation is within the HashKey Pay dashboard sidebar: **Protected Transfer**, **Group Split**, **Batch Payment**, **Payment Links**, **History**
- Always say: "Go to the **Protected Transfer** tab in the dashboard" — never a URL

## Features

### Protected Transfer (Native ${NATIVE_SYMBOL} Escrow)
Locks ${NATIVE_SYMBOL} until the recipient claims it. Sender can refund anytime if unclaimed.
Steps: **Protected Transfer** tab → recipient (address or @username) → amount → remarks → **Create Transfer**
Recipient: **Claim** button. Sender: **Refund** button.

### Protected Token Transfer (ERC-20 Escrow)
Same as above but for any ERC-20 token. Two steps required:
1. **Protected Transfer** tab → switch to **ERC-20 Token** → paste token address → **Lookup** → fill fields → **Approve Tokens** (signs approve tx)
2. After approval: **Create Token Transfer** (signs createTokenEscrow tx)

### Group Split Payment
Multiple people split a payment equally to one recipient. Creator pays their share upfront, others join by Group ID.
Steps: **Group Split** tab → Create → recipient + total + participants + remarks → **Create Group Split**
Others join: **Group Split** tab → Contribute → enter Group ID → **Look Up** → **Contribute**
Creator can cancel (refunds all). Contributors can withdraw their share anytime before completion.

### Batch Payment
Send ${NATIVE_SYMBOL} to many addresses in one atomic tx. All succeed or all revert.
Steps: **Batch Payment** tab → add rows (recipient + amount) → remarks → **Send Batch**
Supports @username per row.

### Payment Links
Shareable link + QR code. Fixed amount or "any amount".
Steps: **Payment Links** tab → description + amount → **Create Payment Link** → copy/QR/share
When paid: both parties can download a PDF invoice from the receipt page.

### Username Registry
Register a unique on-chain name (3–30 chars). Others send to @you instead of 0x...
Say "register username spy" or "I want to register @myname" — I'll check availability and create the transaction for you.

### Transaction History
All activity (transfers, groups, batches, links) visible in the **History** tab.

## What you can do with tools
- Look up @username → address (resolveUsername)
- Check ${NATIVE_SYMBOL} balance of any address (getBalance)
- Fetch escrow, group, batch, payment link history (read-only, live on-chain data)
- Get group contributors list
- Build step-by-step instructions for creating transfers, groups, payment links

## What you CANNOT do
You cannot sign or submit transactions — the user must do that in their wallet. When they ask you to "send" something, use the build tools to get the resolved address, then give clear numbered steps pointing to the right dashboard tab.

## Formatting rules
- Use **bold** for UI element names and key terms
- Use numbered lists for steps
- Use bullet lists for features/options
- Use backtick code spans for addresses and contract values
- For quoted strings, just write: "your text" with regular quotes — NEVER wrap in asterisks
- NEVER use single asterisk italic — always use **double asterisks** for emphasis

Connected wallet: {WALLET_PLACEHOLDER}
Active network: {NETWORK_PLACEHOLDER}`;

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { messages, walletAddress, chainId } = await req.json();

  // Resolve chain-specific values — default to testnet if not provided
  const activeChainId = typeof chainId === 'number' ? chainId : 133;
  const CONTRACT_ADDRESS = CONTRACT_ADDRESSES[activeChainId] ?? CONTRACT_ADDRESSES[133];
  const EXPLORER = EXPLORER_URLS[activeChainId] ?? EXPLORER_URLS[133];
  const networkName = getNetworkName(activeChainId);
  const publicClient = getClient(activeChainId);

  const system = SYSTEM_PROMPT
    .replace('{WALLET_PLACEHOLDER}',
      walletAddress ?? 'No wallet connected — ask the user to connect their wallet before fetching their history.')
    .replace('{NETWORK_PLACEHOLDER}',
      `${networkName} (Chain ID: ${activeChainId}, Contract: \`${CONTRACT_ADDRESS}\`, Explorer: ${EXPLORER})`);

  const result = await streamText({
    model: mistral('mistral-large-latest'),
    system,
    messages,
    maxSteps: 5,
    tools: {

      resolveUsername: tool({
        description: 'Resolve an on-chain @username to a wallet address',
        parameters: z.object({ username: z.string().describe('Username without @') }),
        execute: async ({ username }) => {
          try {
            const addr = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [username] });
            if (!addr || addr === '0x0000000000000000000000000000000000000000') return { found: false, username };
            return { found: true, username, address: addr };
          } catch { return { found: false, username, error: 'Lookup failed' }; }
        },
      }),

      getUser: tool({
        description: 'Get username and registration info for a wallet address',
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const user = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getUser', args: [address as `0x${string}`] }) as { username: string; createdAt: bigint };
            const registered = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'isRegistered', args: [address as `0x${string}`] });
            return { registered, username: user.username || null, registeredAt: user.createdAt ? new Date(Number(user.createdAt) * 1000).toLocaleDateString() : null };
          } catch { return { registered: false, error: 'Lookup failed' }; }
        },
      }),

      getBalance: tool({
        description: `Get the ${NATIVE_SYMBOL} balance of a wallet address`,
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const balance = await publicClient.getBalance({ address: address as `0x${string}` });
            return { address, balance: formatEther(balance), symbol: NATIVE_SYMBOL };
          } catch { return { error: 'Failed to fetch balance' }; }
        },
      }),

      getEscrowHistory: tool({
        description: 'Get protected transfers (escrows) for a wallet address',
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const raw = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getUserEscrows', args: [address as `0x${string}`] }) as readonly { id: bigint; sender: string; recipient: string; amount: bigint; createdAt: bigint; status: number; remarks: string }[];
            return { count: raw.length, recent: [...raw].reverse().slice(0, 10).map(e => ({ id: String(e.id), sender: e.sender, recipient: e.recipient, amount: `${parseFloat(formatEther(e.amount)).toFixed(4)} ${NATIVE_SYMBOL}`, status: ESCROW_STATUS[e.status] ?? 'Unknown', remarks: e.remarks, date: new Date(Number(e.createdAt) * 1000).toLocaleDateString() })) };
          } catch { return { error: 'Failed' }; }
        },
      }),

      getGroupHistory: tool({
        description: 'Get group split payments for a wallet address',
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const raw = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getUserGroups', args: [address as `0x${string}`] }) as readonly { id: bigint; creator: string; recipient: string; totalAmount: bigint; amountPerPerson: bigint; numParticipants: number; contributedCount: number; createdAt: bigint; remarks: string; status: number }[];
            return { count: raw.length, recent: [...raw].reverse().slice(0, 10).map(g => ({ id: String(g.id), creator: g.creator, recipient: g.recipient, totalAmount: `${parseFloat(formatEther(g.totalAmount)).toFixed(4)} ${NATIVE_SYMBOL}`, perPerson: `${parseFloat(formatEther(g.amountPerPerson)).toFixed(4)} ${NATIVE_SYMBOL}`, participants: `${Number(g.contributedCount)}/${Number(g.numParticipants)}`, status: GROUP_STATUS[g.status] ?? 'Unknown', remarks: g.remarks, date: new Date(Number(g.createdAt) * 1000).toLocaleDateString() })) };
          } catch { return { error: 'Failed' }; }
        },
      }),

      getBatchHistory: tool({
        description: 'Get batch payments for a wallet address',
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const raw = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getUserBatches', args: [address as `0x${string}`] }) as readonly { id: bigint; totalAmount: bigint; recipientCount: number; createdAt: bigint; remarks: string }[];
            return { count: raw.length, recent: [...raw].reverse().slice(0, 10).map(b => ({ id: String(b.id), totalAmount: `${parseFloat(formatEther(b.totalAmount)).toFixed(4)} ${NATIVE_SYMBOL}`, recipients: Number(b.recipientCount), remarks: b.remarks, date: new Date(Number(b.createdAt) * 1000).toLocaleDateString() })) };
          } catch { return { error: 'Failed' }; }
        },
      }),

      getPaymentLinks: tool({
        description: 'Get payment links created by a wallet address',
        parameters: z.object({ address: z.string() }),
        execute: async ({ address }) => {
          try {
            const raw = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getUserPaymentLinks', args: [address as `0x${string}`] }) as readonly { linkId: `0x${string}`; amount: bigint; description: string; status: number; createdAt: bigint; paidAt: bigint; paidBy: string }[];
            return { count: raw.length, recent: [...raw].reverse().slice(0, 10).map(l => ({ linkId: l.linkId, amount: l.amount === 0n ? 'Any' : `${parseFloat(formatEther(l.amount)).toFixed(4)} ${NATIVE_SYMBOL}`, description: l.description, status: LINK_STATUS[l.status] ?? 'Unknown', paidBy: l.paidBy !== '0x0000000000000000000000000000000000000000' ? l.paidBy : null, paidAt: l.paidAt > 0n ? new Date(Number(l.paidAt) * 1000).toLocaleDateString() : null, createdAt: new Date(Number(l.createdAt) * 1000).toLocaleDateString() })) };
          } catch { return { error: 'Failed' }; }
        },
      }),

      getGroupContributors: tool({
        description: 'Get contributors list for a group payment ID',
        parameters: z.object({ groupId: z.string() }),
        execute: async ({ groupId }) => {
          try {
            const addrs = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getGroupContributors', args: [BigInt(groupId)] }) as readonly string[];
            return { groupId, contributors: addrs, count: addrs.length };
          } catch { return { error: 'Failed' }; }
        },
      }),

      buildEscrow: tool({
        description: 'Resolve recipient and give step-by-step instructions for creating a protected transfer',
        parameters: z.object({ recipient: z.string(), amount: z.string(), remarks: z.string() }),
        execute: async ({ recipient, amount, remarks }) => {
          let addr = recipient;
          if (!recipient.startsWith('0x')) {
            const uname = recipient.startsWith('@') ? recipient.slice(1) : recipient;
            const resolved = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [uname] }) as string;
            if (!resolved || resolved === '0x0000000000000000000000000000000000000000') return { error: `@${uname} not found on-chain` };
            addr = resolved;
          }
          return { resolvedAddress: addr, amount, remarks, steps: [`Go to the **Protected Transfer** tab in the dashboard`, `Recipient: paste \`${addr}\``, `Amount: ${amount} ${NATIVE_SYMBOL}`, `Remarks: "${remarks}"`, `Click **Create Transfer** and confirm in your wallet`] };
        },
      }),

      buildGroupPayment: tool({
        description: 'Resolve recipient and give steps for creating a group split payment',
        parameters: z.object({ recipient: z.string(), totalAmount: z.string(), participants: z.number().int().min(2), remarks: z.string() }),
        execute: async ({ recipient, totalAmount, participants, remarks }) => {
          let addr = recipient;
          if (!recipient.startsWith('0x')) {
            const uname = recipient.startsWith('@') ? recipient.slice(1) : recipient;
            const resolved = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [uname] }) as string;
            if (!resolved || resolved === '0x0000000000000000000000000000000000000000') return { error: `@${uname} not found on-chain` };
            addr = resolved;
          }
          const perPerson = (parseFloat(totalAmount) / participants).toFixed(6);
          return { resolvedAddress: addr, totalAmount, participants, perPerson, remarks, steps: [`Go to the **Group Split** tab in the dashboard`, `Recipient: \`${addr}\``, `Total amount: ${totalAmount} ${NATIVE_SYMBOL}`, `Participants: ${participants}`, `Remarks: "${remarks}"`, `Click **Create Group Split** — you pay ${perPerson} ${NATIVE_SYMBOL} upfront`, `Share the Group ID with others so they can contribute`] };
        },
      }),

      buildBatchTransfer: tool({
        description: 'Resolve recipients and give steps for a batch payment',
        parameters: z.object({
          recipients: z.array(z.object({ address: z.string(), amount: z.string() })),
          remarks: z.string(),
        }),
        execute: async ({ recipients, remarks }) => {
          const resolved = await Promise.all(recipients.map(async (r) => {
            if (r.address.startsWith('0x') && r.address.length === 42) return r;
            const uname = r.address.startsWith('@') ? r.address.slice(1) : r.address;
            const addr = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [uname] }) as string;
            if (!addr || addr === '0x0000000000000000000000000000000000000000') return { ...r, error: `@${uname} not found` };
            return { address: addr, amount: r.amount };
          }));
          const failed = resolved.filter(r => 'error' in r);
          if (failed.length > 0) return { error: failed.map(f => (f as { error: string }).error).join(', ') };
          const total = resolved.reduce((s, r) => s + parseFloat(r.amount), 0);
          return { resolvedRecipients: resolved, remarks, total: total.toFixed(6), steps: [`Go to the **Batch Payment** tab`, `Add ${resolved.length} recipients`, `Click **Send Batch** and confirm in wallet`] };
        },
      }),

      buildTokenEscrow: tool({
        description: 'Give steps for creating a protected ERC-20 token transfer (two steps: approve then create)',
        parameters: z.object({
          tokenAddress: z.string().describe('ERC-20 token contract address'),
          recipient: z.string().describe('Recipient address or @username'),
          amount: z.string().describe('Token amount'),
          remarks: z.string(),
        }),
        execute: async ({ tokenAddress, recipient, amount, remarks }) => {
          let addr = recipient;
          if (!recipient.startsWith('0x')) {
            const uname = recipient.startsWith('@') ? recipient.slice(1) : recipient;
            const resolved = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [uname] }) as string;
            if (!resolved || resolved === '0x0000000000000000000000000000000000000000') return { error: `@${uname} not found` };
            addr = resolved;
          }
          return { tokenAddress, resolvedAddress: addr, amount, remarks, steps: [`Go to **Protected Transfer** tab`, `Switch to **ERC-20 Token**`, `Token: ${tokenAddress}`, `Recipient: ${addr}`, `Amount: ${amount}`, `Click **Approve Tokens** (wallet popup 1)`, `Click **Create Token Transfer** (wallet popup 2)`] };
        },
      }),

      claimEscrow: tool({
        description: 'Give the escrow ID needed to claim a pending protected transfer',
        parameters: z.object({ escrowId: z.string().describe('The escrow ID to claim') }),
        execute: async ({ escrowId }) => {
          return { escrowId, action: 'claimEscrow', steps: [`Go to **Protected Transfer** tab`, `Find escrow #${escrowId}`, `Click **Claim** button`] };
        },
      }),

      refundEscrow: tool({
        description: 'Give the escrow ID needed to refund a pending protected transfer',
        parameters: z.object({ escrowId: z.string().describe('The escrow ID to refund') }),
        execute: async ({ escrowId }) => {
          return { escrowId, action: 'refundEscrow', steps: [`Go to **Protected Transfer** tab`, `Find escrow #${escrowId}`, `Click **Refund** button`] };
        },
      }),

      contributeToGroup: tool({
        description: 'Look up a group payment and give steps to contribute to it',
        parameters: z.object({ groupId: z.string() }),
        execute: async ({ groupId }) => {
          try {
            const GROUP_ABI = [{ name: 'getGroupPayment', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'creator', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'amountPerPerson', type: 'uint256' }, { name: 'numParticipants', type: 'uint32' }, { name: 'amountCollected', type: 'uint256' }, { name: 'contributedCount', type: 'uint32' }, { name: 'createdAt', type: 'uint256' }, { name: 'remarks', type: 'string' }, { name: 'status', type: 'uint8' }] }] }] as const;
            const g = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: GROUP_ABI, functionName: 'getGroupPayment', args: [BigInt(groupId)] }) as { amountPerPerson: bigint; numParticipants: number; contributedCount: number; status: number };
            if (g.status !== 0) return { error: `Group #${groupId} is not open` };
            const perPerson = formatEther(g.amountPerPerson);
            return { groupId, action: 'contributeToGroup', amountPerPerson: String(g.amountPerPerson), perPersonDisplay: perPerson, spots: `${Number(g.contributedCount)}/${Number(g.numParticipants)}` };
          } catch {
            return { groupId, action: 'contributeToGroup', amountPerPerson: '0', perPersonDisplay: 'unknown' };
          }
        },
      }),

      buildRegisterUsername: tool({
        description: 'Build a username registration transaction. Use this when the user wants to register an on-chain username.',
        parameters: z.object({ username: z.string().min(3).max(30).describe('The username to register (3-30 chars, no @)') }),
        execute: async ({ username }) => {
          try {
            const addr = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'resolveUsername', args: [username] }) as string;
            if (addr && addr !== '0x0000000000000000000000000000000000000000') return { error: `@${username} is already taken by ${addr.slice(0, 8)}…` };
          } catch { /* not taken */ }
          return { username, steps: [`Click **Register @${username}** below — confirm in your wallet`, `Once confirmed, @${username} will resolve to your address on-chain`] };
        },
      }),

      buildPaymentLink: tool({
        description: 'Give steps for creating a payment link',
        parameters: z.object({ amount: z.string(), description: z.string() }),
        execute: async ({ amount, description }) => {
          const isAny = amount === '0' || amount.toLowerCase() === 'any';
          return { amount: isAny ? '0' : amount, description, steps: ['Go to the Payment Links tab', 'Fill description: ' + description, isAny ? 'Check Any amount' : 'Amount: ' + amount + ' ' + NATIVE_SYMBOL, 'Click Create Payment Link', 'Copy the link or download the QR code'] };
        },
      }),

    },
  });

  return result.toDataStreamResponse();
}
