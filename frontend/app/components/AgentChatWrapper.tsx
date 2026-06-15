'use client';

import dynamic from 'next/dynamic';

// Loaded client-side only — uses wagmi hooks + browser APIs
const AgentChat = dynamic(() => import('./AgentChat'), { ssr: false });

export default function AgentChatWrapper() {
  return <AgentChat />;
}
