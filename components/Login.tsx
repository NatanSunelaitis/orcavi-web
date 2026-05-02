import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      setError('Erro ao fazer login. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Controle completo de receitas e despesas',
    'Gestão de múltiplas contas bancárias',
    'Metas financeiras e simulador de compras',
    'Assistente IA no WhatsApp',
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0D0D1A 0%, #1A1A2E 50%, #25253F 100%)' }}
    >
      <div
        className="w-full"
        style={{ maxWidth: 420 }}
      >
        <div
          className="bg-white"
          style={{ borderRadius: 20, padding: 40, boxShadow: '0 25px 50px rgba(124,92,252,0.25)' }}
        >
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="flex items-center justify-center mb-4"
              style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#7C5CFC', boxShadow: '0 8px 24px rgba(124,92,252,0.4)' }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M7 16.5l7 7 12-14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.03em', marginBottom: 4, textAlign: 'center' }}>
              Orçavi
            </h1>
            <p style={{ fontSize: 14, color: '#9090B0', textAlign: 'center' }}>
              Onde seu dinheiro aparece
            </p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#EDE9FE' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 2.5" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#4B4B6B', lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 p-3 text-sm"
              style={{ backgroundColor: '#FFE4DF', border: '1px solid #DC4F3A33', borderRadius: 8, color: '#DC4F3A' }}
            >
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 transition-all"
            style={{
              padding: '13px 20px',
              border: '1.5px solid #E8E4FF',
              borderRadius: 10,
              backgroundColor: 'white',
              fontSize: 15,
              fontWeight: 600,
              color: '#0D0D1A',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.borderColor = '#7C5CFC';
                (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F3FF';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#E8E4FF';
              (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continuar com Google</span>
              </>
            )}
          </button>

          <p style={{ marginTop: 20, fontSize: 12, color: '#9090B0', textAlign: 'center', lineHeight: 1.5 }}>
            Seus dados são armazenados com segurança e sincronizados com o Google.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
