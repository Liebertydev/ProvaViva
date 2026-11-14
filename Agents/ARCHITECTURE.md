# Arquitetura

## Fluxo de referencia

Para novas funcionalidades, respeite o fluxo:

`Routes -> Validators -> Controllers -> Services -> Repositories -> Prisma`

Esse fluxo orienta a separacao de responsabilidades; nao significa que todas as camadas
ou padroes ja estejam implementados em todas as funcionalidades.

- **Routes:** registram endpoints e organizam middlewares.
- **Validators:** verificam tipos, campos obrigatorios e formatos. Nao consultam o banco.
- **Controllers:** recebem a requisicao, chamam o service e enviam a resposta HTTP. Nao
  implementam regras de negocio nem acessam Prisma diretamente.
- **Services:** classes que coordenam casos de uso e aplicam regras de negocio.
- **Repositories:** encapsulam o acesso ao banco usando a instancia centralizada de
  Prisma.
- **Domain:** regras de dominio complexas podem ser extraidas dos services quando isso
  for justificavel. Nao crie essa camada para logica simples.
- **Errors:** use `AppError` para erros esperados com status HTTP e o `errorHandler`
  global para produzir respostas padronizadas.
- **Utils:** reserve para utilitarios genericos reutilizaveis; nao use como deposito de
  logica especifica de uma funcionalidade.

Evite classes, interfaces, abstracoes e padroes que nao resolvam uma necessidade real.
Nao reorganize a estrutura existente sem autorizacao.

## O que existe hoje

- O backend esta em JavaScript com ES Modules. Existem `backend/src/app.js` e
  `backend/src/server.js`; os equivalentes TypeScript `app.ts` e `server.ts` nao foram
  encontrados.
- `app.js` cria a aplicacao Express, instala CORS e o parser JSON, registra
  `/api/alunos`, `/health` e, por fim, o middleware global de erros.
- `server.js` carrega as variaveis de ambiente, importa a aplicacao e inicia o servidor.
- A rota de alunos usa `express.Router()` e registra POST `/api/alunos`, GET
  `/api/alunos` e GET `/api/alunos/:id`. O validator comum verifica o ID numérico na
  rota por ID antes de chamar o controller.
- O validator atual valida o corpo do cadastro e responde diretamente com HTTP 400; nao
  foi observado um validator de parametro de ID.
- Os controllers chamam services e enviam respostas HTTP: cadastro retorna 201,
  listagem e busca por ID retornam 200; erros sao encaminhados ao middleware Express
  com `next(error)`.
- `AlunoService` e uma classe e coordena cadastro, listagem e busca por ID. O repository
  centraliza operacoes de aluno e importa a instancia compartilhada de `database/prisma.js`.
- `database/prisma.js` cria a instancia de Prisma Client com o adapter PostgreSQL.
  Valores de conexao e credenciais nao devem ser registrados aqui nem em documentos.
- `AppError` estende `Error` e carrega `statusCode`. O `errorHandler` transforma esse
  erro em `{ "mensagem": ... }` com o status correspondente, trata JSON malformado como
  400 e retorna uma mensagem generica para erros inesperados.
- O schema Prisma define `Aluno.id` como inteiro autoincremental; a chave estrangeira
  `Resultado.alunoId` usa o mesmo tipo. O validator comum aceita IDs positivos que
  estejam no intervalo seguro do JavaScript e no intervalo de `Int` do Prisma.
- Os diretorios `domain`, `middlewares` e `utils` existem, mas nao foram encontrados
  arquivos neles nesta analise.
- Os arquivos de aluno usam convencoes de nome diferentes (`aluno.routes.js` e
  `alunoController.js`, por exemplo). Preserve os caminhos existentes ao alterar
  imports.

## O que nao pode ser inferido

- Nao ha `backend/tsconfig.json`; portanto, nao existe configuracao TypeScript ou
  `NodeNext` a documentar. Os imports atuais sao relativos e incluem a extensao `.js`,
  conforme ES Modules do Node.
- O projeto nao permite concluir que todos os endpoints ou funcionalidades seguem
  uniformemente o fluxo de referencia. A listagem atual nao aplica filtros ou
  paginacao e inclui alunos inativos.
- Nao se deve presumir que o banco esteja acessivel, que o endpoint de cadastro funcione
  em execucao ou que os arquivos pendentes no worktree estejam prontos ou validados.
