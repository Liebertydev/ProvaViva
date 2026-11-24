ALTER TABLE "Professor" ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "Professor_email_key" ON "Professor"("email");
