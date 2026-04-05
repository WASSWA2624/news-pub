import { parseServerEnv } from "@/lib/env/runtime";

export const env = parseServerEnv(process.env);
