/**
 * Server environment singleton for NewsPub runtime settings.
 */

import { parseServerEnv } from "@/lib/env/runtime";

export const env = parseServerEnv(process.env);
