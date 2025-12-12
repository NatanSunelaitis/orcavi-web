# 🔥 Configuração do Firebase para FinanceControl Pro

## Passo 1: Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nomeie seu projeto (ex: "FinanceControl Pro")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

## Passo 2: Registrar Aplicativo Web

1. No painel do projeto, clique no ícone da Web `</>`
2. Registre o app com um nome (ex: "FinanceControl Web")
3. **NÃO** marque "Configure Firebase Hosting"
4. Copie as credenciais de configuração

## Passo 3: Ativar Authentication

1. No menu lateral, vá em **Authentication**
2. Clique em "Começar"
3. Na aba "Sign-in method", habilite:
   - **Google** (clique, habilite e salve)
4. Configure o nome público do projeto e email de suporte

## Passo 4: Ativar Firestore Database

1. No menu lateral, vá em **Firestore Database**
2. Clique em "Criar banco de dados"
3. Escolha o modo:
   - **Modo de produção** (recomendado para segurança)
   - **Modo de teste** (apenas para desenvolvimento - expira em 30 dias)
4. Escolha a localização (ex: `southamerica-east1` para São Paulo)
5. Clique em "Ativar"

## Passo 5: Configurar Regras de Segurança do Firestore

No Firestore, vá na aba **Regras** e cole o seguinte:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regra: usuário só pode acessar seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Clique em **Publicar**.

## Passo 6: Copiar Credenciais para o Projeto

1. No painel do projeto Firebase, clique no ícone de engrenagem ⚙️ > **Configurações do projeto**
2. Role até "Seus aplicativos" e copie as configurações:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Passo 7: Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=PLACEHOLDER_API_KEY

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Passo 8: Instalar Dependências e Rodar

```bash
npm install
npm run dev
```

## ✅ Verificação

1. Abra o app no navegador
2. Clique em "Continuar com Google"
3. Faça login com sua conta Google
4. Seus dados serão salvos automaticamente no Firestore!

## 🔒 Segurança

- ✅ Dados são armazenados por usuário (isolamento completo)
- ✅ Regras do Firestore impedem acesso não autorizado
- ✅ Autenticação via Google (sem necessidade de senha)
- ✅ Sincronização automática entre dispositivos

## 📊 Estrutura do Firestore

```
/users/{userId}/
  ├── accounts/
  │   └── {accountId} (documento)
  ├── transactions/
  │   └── {transactionId} (documento)
  └── goals/
      └── {goalId} (documento)
```

## 🆘 Problemas Comuns

### Erro: "Firebase: Error (auth/unauthorized-domain)"
- Vá em **Authentication** > **Settings** > **Authorized domains**
- Adicione `localhost` e seu domínio de produção

### Erro: "Missing or insufficient permissions"
- Verifique as regras do Firestore
- Certifique-se que o usuário está autenticado

### Dados não aparecem
- Abra o Console do Firestore e verifique se os documentos foram criados
- Confira se o userId corresponde ao UID do usuário logado

## 📱 Próximos Passos

- Deploy no Firebase Hosting (opcional)
- Configurar backup automático do Firestore
- Adicionar mais provedores de autenticação (Facebook, Email/Senha)
