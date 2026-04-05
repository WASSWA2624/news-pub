import { z } from "zod";

import { createLoginResponse } from "@/lib/auth/api";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(255),
});

export async function POST(request) {
  const result = await validateJsonRequest(request, loginSchema);

  if (result.response) {
    return result.response;
  }

  return createLoginResponse({
    email: result.data.email,
    password: result.data.password,
    userAgent: request.headers.get("user-agent"),
  });
}
