-- Generate new integer IDs and map existing result rows to the same students.
ALTER TABLE "Aluno" ADD COLUMN "newId" SERIAL;

ALTER TABLE "Resultado" ADD COLUMN "newAlunoId" INTEGER;

UPDATE "Resultado" AS resultado
SET "newAlunoId" = aluno."newId"
FROM "Aluno" AS aluno
WHERE resultado."alunoId" = aluno."id";

ALTER TABLE "Resultado" ALTER COLUMN "newAlunoId" SET NOT NULL;
DROP INDEX "Resultado_alunoId_avaliacaoId_key";
ALTER TABLE "Resultado" DROP CONSTRAINT "Resultado_alunoId_fkey";
ALTER TABLE "Resultado" DROP COLUMN "alunoId";
ALTER TABLE "Resultado" RENAME COLUMN "newAlunoId" TO "alunoId";

ALTER TABLE "Aluno" DROP CONSTRAINT "Aluno_pkey";
ALTER TABLE "Aluno" DROP COLUMN "id";
ALTER TABLE "Aluno" RENAME COLUMN "newId" TO "id";
ALTER SEQUENCE "Aluno_newId_seq" RENAME TO "Aluno_id_seq";
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "Resultado_alunoId_avaliacaoId_key"
ON "Resultado"("alunoId", "avaliacaoId");

ALTER TABLE "Resultado"
ADD CONSTRAINT "Resultado_alunoId_fkey"
FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
