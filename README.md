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
