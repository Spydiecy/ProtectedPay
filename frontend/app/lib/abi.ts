export const PROTECTED_PAY_ABI = [
  // ── User Registry ──────────────────────────────────────────────────────────
  {
    name: 'registerUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [],
  },
  {
    name: 'getUser',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'tuple', components: [{ name: 'username', type: 'string' }, { name: 'createdAt', type: 'uint256' }] }],
  },
  {
    name: 'resolveUsername',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ── Escrow ─────────────────────────────────────────────────────────────────
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'recipient', type: 'address' }, { name: 'remarks', type: 'string' }],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'claimEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refundEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'id', type: 'uint256' },
        { name: 'sender', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'remarks', type: 'string' },
      ]
    }],
  },
  {
    name: 'getUserEscrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]', components: [
        { name: 'id', type: 'uint256' },
        { name: 'sender', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'remarks', type: 'string' },
      ]
    }],
  },
  {
    name: 'totalEscrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ── Token Escrow ───────────────────────────────────────────────────────────
  {
    name: 'createTokenEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',     type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount',    type: 'uint256' },
      { name: 'remarks',   type: 'string'  },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'claimTokenEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refundTokenEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getTokenEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'id',        type: 'uint256'  },
        { name: 'token',     type: 'address'  },
        { name: 'sender',    type: 'address'  },
        { name: 'recipient', type: 'address'  },
        { name: 'amount',    type: 'uint256'  },
        { name: 'createdAt', type: 'uint256'  },
        { name: 'status',    type: 'uint8'    },
        { name: 'remarks',   type: 'string'   },
      ]
    }],
  },
  {
    name: 'getUserTokenEscrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]', components: [
        { name: 'id',        type: 'uint256'  },
        { name: 'token',     type: 'address'  },
        { name: 'sender',    type: 'address'  },
        { name: 'recipient', type: 'address'  },
        { name: 'amount',    type: 'uint256'  },
        { name: 'createdAt', type: 'uint256'  },
        { name: 'status',    type: 'uint8'    },
        { name: 'remarks',   type: 'string'   },
      ]
    }],
  },
  {
    name: 'totalTokenEscrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTokenInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'tokenName',     type: 'string' },
      { name: 'tokenSymbol',   type: 'string' },
      { name: 'tokenDecimals', type: 'uint8'  },
    ],
  },

  // ── Group Payments ─────────────────────────────────────────────────────────
  {
    name: 'createGroupPayment',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'numParticipants', type: 'uint32' },
      { name: 'remarks', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'contributeToGroup',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelGroupPayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawContribution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getGroupPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'id', type: 'uint256' },
        { name: 'creator', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'amountPerPerson', type: 'uint256' },
        { name: 'numParticipants', type: 'uint32' },
        { name: 'amountCollected', type: 'uint256' },
        { name: 'contributedCount', type: 'uint32' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'remarks', type: 'string' },
        { name: 'status', type: 'uint8' },
      ]
    }],
  },
  {
    name: 'getContribution',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }, { name: 'contributor', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getGroupContributors',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getUserGroups',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]', components: [
        { name: 'id', type: 'uint256' },
        { name: 'creator', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'amountPerPerson', type: 'uint256' },
        { name: 'numParticipants', type: 'uint32' },
        { name: 'amountCollected', type: 'uint256' },
        { name: 'contributedCount', type: 'uint32' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'remarks', type: 'string' },
        { name: 'status', type: 'uint8' },
      ]
    }],
  },
  {
    name: 'totalGroupPayments',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ── Batch Payments ─────────────────────────────────────────────────────────
  {
    name: 'batchTransfer',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'remarks', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'getBatchPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'id', type: 'uint256' },
        { name: 'creator', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'recipientCount', type: 'uint32' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'remarks', type: 'string' },
      ]
    }],
  },
  {
    name: 'getBatchRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }, { name: 'index', type: 'uint32' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'account', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ]
    }],
  },
  {
    name: 'getUserBatches',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]', components: [
        { name: 'id', type: 'uint256' },
        { name: 'creator', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'recipientCount', type: 'uint32' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'remarks', type: 'string' },
      ]
    }],
  },
  {
    name: 'totalBatchPayments',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ── Payment Links ──────────────────────────────────────────────────────────
  {
    name: 'createPaymentLink',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount',      type: 'uint256' },
      { name: 'description', type: 'string'  },
    ],
    outputs: [{ name: 'linkId', type: 'bytes32' }],
  },
  {
    name: 'payLink',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'linkId',  type: 'bytes32' },
      { name: 'remarks', type: 'string'  },
    ],
    outputs: [],
  },
  {
    name: 'cancelPaymentLink',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'linkId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getPaymentLink',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'linkId', type: 'bytes32' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'linkId',      type: 'bytes32' },
        { name: 'creator',     type: 'address' },
        { name: 'amount',      type: 'uint256' },
        { name: 'description', type: 'string'  },
        { name: 'status',      type: 'uint8'   },
        { name: 'createdAt',   type: 'uint256' },
        { name: 'paidAt',      type: 'uint256' },
        { name: 'paidBy',      type: 'address' },
        { name: 'remarks',     type: 'string'  },
      ]
    }],
  },
  {
    name: 'getUserPaymentLinks',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple[]', components: [
        { name: 'linkId',      type: 'bytes32' },
        { name: 'creator',     type: 'address' },
        { name: 'amount',      type: 'uint256' },
        { name: 'description', type: 'string'  },
        { name: 'status',      type: 'uint8'   },
        { name: 'createdAt',   type: 'uint256' },
        { name: 'paidAt',      type: 'uint256' },
        { name: 'paidBy',      type: 'address' },
        { name: 'remarks',     type: 'string'  },
      ]
    }],
  },

  // ── Events ─────────────────────────────────────────────────────────────────
  { name: 'UsernameRegistered', type: 'event', inputs: [{ name: 'account', type: 'address', indexed: true }, { name: 'username', type: 'string', indexed: false }] },
  { name: 'EscrowCreated',      type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'sender', type: 'address', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'remarks', type: 'string', indexed: false }] },
  { name: 'EscrowClaimed',      type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'EscrowRefunded',     type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'sender', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'TokenEscrowCreated',  type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'token', type: 'address', indexed: true }, { name: 'sender', type: 'address', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'remarks', type: 'string', indexed: false }] },
  { name: 'TokenEscrowClaimed',  type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'token', type: 'address', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'TokenEscrowRefunded', type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'token', type: 'address', indexed: true }, { name: 'sender', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'GroupPaymentCreated',   type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'numParticipants', type: 'uint32', indexed: false }] },
  { name: 'GroupContributed',      type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'contributor', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'GroupPaymentCompleted', type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'totalAmount', type: 'uint256', indexed: false }] },
  { name: 'GroupPaymentCancelled', type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'refunded', type: 'uint256', indexed: false }] },
  { name: 'GroupContributorRefunded', type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'contributor', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'BatchPaymentExecuted',  type: 'event', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'recipientCount', type: 'uint32', indexed: false }] },
  { name: 'PaymentLinkCreated',   type: 'event', inputs: [{ name: 'linkId', type: 'bytes32', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'description', type: 'string', indexed: false }] },
  { name: 'PaymentLinkPaid',      type: 'event', inputs: [{ name: 'linkId', type: 'bytes32', indexed: true }, { name: 'payer', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'remarks', type: 'string', indexed: false }] },
  { name: 'PaymentLinkCancelled', type: 'event', inputs: [{ name: 'linkId', type: 'bytes32', indexed: true }, { name: 'creator', type: 'address', indexed: true }] },
] as const;

// Status enums matching the Solidity contract
export const EscrowStatus = { Pending: 0, Claimed: 1, Refunded: 2 } as const;
export const GroupStatus  = { Open: 0, Completed: 1, Cancelled: 2 } as const;

export const ESCROW_STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Claimed',
  2: 'Refunded',
};

export const GROUP_STATUS_LABEL: Record<number, string> = {
  0: 'Open',
  1: 'Completed',
  2: 'Cancelled',
};
