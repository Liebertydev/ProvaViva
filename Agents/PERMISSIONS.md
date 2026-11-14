# Permissoes dos agentes

Estas regras delimitam a autonomia do agente dentro do escopo autorizado. Elas nao
substituem as permissoes reais da ferramenta, do ambiente ou do responsavel pelo
repositorio.

## Permitido sem autorizacao adicional, dentro do escopo solicitado

- Ler e analisar arquivos.
- Criar ou editar arquivos necessarios a funcionalidade autorizada.
- Implementar validators, controllers, services, repositories e routes relacionados a
  tarefa.
- Executar verificacoes estaticas, `npm run build`, `npx prisma validate` e testes locais
  nao destrutivos.
- Corrigir erros introduzidos pela propria implementacao, somente nos arquivos
  autorizados.
- Apresentar sugestoes de melhoria sem aplica-las fora do escopo.

Testes de integracao que escrevam ou apaguem registros so podem ser executados quando
estiver confirmado que o banco configurado e apropriado para testes e que o procedimento
nao afeta dados de producao ou compartilhados.

## Exige autorizacao explicita do responsavel

- Alterar `schema.prisma` ou modelos do banco.
- Executar migrations, `prisma db push`, `db pull`, reset ou seed.
- Instalar, remover ou atualizar dependencias.
- Alterar `package.json`, `tsconfig.json` ou configuracoes de infraestrutura.
- Modificar arquivos fora do escopo da funcionalidade.
- Refatorar funcionalidades existentes sem relacao com a tarefa.
- Implementar autenticacao, autorizacao ou regras de negocio nao solicitadas.
- Alterar contratos publicos da API.
- Fazer commits, push, merges ou abrir PR.
- Criar ou modificar arquivos de CI/CD ou deploy.
- Executar operacoes que alterem dados em banco compartilhado.

## Proibido

- Expor senhas, tokens, credenciais ou URLs de conexao.
- Enviar arquivos `.env` ao repositorio.
- Apagar dados ou tabelas sem autorizacao especifica e procedimento seguro.
- Desabilitar validacoes ou verificacoes de seguranca apenas para fazer testes passarem.
- Inventar resultados de testes.
- Ignorar erros conhecidos sem comunica-los.
- Modificar o frontend quando a tarefa envolver somente o backend.
