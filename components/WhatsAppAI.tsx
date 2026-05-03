import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlanGate from './PlanGate';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://orcavi-api.vercel.app';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const suggestions = [
  'Como está meu saldo?',
  'Qual minha maior despesa este mês?',
  'Estou gastando demais?',
  'Posso fazer uma compra grande agora?',
];

const renderText = (text: string) =>
  text.split('\n').map((line, i) => (
    <p key={i} style={{ margin: i > 0 ? '4px 0 0' : 0, lineHeight: 1.5 }}>
      {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      )}
    </p>
  ));

const WhatsAppAI: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Olá! Sou o Orçavi IA. Tenho acesso aos seus dados financeiros reais e posso ajudar com análises, simulações e dicas personalizadas. Como posso ajudar hoje?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setMessages(m => [...m, { role: 'assistant', text: 'Sessão expirada. Por favor, faça login novamente.' }]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/whatsapp-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        throw new Error('Erro na API');
      }

      const { reply } = await res.json() as { reply: string };
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>WhatsApp IA</h1>
        <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Seu assistente financeiro inteligente</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, height: 'calc(100vh - 200px)', maxHeight: 580 }}>
        {/* Chat */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F5F3FF' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageCircle size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>Orçavi IA</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>● Online · Dados reais</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', fontSize: 13,
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#7C5CFC' : '#F5F3FF',
                  color: m.role === 'user' ? 'white' : '#0D0D1A',
                  border: m.role === 'assistant' ? '1px solid #E8E4FF' : 'none',
                  boxShadow: m.role === 'user' ? '0 2px 8px rgba(124,92,252,0.25)' : 'none',
                }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 4, padding: '10px 14px', borderRadius: 12, background: '#F5F3FF', border: '1px solid #E8E4FF' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9090B0', animation: `dotBounce 0.6s ease-in-out ${i * 0.1}s infinite alternate` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #F5F3FF' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Pergunte sobre suas finanças..."
              style={{ flex: 1, padding: '9px 14px', border: '1px solid #E8E4FF', borderRadius: 99, fontFamily: 'inherit', fontSize: 13, background: '#F5F3FF', color: '#0D0D1A', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#7C5CFC'; e.target.style.background = 'white'; }}
              onBlur={e => { e.target.style.borderColor = '#E8E4FF'; e.target.style.background = '#F5F3FF'; }}
            />
            <button onClick={() => sendMessage()} disabled={loading} style={{ width: 36, height: 36, borderRadius: '50%', background: '#7C5CFC', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(124,92,252,0.3)' }}>
              <Send size={15} color="white" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E8E4FF' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginBottom: 10 }}>Perguntas rápidas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{ width: '100%', textAlign: 'left', fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4FF', color: '#4B4B6B', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C5CFC'; e.currentTarget.style.color = '#7C5CFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E4FF'; e.currentTarget.style.color = '#4B4B6B'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg,#1A1A2E,#25253F)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', marginBottom: 8 }}>IA com contexto real</div>
            <p style={{ fontSize: 12, color: '#6B6B9A', lineHeight: 1.5, marginBottom: 10 }}>
              O assistente lê seus dados reais de saldo, transações e metas para dar respostas personalizadas.
            </p>
            <p style={{ fontSize: 11, color: '#3D3D5C', margin: 0 }}>
              Powered by Claude (Anthropic)
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          from { transform: translateY(0); }
          to { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

const WhatsAppAIGated: React.FC = () => (
  <PlanGate requiredPlan="family"><WhatsAppAI /></PlanGate>
);

export default WhatsAppAIGated;
