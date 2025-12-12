# 🔥 Firebase - Configuração Passo a Passo

## ⚠️ IMPORTANTE: Você DEVE configurar estas 3 coisas para o app funcionar!

Sem essas configurações, o app **não consegue salvar dados**.

---

## Passo 1: Ativar Authentication (Login com Google)

1. Acesse: https://console.firebase.google.com/project/financecontrol-pro/authentication

2. Clique na aba **"Sign-in method"** (Método de login)

3. Clique em **"Google"** na lista de provedores

4. Clique no switch para **ATIVAR**

5. Preencha:
   - **Nome público do projeto**: "FinanceControl Pro"
   - **Email de suporte**: seu email

6. Clique em **"Salvar"**

✅ **Pronto!** Agora os usuários podem fazer login com Google.

---

## Passo 2: Criar Firestore Database (Banco de Dados)

1. Acesse: https://console.firebase.google.com/project/financecontrol-pro/firestore

2. Clique em **"Criar banco de dados"**

3. **Escolha o modo**:
   - ✅ Selecione: **"Iniciar no modo de produção"** (mais seguro)
   - ❌ Não use "modo de teste" (dados ficam públicos por 30 dias)

4. **Escolha a localização**:
   - Recomendado: **"southamerica-east1 (São Paulo)"**
   - Ou: **"us-central1"** se preferir EUA

5. Clique em **"Ativar"**

6. Aguarde alguns segundos...

✅ **Pronto!** O banco de dados foi criado.

---

## Passo 3: Configurar Regras de Segurança (CRÍTICO!)

⚠️ **MUITO IMPORTANTE**: Sem as regras corretas, os dados não serão salvos!

1. No Firestore, clique na aba **"Regras"** (Rules)

2. **DELETE tudo** que estiver lá

3. **COLE este código exato**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuário só pode acessar seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Clique em **"Publicar"** (Publish)

5. Aguarde a mensagem: ✅ **"Regras publicadas com sucesso"**

---

## ✅ Verificação Final

### Teste se está tudo certo:

1. **Abra o app**: http://localhost:3000

2. **Faça login** com sua conta Google

3. **Crie uma transação**

4. **Verifique no Firebase Console**:
   - Vá em: https://console.firebase.google.com/project/financecontrol-pro/firestore/databases/-default-/data
   - Você deve ver: `users > {seu UID} > transactions > {transação criada}`

Se você ver os dados aparecendo, **está funcionando perfeitamente!** 🎉

---

## 🔒 Segurança: Como Funciona

### Regras de Segurança Explicadas:

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Tradução:**
- `match /users/{userId}/` = Para qualquer caminho dentro de `/users/algumID/`
- `{document=**}` = Incluindo todos os subdiretórios (accounts, transactions, goals)
- `request.auth != null` = O usuário DEVE estar autenticado
- `request.auth.uid == userId` = O UID do usuário logado DEVE ser igual ao UID da pasta

**Resultado:**
- ✅ João (UID: abc123) pode ler/escrever em `/users/abc123/`
- ❌ João (UID: abc123) **NÃO PODE** acessar `/users/xyz789/` (dados de Maria)
- ❌ Pessoas não autenticadas **NÃO PODEM** acessar nada

---

## 📊 Onde os Dados Ficam Salvos?

Todos os dados ficam no **Cloud Firestore** (servidor do Google):

```
Firestore Database
└── users/
    └── {UID do usuário}/
        ├── accounts/           ← Contas bancárias
        │   ├── conta-1
        │   └── conta-2
        ├── transactions/       ← Transações (receitas/despesas)
        │   ├── trans-1
        │   ├── trans-2
        │   └── trans-3
        └── goals/              ← Metas financeiras
            ├── meta-1
            └── meta-2
```

### Cada pessoa tem:
- ✅ Seus próprios dados isolados
- ✅ Sincronização automática entre dispositivos
- ✅ Backup automático pelo Google
- ✅ Acesso de qualquer lugar

---

## ❓ Perguntas Frequentes

### 1. Os dados ficam salvos no meu computador?
**NÃO.** Os dados ficam salvos no servidor do Firebase (nuvem do Google).

### 2. Se eu logar em outro computador, vejo meus dados?
**SIM.** Basta fazer login com a mesma conta Google.

### 3. Outras pessoas podem ver meus dados?
**NÃO.** As regras de segurança garantem isolamento total.

### 4. E se eu perder meu computador?
**Seus dados estão seguros** no Firebase. Basta logar em outro dispositivo.

### 5. Tem limite de dados?
**Plano gratuito do Firebase:**
- ✅ 1 GB de armazenamento
- ✅ 50.000 leituras/dia
- ✅ 20.000 escritas/dia

Suficiente para uso pessoal por **anos**!

### 6. Preciso pagar?
**NÃO**, para uso pessoal o plano gratuito é mais que suficiente.

---

## 🆘 Problemas Comuns

### Erro: "Missing or insufficient permissions"
❌ **Causa:** Regras de segurança não foram configuradas
✅ **Solução:** Configure as regras no Passo 3 acima

### Erro: "Firebase: Error (auth/unauthorized-domain)"
❌ **Causa:** Domínio não autorizado para login
✅ **Solução:**
1. Vá em: Authentication > Settings > Authorized domains
2. Adicione: `localhost`

### Erro: "FirebaseError: Firebase App named '[DEFAULT]' already exists"
❌ **Causa:** Firebase inicializado duas vezes
✅ **Solução:** Recarregue a página (F5)

### Dados não aparecem no Firestore
❌ **Causa:** Usuário não está autenticado OU regras bloqueando
✅ **Solução:**
1. Faça logout e login novamente
2. Verifique as regras do Firestore
3. Abra o Console do navegador (F12) e veja os erros

---

## 🎯 Checklist Final

Marque conforme for fazendo:

- [ ] **Authentication** ativado com Google
- [ ] **Firestore Database** criado
- [ ] **Regras de segurança** configuradas e publicadas
- [ ] Fez login no app com sua conta Google
- [ ] Conseguiu criar uma transação
- [ ] Viu os dados aparecendo no Firebase Console

Se marcou tudo, **parabéns!** Seu sistema está 100% funcional! 🎉

---

## 📞 Links Úteis

- **Firebase Console**: https://console.firebase.google.com/project/financecontrol-pro
- **Authentication**: https://console.firebase.google.com/project/financecontrol-pro/authentication
- **Firestore**: https://console.firebase.google.com/project/financecontrol-pro/firestore
- **Documentação Firebase**: https://firebase.google.com/docs/firestore

---

**💡 Dica Pro**: Abra o Firestore Console em uma aba separada e deixe aberto. Você verá os dados aparecendo em **tempo real** conforme usa o app! É bem legal ver a sincronização acontecendo! 😄
