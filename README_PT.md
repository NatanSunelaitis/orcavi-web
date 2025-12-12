# 💰 FinanceControl Pro

Sistema completo de controle financeiro pessoal com autenticação Google e sincronização em nuvem.

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação
- ✅ Login com conta Google (Firebase Auth)
- ✅ Sincronização automática de dados entre dispositivos
- ✅ Armazenamento seguro no Firestore
- ✅ Isolamento de dados por usuário

### 💳 Gestão de Contas
- ✅ Criar, editar e excluir contas bancárias
- ✅ Múltiplos tipos: Conta Corrente, Poupança, Investimento, Carteira
- ✅ Saldos atualizados automaticamente
- ✅ Cores personalizadas para identificação visual

### 💸 Transações
- ✅ **CRUD completo**: Criar, editar, deletar transações
- ✅ **Transações recorrentes**: Automáticas (diária, semanal, mensal, anual)
- ✅ **Parcelas automáticas**: Divide compras em parcelas mensais
- ✅ **Status de pagamento**: Marcar como pago/pendente
- ✅ **Filtros avançados**: Por tipo (receita/despesa) e status (pago/pendente)
- ✅ Categorias pré-definidas personalizáveis
- ✅ Atualização automática de saldos

### 🎯 Metas Financeiras
- ✅ Criar e acompanhar metas de economia
- ✅ Visualização de progresso em porcentagem
- ✅ Controle de prazos e valores
- ⏳ Em desenvolvimento: Contribuir para metas, editar e excluir

### 📊 Dashboard
- ✅ Visão geral de saldo total
- ✅ Receitas e despesas do mês
- ✅ Taxa de comprometimento financeiro
- ✅ Gráficos de despesas por categoria
- ⏳ Em desenvolvimento: Fluxo de caixa real dos últimos 6 meses

### 🧮 Simulador de Compras
- ✅ Simula impacto de compras no orçamento
- ✅ Avalia capacidade de pagamento
- ✅ Recomendações inteligentes
- ✅ Simulação de parcelas

### 🔄 Transferências
- ✅ Transferir valores entre contas
- ✅ Histórico de transferências
- ✅ Atualização automática de saldos

## 🚀 Como Usar

### 1. Configurar Firebase

Siga o guia completo em [SETUP_FIREBASE.md](./SETUP_FIREBASE.md)

Resumo:
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative **Authentication** (Google)
3. Ative **Firestore Database**
4. Configure as regras de segurança
5. Copie as credenciais para `.env.local`

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Edite `.env.local`:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 4. Rodar o Projeto

```bash
npm run dev
```

Acesse: `http://localhost:3000`

### 5. Build para Produção

```bash
npm run build
npm run preview
```

## 📖 Guia de Uso das Funcionalidades

### Como Criar Transações Recorrentes

1. Vá em **Transações** > **Nova Transação**
2. Preencha os dados normalmente
3. Marque ✅ **Transação Recorrente**
4. Escolha a frequência (Diária, Semanal, Mensal, Anual)
5. Opcionalmente, defina uma data de término
6. Salvar

**Exemplo**: Aluguel mensal de R$ 1.800
- Descrição: "Aluguel"
- Valor: 1800
- Tipo: Despesa
- Categoria: Moradia
- ✅ Transação Recorrente
- Frequência: Mensal
- Até: 31/12/2025

O sistema criará automaticamente uma transação para cada mês até a data especificada!

### Como Parcelar Compras

1. Vá em **Transações** > **Nova Transação**
2. Preencha os dados
3. Marque ✅ **Parcelar**
4. Escolha o número de parcelas
5. O sistema mostra o valor de cada parcela
6. Salvar

**Exemplo**: Notebook de R$ 3.600 em 12x
- O sistema criará 12 transações de R$ 300 (uma por mês)
- Todas ficarão vinculadas indicando "1/12", "2/12", etc.

### Transferir Entre Contas

⏳ **Em desenvolvimento**: Interface dedicada para transferências está sendo implementada.

Atualmente use:
1. Crie uma despesa na conta de origem (categoria "Transferência")
2. Crie uma receita na conta de destino (categoria "Transferência")

## 🏗️ Arquitetura do Projeto

```
├── components/          # Componentes React
│   ├── Login.tsx       # Tela de login com Google
│   ├── Layout.tsx      # Layout principal com sidebar
│   ├── Dashboard.tsx   # Visão geral financeira
│   ├── Transactions.tsx # Gestão de transações (CRUD + Recorrência)
│   ├── Accounts.tsx    # Gestão de contas
│   ├── Goals.tsx       # Metas financeiras
│   └── Simulator.tsx   # Simulador de compras
│
├── context/             # Contextos React
│   ├── AuthContext.tsx # Autenticação e usuário
│   └── FinanceContext.tsx # Dados financeiros
│
├── services/            # Serviços
│   ├── firestore.ts    # CRUD do Firestore
│   └── storage.ts      # [Legado] LocalStorage
│
├── config/              # Configurações
│   └── firebase.ts     # Setup do Firebase
│
├── types.ts             # TypeScript interfaces
├── index.css            # Estilos globais
└── App.tsx              # App principal
```

## 🔐 Segurança

### Regras do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- ✅ Usuários só acessam seus próprios dados
- ✅ Autenticação obrigatória
- ✅ Isolamento total entre usuários

## 🛠️ Tecnologias Utilizadas

- **React 19** - Framework UI
- **TypeScript** - Tipagem estática
- **Firebase Auth** - Autenticação Google
- **Cloud Firestore** - Banco de dados NoSQL
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **Recharts** - Gráficos
- **Lucide React** - Ícones
- **date-fns** - Manipulação de datas
- **React Router** - Navegação

## 📝 Tipos de Dados

### Transaction (Transação)

```typescript
interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  accountId: string;
  isPaid: boolean;
  installments?: {
    current: number;
    total: number;
    parentTransactionId?: string;
  };
  recurrence?: {
    isRecurring: boolean;
    frequency?: 'Diária' | 'Semanal' | 'Mensal' | 'Anual';
    endDate?: string;
    parentTransactionId?: string;
  };
}
```

### Account (Conta)

```typescript
interface Account {
  id: string;
  name: string;
  type: 'Conta Corrente' | 'Poupança' | 'Investimento' | 'Carteira Física';
  balance: number;
  color: string;
}
```

### Goal (Meta)

```typescript
interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}
```

## 📈 Roadmap

### Próximas Funcionalidades

- [ ] **Goals**: CRUD completo de metas
- [ ] **Dashboard**: Dados reais dos últimos 6 meses
- [ ] **Accounts**: Interface de edição/exclusão melhorada
- [ ] **Transfers**: Tela dedicada para transferências
- [ ] **Orçamento**: Planejamento mensal por categoria
- [ ] **Relatórios**: Exportação para PDF/CSV
- [ ] **Categorias customizadas**: Criar/editar categorias
- [ ] **Notificações**: Alertas de contas a pagar
- [ ] **Multi-moeda**: Suporte a diferentes moedas
- [ ] **Importação**: CSV de bancos

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFuncionalidade'`)
4. Push para a branch (`git push origin feature/MinhaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - sinta-se livre para usar este projeto!

## 👤 Autor

Desenvolvido com ❤️ para ajudar no controle financeiro pessoal.

---

**💡 Dica**: Configure o Firebase corretamente seguindo o [SETUP_FIREBASE.md](./SETUP_FIREBASE.md) para garantir que tudo funcione perfeitamente!
