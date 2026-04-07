import { NextResponse } from "next/server";
import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const emptyBodySchema = z.object({}).passthrough();

export async function validateJsonRequest(request, schema = emptyBodySchema) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const result = schema.safeParse({});

    if (!result.success) {
      return {
        response: NextResponse.json(
          {
            issues: result.error.flatten(),
            status: "invalid_payload",
            success: false,
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: result.data,
    };
  }

  const rawBody = await request.text();
  let parsedBody = {};

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return {
        response: NextResponse.json(
          {
            status: "invalid_json",
            success: false,
          },
          { status: 400 },
        ),
      };
    }
  }

  const result = schema.safeParse(parsedBody);

  if (!result.success) {
    return {
      response: NextResponse.json(
        {
          issues: result.error.flatten(),
          status: "invalid_payload",
          success: false,
        },
        { status: 400 },
      ),
    };
  }

  return {
    data: result.data,
  };
}

export function validateParams(params, schema) {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      response: NextResponse.json(
        {
          issues: result.error.flatten(),
          status: "invalid_params",
          success: false,
        },
        { status: 400 },
      ),
    };
  }

  return {
    data: result.data,
  };
}
