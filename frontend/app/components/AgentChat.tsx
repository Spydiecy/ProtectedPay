'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { usePathname } from 'next/navigation';
import { parseEther } from 'viem';
import { PROTECTED_PAY_ABI } from '../lib/abi';
import { getContractAddress } from '../lib/wagmi';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown, Zap, CheckCircle2 } from 'lucide-react';

interface PendingAction {
  type: 'createEscrow' | 'createGroupPayment' | 'createPaymentLink' | 'batchTransfer' | 'claimEscrow' | 'refundEscrow' | 'contributeToGroup' | 'registerUsername';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  label: string;
  value?: bigint;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MsgMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  const muted  = isUser ? 'rgba(255,255,255,0.85)' : 'var(--foreground-muted)';
  const strong = isUser ? '#fff' : 'var(--foreground)';
  const codeBg = isUser ? 'rgba(0,0,0,0.2)' : 'var(--surface-active)';
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  const fmt = (line: string, key: string | number) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} style={{ color: strong, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
          if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={j} style={{ color: muted, fontStyle: 'italic' }}>{p.slice(1, -1)}</em>;
          if (p.startsWith('`') && p.endsWith('`')) return <code key={j} style={{ fontFamily: 'monospace', fontSize: '0.82em', background: codeBg, padding: '1px 5px', borderRadius: 4, color: isUser ? '#fff' : 'var(--primary)' }}>{p.slice(1, -1)}</code>;
          return <span key={j}>{p}</span>;
        })}
      </span>
    );
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { nodes.push(<div key={`s${i}`} style={{ height: 5 }} />); i++; continue; }
    if (line.trim() === '---') { nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />); i++; continue; }
    if (line.startsWith('### ')) { nodes.push(<p key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--primary)', textTransform: 'uppercase', marginTop: 6, marginBottom: 2 }}>{line.slice(4)}</p>); i++; continue; }
    if (line.startsWith('## '))  { nodes.push(<p key={i} style={{ fontSize: 13, fontWeight: 800, color: strong, marginTop: 6, marginBottom: 2 }}>{line.slice(3)}</p>); i++; continue; }
    if (line.startsWith('# '))   { nodes.push(<p key={i} style={{ fontSize: 14, fontWeight: 800, color: strong, marginTop: 6, marginBottom: 3 }}>{line.slice(2)}</p>); i++; continue; }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) { items.push(<li key={i} style={{ marginBottom: 2 }}>{fmt(lines[i].slice(2), i)}</li>); i++; }
      nodes.push(<ul key={`u${i}`} style={{ listStyle: 'disc', paddingLeft: 16, margin: '3px 0', color: muted }}>{items}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(<li key={i} style={{ marginBottom: 2 }}>{fmt(lines[i].replace(/^\d+\. /, ''), i)}</li>); i++; }
      nodes.push(<ol key={`o${i}`} style={{ listStyle: 'decimal', paddingLeft: 18, margin: '3px 0', color: muted }}>{items}</ol>);
      continue;
    }
    nodes.push(<p key={i} style={{ margin: 0, color: muted, lineHeight: 1.65 }}>{fmt(line, i)}</p>);
    i++;
  }
  return <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 2 }}>{nodes}</div>;
}

