import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

// No Supabase, DIRECT_URL pode usar o pooler de sessões na porta 5432.
const datasourceUrl = new URL(env("DIRECT_URL"));
datasourceUrl.searchParams.set("sslmode", "verify-full");
datasourceUrl.searchParams.set(
  "sslrootcert",
  fileURLToPath(new URL("./prisma/certs/prod-ca-2021.crt", import.meta.url)),
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl.toString(),
  },
});
