import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const initMessages: Message[] = [
  { role: 'assistant', text: 'Olá! Sou o Orçavi IA. Posso analisar suas finanças, responder perguntas e ajudar você a tomar decisões melhores com seu dinheiro. Como posso ajudar hoje?' },
  { role: 'user', text: 'Quanto gastei em alimentação esse mês?' },
  { role: 'assistant', text: 'Em abril você gastou **R$ 427,70** em alimentação — 15% das suas despesas totais do mês.\n\nComparando com março (R$ 389,20), houve um aumento de **9,9%**. Quer dicas para reduzir esse gasto?' },
];

const suggestions = [
  'Como está meu saldo?',
  'Qual minha maior despesa?',
  'Quando devo pagar o aluguel?',
  'Posso comprar um celular novo?',
];

const getReply = (msg: string): string => {
  const lc = msg.toLowerCase();
  if (lc.includes('saldo')) {
    return 'Seu saldo total atual é **R$ 8.432,50** distribuído em 3 contas:\n\n• Nubank: R$ 3.200,00\n• Itaú: R$ 2.800,00\n• Poupança BB: R$ 1.850,00\n\nConsiderando suas despesas pendentes, seu saldo livre é de **R$ 7.000,00**.';
  }
  if (lc.includes('celular') || lc.includes('comprar')) {
    return 'Com base no seu simulador financeiro:\n\nSe você financiar um celular de **R$ 6.500** em 12x, a parcela seria **R$ 594/mês**, elevando seu comprometimento para **66%** — na zona de atenção.\n\nRecomendo juntar mais R$ 2.000 na sua meta antes de comprar.';
  }
  if (lc.includes('aluguel')) {
    return 'Seu aluguel de **R$ 1.400** está configurado como recorrente e vence todo dia **1º do mês**. O próximo vencimento é **01/05/2025**.\n\nEle representa **49%** das suas despesas fixas mensais.';
  }
  if (lc.includes('despesa') || lc.includes('maior')) {
    return 'Sua maior despesa em abril foi **Moradia (R$ 1.400)**, seguida de:\n\n2. Alimentação: R$ 427,70\n3. Transporte: R$ 240,00\n4. Saúde: R$ 209,50\n\nNo total, suas despesas fixas comprometem **54,8%** da sua renda.';
  }
  return 'Entendi! Analisando seus dados financeiros... Posso ajudar com análise de gastos, simulações de compra, controle de metas e muito mais. O que você quer saber sobre suas finanças?';
};

const renderText = (text: string) =>
  text.split('\n').map((line, i) => (
    <p key={i} style={{ margin: i > 0 ? '4px 0 0' : 0, lineHeight: 1.5 }}>
      {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      )}
    </p>
  ));

const WhatsAppAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    setTimeout(() => {
      setMessages(m => [...m, { role: 'assistant', text: getReply(msg) }]);
      setLoading(false);
    }, 900 + Math.random() * 500);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>WhatsApp IA</h1>
        <p className="text-sm mt-0.5" style={{ color: '#9090B0' }}>Seu assistente financeiro inteligente</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px', height: 'calc(100vh - 200px)', maxHeight: 580 }}>
        {/* Chat area */}
        <div
          className="bg-white rounded-xl overflow-hidden flex flex-col"
          style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #F5F3FF' }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)' }}
            >
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#0D0D1A' }}>Orçavi IA</div>
              <div className="text-xs font-medium" style={{ color: '#059669' }}>● Online</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="text-sm"
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: m.role === 'user' ? '#7C5CFC' : '#F5F3FF',
                    color: m.role === 'user' ? 'white' : '#0D0D1A',
                    border: m.role === 'assistant' ? '1px solid #E8E4FF' : 'none',
                    boxShadow: m.role === 'user' ? '0 2px 8px rgba(124,92,252,0.25)' : 'none',
                  }}
                >
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="flex gap-1 px-3.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: '#F5F3FF', border: '1px solid #E8E4FF' }}
                >
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 6, height: 6, borderRadius: '50%', backgroundColor: '#9090B0',
                        animation: `dotBounce 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-4 py-3" style={{ borderTop: '1px solid #F5F3FF' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Pergunte sobre suas finanças..."
              className="flex-1 text-sm outline-none"
              style={{
                padding: '9px 14px',
                border: '1px solid #E8E4FF',
                borderRadius: 99,
                fontFamily: 'inherit',
                backgroundColor: '#F5F3FF',
                color: '#0D0D1A',
              }}
              onFocus={e => { e.target.style.borderColor = '#7C5CFC'; e.target.style.backgroundColor = 'white'; }}
              onBlur={e => { e.target.style.borderColor = '#E8E4FF'; e.target.style.backgroundColor = '#F5F3FF'; }}
            />
            <button
              onClick={() => sendMessage()}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: '#7C5CFC',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(124,92,252,0.3)',
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          {/* Quick suggestions */}
          <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
            <div className="text-sm font-bold mb-2.5" style={{ color: '#0D0D1A' }}>Perguntas rápidas</div>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
                  style={{
                    border: '1px solid #E8E4FF',
                    color: '#4B4B6B',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C5CFC'; e.currentTarget.style.color = '#7C5CFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E4FF'; e.currentTarget.style.color = '#4B4B6B'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Context info */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#1A1A2E,#25253F)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#A78BFA' }}>IA com contexto real</div>
            <p className="text-xs leading-relaxed mb-2.5" style={{ color: '#6B6B9A' }}>
              O Orçavi IA lê seus dados reais — saldo, transações, metas e dívidas — para dar respostas personalizadas.
            </p>
            <div className="flex flex-col gap-1">
              {['5 contas analisadas', '127 transações este mês', '4 metas ativas'].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B6B9A' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#7C5CFC', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
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

export default WhatsAppAI;
