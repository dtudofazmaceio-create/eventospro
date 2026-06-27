# Segurança e proteção de dados — Enlace

Este documento resume o que foi implementado nos três portais e o passo a passo para colocar a proteção completa no ar.

## Autenticação (Firebase Authentication)

Os três portais agora usam o **Firebase Authentication** (provedor e-mail/senha) para cadastro, login, sessão e logout:

- **Cadastro:** cria a conta com `createUserWithEmailAndPassword`. A senha é guardada e protegida **pelo servidor do Firebase** — o app **nunca** grava senha (nem hash) no banco. O perfil (nome, e-mail, telefone, região, papel) fica em `users/{uid}`, onde `uid` é o identificador do Firebase Auth.
- **Login:** `signInWithEmailAndPassword`. Em caso de sucesso, o perfil é carregado de `users/{uid}` e o papel (noivos / fornecedor / gestor) é conferido — quem tenta entrar no painel errado é deslogado com aviso.
- **Sessão:** controlada pelo Firebase (`onAuthStateChanged`), com persistência local e *token* renovável. Substitui a antiga sessão manual no `localStorage`.
- **Logout:** `signOut()`.

### Migração automática das contas antigas
Nenhum usuário existente precisa redefinir a senha. No **primeiro login** de uma conta antiga (criada antes do Firebase Auth):
1. a senha é conferida pelo hash PBKDF2 que já estava salvo;
2. se confere, é criada a conta no Firebase Authentication com a **mesma senha**;
3. o perfil é movido para `users/{uid}` (sem nenhum campo de senha);
4. o histórico é preservado — solicitações e anúncios são reapontados para o novo identificador;
5. o registro antigo (com o hash) é removido do banco.

O módulo `Security` (PBKDF2) foi mantido **apenas** para validar e migrar essas contas antigas, além de validar formato de e-mail e força de senha no cliente.

## Outras proteções mantidas
- **Validação de entrada:** e-mail por formato; senha com mínimo de 8 caracteres, letras e números (o Firebase exige no mínimo 6 — a regra mais forte é a nossa).
- **Anti força-bruta:** trava local após 5 tentativas erradas, além do limite do próprio Firebase (`auth/too-many-requests`).
- **XSS:** todo conteúdo dinâmico passa por `escape()` antes de ir ao HTML.
- **Nó público sem credenciais:** o nó `professionals` (vitrine pública) nunca recebe senha/hash; as regras do banco também proíbem isso.

## Layout
No **celular** os portais funcionam como aplicativo (navegação inferior, toques de 44px+, safe-area). No **desktop** (>=1024px) a navegação vira **sidebar** e o conteúdo ganha colunas. Identidade visual "Enlace": paleta ameixa + dourado, tipografia serifada, hero em arco e cards de fornecedor estilo marketplace.

## Passo a passo para publicar (faça nesta ordem)

**1. Ative o provedor de e-mail/senha** — sem isso, cadastro e login falham com `auth/operation-not-allowed`.
Console do Firebase -> **Authentication** -> *Sign-in method* -> **Email/Password** -> **Ativar**.

**2. Aplique as regras de transição (`firebase-rules.json`)** agora.
Console -> **Realtime Database** -> **Regras** -> cole o conteúdo -> **Publicar**.
Essas regras mantêm o login atual funcionando **e** permitem a migração automática (um usuário autenticado só consegue limpar o próprio registro antigo, identificado pelo e-mail do token).

**3. Deixe rodar durante uma janela de transição** (alguns dias/semanas), enquanto os usuários antigos entram pelo menos uma vez e são migrados.

**4. Troque para as regras estritas (`firebase-rules-auth.json`)** quando a migração estiver concluída.
Elas **encerram a leitura pública**: nada é legível sem login; cada um lê só o próprio perfil; o gestor (papel `admin`) gerencia usuários e anúncios; fornecedores editam apenas a própria vitrine. *(Se este for um projeto novo, sem contas antigas, você pode já começar direto nestas regras.)*

**5. Restrinja a chave de API** no Google Cloud Console -> *APIs e Serviços* -> *Credenciais* -> restrição por **referenciadores HTTP** (apenas o domínio do seu app). Considere ativar o **App Check**.

**6. Reveja o código de gestor fixo** (`EVENTLINK-ADMIN`) embutido no HTML do painel do gestor: qualquer pessoa que abra o código-fonte o enxerga. O ideal é promover gestores manualmente pelo Console (editando o campo `role` para `admin`) e remover o cadastro de gestor por código do app.

**7. Sirva sempre por HTTPS** (o Firebase Hosting já faz isso) para proteger os dados em trânsito.

## Ponto residual (para evoluir depois)
Mesmo nas regras estritas, qualquer usuário **logado** consegue ler a lista de `requests` e de `professionals` (o app filtra por dono na tela). Já é muito melhor que o acesso público anterior, mas, se quiser isolar totalmente os dados por usuário, o próximo passo é mover essas leituras para **Cloud Functions** (backend) com consultas filtradas por `uid`.
