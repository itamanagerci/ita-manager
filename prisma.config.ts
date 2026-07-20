import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

// Next.js charge .env.local automatiquement pour l'app ; le CLI Prisma
// (migrate, generate, studio, seed) tourne en dehors de Next et doit le
// charger explicitement.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