// ── Extract action from tool invocations ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAction(invocations: any[]): PendingAction | null {
  for (const inv of invocations) {
    if (inv.state !== 'result') continue;
    const r = inv.result;
    if (!r || r.error) continue;
    if (inv.toolName === 'buildEscrow' && r.resolvedAddress && r.amount) {
      const wei = (() => { try { return parseEther(r.amount); } catch { return null; } })();
      if (!wei) continue;
      return { type: 'createEscrow', params: { recipient: r.resolvedAddress, remarks: r.remarks ?? '' }, label: `Send ${r.amount} HSK → ${r.resolvedAddress.slice(0, 8)}…`, value: wei };
    }
    if (inv.toolName === 'buildGroupPayment' && r.resolvedAddress && r.totalAmount) {
      const perWei   = (() => { try { return parseEther(r.perPerson); }   catch { return null; } })();
      const totalWei = (() => { try { return parseEther(r.totalAmount); } catch { return null; } })();
      if (!perWei || !totalWei) continue;
      return { type: 'createGroupPayment', params: { recipient: r.resolvedAddress, totalAmount: totalWei, participants: r.participants, remarks: r.remarks ?? '' }, label: `Create Group: ${r.totalAmount} HSK ÷ ${r.participants}`, value: perWei };
    }
    if (inv.toolName === 'buildPaymentLink' && r.description !== undefined) {
      const weiAmt = r.amount === '0' ? 0n : (() => { try { return parseEther(r.amount); } catch { return 0n; } })();
      return { type: 'createPaymentLink', params: { amount: weiAmt, description: r.description }, label: `Create Payment Link: "${r.description}"`, value: undefined };
    }
    if (inv.toolName === 'buildBatchTransfer' && r.resolvedRecipients) {
      const addrs   = r.resolvedRecipients.map((x: { address: string }) => x.address);
      const amounts = r.resolvedRecipients.map((x: { amount: string }) => { try { return parseEther(x.amount); } catch { return 0n; } });
      const total   = amounts.reduce((s: bigint, a: bigint) => s + a, 0n);
      return { type: 'batchTransfer', params: { recipients: addrs, amounts, remarks: r.remarks }, label: `Batch to ${addrs.length} recipients · ${r.total} HSK`, value: total };
    }
    if (inv.toolName === 'claimEscrow'   && r.escrowId) return { type: 'claimEscrow',   params: { id: r.escrowId },          label: `Claim Escrow #${r.escrowId}`,   value: undefined };
    if (inv.toolName === 'refundEscrow'  && r.escrowId) return { type: 'refundEscrow',  params: { id: r.escrowId },          label: `Refund Escrow #${r.escrowId}`,  value: undefined };
    if (inv.toolName === 'contributeToGroup' && r.groupId) {
      const perWei = r.amountPerPerson ? BigInt(r.amountPerPerson) : undefined;
      return { type: 'contributeToGroup', params: { groupId: r.groupId }, label: `Contribute to Group #${r.groupId}${r.perPersonDisplay ? ` · ${r.perPersonDisplay} HSK` : ''}`, value: perWei };
    }
    if (inv.toolName === 'buildRegisterUsername' && r.username) {
      return { type: 'registerUsername', params: { username: r.username }, label: `Register @${r.username}`, value: undefined };
    }
  }
  return null;
}

// ── Transaction button ────────────────────────────────────────────────────────
function TxButton({ action, onDone }: { action: PendingAction; onDone: (msg: string) => void }) {
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const [txHash,  setTxHash]   = useState<`0x${string}` | undefined>();
  const [phase,   setPhase]    = useState<'idle' | 'wallet' | 'mining' | 'done' | 'error'>('idle');
  const [errMsg,  setErrMsg]   = useState('');

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && phase === 'mining') {
      setPhase('done');
      setTimeout(() => onDone(`✅ ${action.label} confirmed!`), 300);
    }
  }, [isSuccess, phase, action.label, onDone]);

  const execute = useCallback(async () => {
    const contractAddress = getContractAddress(chainId);
    setPhase('wallet');
    try {
      let hash: `0x${string}`;
      if      (action.type === 'createEscrow')      hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'createEscrow',      args: [action.params.recipient, action.params.remarks],                                                          value: action.value });
      else if (action.type === 'createGroupPayment') hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'createGroupPayment', args: [action.params.recipient, action.params.totalAmount, action.params.participants, action.params.remarks], value: action.value });
      else if (action.type === 'createPaymentLink')  hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'createPaymentLink',  args: [action.params.amount, action.params.description] });
      else if (action.type === 'batchTransfer')      hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'batchTransfer',      args: [action.params.recipients, action.params.amounts, action.params.remarks],                              value: action.value });
      else if (action.type === 'claimEscrow')        hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'claimEscrow',        args: [BigInt(action.params.id)] });
      else if (action.type === 'refundEscrow')       hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'refundEscrow',       args: [BigInt(action.params.id)] });
      else if (action.type === 'contributeToGroup')  hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'contributeToGroup',  args: [BigInt(action.params.groupId)],                                                                        value: action.value ?? 0n });
      else if (action.type === 'registerUsername')   hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'registerUsername',   args: [action.params.username] });
      else { setPhase('idle'); return; }
      setTxHash(hash);
      setPhase('mining');
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message.slice(0, 80) : 'Transaction rejected');
      setPhase('error');
    }
  }, [action, chainId, writeContractAsync]);

  if (phase === 'done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.35)', marginTop: 10 }}>
        <CheckCircle2 size={16} color="var(--primary)" />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>Transaction confirmed!</span>
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--error-container)', border: '1px solid var(--error)', marginTop: 10, fontSize: 12.5, color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span>{errMsg}</span>
        <button onClick={() => setPhase('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 12, textDecoration: 'underline', flexShrink: 0 }}>retry</button>
      </div>
    );
  }

  const busy = phase === 'wallet' || phase === 'mining';
  return (
    <button onClick={execute} disabled={busy}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 12, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 700, marginTop: 10, boxShadow: '0 4px 16px rgba(45,212,191,0.3)', opacity: busy ? 0.75 : 1, transition: 'opacity 0.15s' }}>
      {phase === 'mining'  ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Confirming on-chain…</>
     : phase === 'wallet' ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Confirm in wallet…</>
     :                      <><Zap size={15} />{action.label}</>}
    </button>
  );
}

