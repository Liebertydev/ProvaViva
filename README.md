# ProvaViva

Protótipo acadêmico de correção automática de provas
por reconhecimento óptico de marcações (OMR).

## Tecnologias previstas

- Ionic + Angular
- Node.js + Express + JavaScript (ES Modules)
- OpenCV
- PostgreSQL hospedado

## Objetivo inicial

Reconhecer matrícula e respostas de uma folha A4
padronizada, calcular a nota e apresentar os resultados.

## Executar o backend

O backend foi refatorado de TypeScript para JavaScript. A arquitetura em
camadas, o Prisma ORM 7 e as validações do cadastro de aluno foram preservados.
O frontend continua em Ionic/Angular com TypeScript.

Dentro de `backend/`, configure `DATABASE_URL` e `DIRECT_URL` no `.env`,
mantendo esse arquivo fora do Git. Os comandos são:

```sh
npm ci
npm run build
npm run dev
```

`npm run build` gera o Prisma Client em JavaScript. A aplicação executa
diretamente os arquivos de `src/`, sem compilação TypeScript e sem usar `dist/`.
Para executar sem o modo de observação, use `npm start`.

O generator `prisma-client-js` gera JavaScript diretamente e é suportado no
Prisma 7. Ele está marcado como deprecated na
[documentação do Prisma](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators#prisma-client-js-deprecated);
essa escolha deve ser reavaliada antes de uma atualização de versão principal.

`npm test` executa os testes de integração no banco configurado, incluindo
cadastro e duplicidade concorrente. Os registros temporários são identificados
por execução e removidos pelo próprio teste.

## Módulo de avaliações

O router de avaliações contém POST `/api/avaliacoes`, GET `/api/avaliacoes`,
GET `/api/avaliacoes/:id` e PATCH `/api/avaliacoes/:id`. Ele permanece sem registro
em `app.js`, conforme a decisão de aguardar autenticação e autorização reais.
A existência de um `professorId` válido não comprova a identidade de quem faz a
requisição. Antes de publicar o módulo, será necessário autenticar o professor e
definir/verificar as permissões de consulta e alteração.

A listagem retorna os dados básicos da avaliação, datas e identificação básica do
professor (id, nome e matrícula). A consulta por ID inclui também o gabarito.
O PATCH aceita somente título e/ou gabarito de dez alternativas A–E. Quando já
existem resultados, uma mudança real no gabarito retorna 409; o título ainda pode
ser alterado. Reenviar valores idênticos não executa uma atualização no banco.

A atualização usa uma transação Prisma `ReadCommitted` com `SELECT ... FOR UPDATE`
parametrizado na avaliação, antes de ler o gabarito e verificar a existência de
resultados. A verificação e a escrita usam a mesma transação. O bloqueio dura até
o término da transação e serializa as edições da mesma avaliação, conforme os
[bloqueios de linha do PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS).
Não há tentativas automáticas de repetição; erros inesperados seguem para o
tratamento global, que retorna 500 sem detalhes internos.

**Limitação de concorrência:** ainda não existe o fluxo de correção. Uma correção
futura que leia o gabarito fora de uma transação poderá calcular usando uma versão
antiga e salvar o resultado depois de uma edição. Para garantir a consistência
de ponta a ponta, a correção deverá bloquear a mesma avaliação antes de ler o
gabarito e manter a leitura e a criação do resultado na mesma transação. Não foi
implementada criação de resultados nem alteração de schema nesta etapa.

Os testes HTTP locais de avaliações simulam o Prisma e não acessam o banco:

```sh
cd backend
node --test tests/avaliacao.test.mjs tests/avaliacao.consulta-atualizacao.test.mjs
```

Esses testes verificam validações, respostas HTTP e a ordem das operações na
transação; não comprovam bloqueios reais do PostgreSQL. O teste de concorrência
no banco fica pendente até existir um banco isolado confirmado para testes.
