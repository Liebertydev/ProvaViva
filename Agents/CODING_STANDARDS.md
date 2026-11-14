# Padroes de codigo

As preferencias abaixo orientam novas alteracoes quando compativeis com o codigo real.
Elas nao justificam refatorar o codigo existente automaticamente.

## Preferencias para novas alteracoes

- Preferir controllers e validators como funcoes constantes com arrow functions.
- Organizar services em classes.
- Manter repositories simples e objetivos.
- Usar tipagem adequada e legivel; evitar `any` e casts inseguros em TypeScript.
- Nao adicionar bibliotecas sem necessidade.
- Escolher nomes claros para funcoes e variaveis.
- Manter regras de negocio nos services, nao nos controllers.
- Nao acessar Prisma diretamente nos controllers.
- Em TypeScript com NodeNext, usar imports relativos compativeis com NodeNext,
  observando as extensoes exigidas pelo runtime e pelo projeto.
- Em validacoes reutilizadas por varios recursos, colocar a funcao comum em
  `validators/commonValidator.js` e importar o export default no validator especifico.
- Para IDs inteiros em rotas, validar a string numerica, converter com `Number` e
  verificar `Number.isSafeInteger` antes de disponibilizar o valor convertido ao
  controller.
- Preservar o formato de respostas JSON existente.
- Evitar estruturas complexas para funcionalidades simples e estilos inconsistentes sem
  necessidade.
- Priorizar codigo que um estudante de Ciencia da Computacao consiga compreender e
  explicar.
- Para erros HTTP, reutilizar `AppError` e o middleware global. No backend atual, erros
  de aplicacao retornam `{ "mensagem": "<descricao>" }`; mantenha esse contrato quando
  aplicavel e encaminhe erros inesperados ao tratamento global, sem esconder detalhes
  por conversoes indevidas em erros esperados.

## Convencoes observadas

- O backend atual usa JavaScript ES Modules, nao TypeScript. `backend/package.json`
  declara `"type": "module"`; os imports relativos observados incluem `.js`.
- Controllers e validators do cadastro sao declarados como `const` com arrow functions
  e exportam objetos default.
- O service de aluno e uma classe, exportada como instancia default.
- O repository exporta um objeto default com funcoes e importa Prisma da instancia
  centralizada.
- A rota usa nomes de arquivo mistos (`aluno.routes.js` versus `alunoController.js`,
  `alunoValidator.js` e `alunoRepository.js`). Preserve o estilo local dos arquivos
  envolvidos; nao renomeie ou padronize arquivos sem autorizacao.
- `AppError` e `errorHandler` sao JavaScript sem anotacoes de tipo. O handler centraliza
  as respostas para erros da aplicacao, JSON malformado e falhas inesperadas.
- O formato de erro observado usa a propriedade `mensagem`. O endpoint de saude usa
  `message`, portanto nao generalize um contrato unico para respostas que nao foram
  relacionadas a erros.

## Diferencas em relacao as preferencias

- As preferencias mencionam TypeScript e imports NodeNext, mas o backend foi convertido
  para JavaScript e nao possui `tsconfig.json`. Nao converta arquivos para TypeScript nem
  altere a configuracao sem autorizacao.
- A camada `domain` e os diretorios `middlewares` e `utils` estao presentes, mas vazios
  na analise; nao representam padroes implementados.
- A separacao controller/service/repository aparece no fluxo de cadastro, mas nao ha
  evidencias suficientes para afirmar que todos os fluxos seguem o mesmo padrao.
- Os nomes dos arquivos de aluno nao sao uniformes. A diferenca deve ser respeitada em
  vez de corrigida automaticamente.