// ── Main AgentChat ────────────────────────────────────────────────────────────
export default function AgentChat() {
  const { address } = useAccount();
  const chainId = useChainId();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append } = useChat({
    api: '/api/agent',
    body: { walletAddress: address ?? null, chainId: chainId ?? 133 },
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `Hey! I'm **PayBot** 👋 — your HashKey Pay assistant.\n\nI can help you with:\n- Protected transfers (native & ERC-20 tokens)\n- Group split payments\n- Batch payments\n- Payment links & QR codes\n- Checking your transaction history\n\nJust ask in plain English — and I can trigger the wallet popup right here!`,
    }],
  });

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    else if (messages.length > 1) setHasNew(true);
  }, [messages, open]);

  useEffect(() => { if (open) setHasNew(false); }, [open]);

  if (pathname?.startsWith('/pay')) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);
  };

  const QUICK = [
    'Check my history',
    'Send 0.5 HSK to @spy as escrow',
    'Create a payment link for 1 HSK',
    'How does group split work?',
  ];

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(45,212,191,0.4)', transition: 'transform 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        title="PayBot"
      >
        {open ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
        {hasNew && !open && <span style={{ position: 'absolute', top: 3, right: 3, width: 11, height: 11, borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--background)' }} />}
      </button>

      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 9998, width: 520, height: 680, background: 'var(--surface-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={17} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>PayBot</p>
              <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 2 }}>
                {address ? `Connected · ${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect wallet to execute transactions'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', padding: 4, display: 'flex' }}>
              <X size={17} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map(m => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const invocations = (m as any).toolInvocations ?? [];
              const action = invocations.length > 0 ? extractAction(invocations) : null;
              return (
                <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? 'var(--primary-container)' : 'rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {m.role === 'user' ? <User size={14} color="var(--on-primary-container)" /> : <Bot size={14} color="var(--primary)" />}
                  </div>
                  <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column' }}>
                    {typeof m.content === 'string' && m.content && (
                      <div style={{ padding: '11px 15px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.role === 'user' ? 'var(--primary)' : 'var(--surface-elevated)', border: m.role === 'user' ? 'none' : '1px solid var(--border)' }}>
                        <MsgMarkdown text={m.content} isUser={m.role === 'user'} />
                      </div>
                    )}
                    {action && m.role === 'assistant' && (
                      address
                        ? <TxButton key={m.id} action={action} onDone={(msg) => append({ role: 'user', content: msg })} />
                        : <div style={{ marginTop: 8, padding: '9px 13px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--foreground-muted)' }}>Connect your wallet to execute this.</div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} color="var(--primary)" />
                </div>
                <div style={{ padding: '11px 15px', borderRadius: '4px 16px 16px 16px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={14} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--foreground-subtle)' }}>Thinking…</span>
                </div>
              </div>
            )}
            {error && (
              <div style={{ padding: '11px 15px', borderRadius: 12, background: 'var(--error-container)', border: '1px solid var(--error)', fontSize: 12.5, color: 'var(--error)' }}>
                Request failed. Check MISTRAL_API_KEY and restart the server.
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div style={{ padding: '10px 18px', display: 'flex', flexWrap: 'wrap', gap: 7, flexShrink: 0 }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => append({ role: 'user', content: q })} disabled={isLoading}
                  style={{ padding: '6px 13px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground-muted)'; }}
                >{q}</button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0, background: 'var(--surface-elevated)' }}>
            <input value={input} onChange={handleInputChange} placeholder="Ask PayBot anything about HashKey Pay…" disabled={isLoading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 999, background: 'var(--surface-card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 13.5, outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button type="submit" disabled={!input.trim() || isLoading}
              style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() && !isLoading ? 'var(--primary)' : 'var(--surface-active)', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
              <Send size={16} color={input.trim() && !isLoading ? 'var(--primary-fg)' : 'var(--foreground-subtle)'} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
