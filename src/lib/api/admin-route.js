/**
 * Admin API helpers that centralize NewsPub auth checks, validation, and error envelopes.
 */

import { NextResponse } from "next/server";

import { requireAdminApiPermission } from "@/lib/auth/api";
import { createApiErrorResponse } from "@/lib/errors";
import { validateJsonRequest } from "@/lib/validation/api-request";

/**
 * Builds the standard success payload used by authenticated admin routes.
 *
 * @param {unknown} data - Route-specific response payload.
 * @param {object} [options] - Optional response configuration.
 * @param {number} [options.status=200] - HTTP status code to return.
 * @returns {Response} A JSON response with the standard admin success envelope.
 */
export function createAdminSuccessResponse(data, { status = 200 } = {}) {
  return NextResponse.json(
    {
      data,
      success: true,
    },
    { status },
  );
}

/**
 * Executes an authenticated admin read handler with normalized error handling.
 *
 * @param {Request} request - Incoming route request.
 * @param {string} permission - RBAC permission required to access the route.
 * @param {(user: object) => Promise<unknown>} loadData - Async loader for the route payload.
 * @param {string} fallbackMessage - Safe fallback error message for API clients.
 * @returns {Promise<Response>} The admin JSON response or an auth/error response.
 */
export async function handleAdminGet(request, permission, loadData, fallbackMessage) {
  const auth = await requireAdminApiPermission(request, permission);

  if (auth.response) {
    return auth.response;
  }

  try {
    return createAdminSuccessResponse(await loadData(auth.user));
  } catch (error) {
    return createApiErrorResponse(error, fallbackMessage);
  }
}

/**
 * Executes an authenticated admin mutation with optional JSON validation.
 *
 * @param {Request} request - Incoming route request.
 * @param {string} permission - RBAC permission required to access the route.
 * @param {object|null} schema - Optional Zod schema for the JSON request body.
 * @param {(context: { data: unknown, user: object }) => Promise<unknown>} runMutation - Mutation callback.
 * @param {string} fallbackMessage - Safe fallback error message for API clients.
 * @param {object} [options] - Optional response configuration.
 * @param {number} [options.status=200] - HTTP status code for successful responses.
 * @returns {Promise<Response>} The admin JSON response or an auth/validation/error response.
 */
export async function handleAdminMutation(
  request,
  permission,
  schema,
  runMutation,
  fallbackMessage,
  { status = 200 } = {},
) {
  const auth = await requireAdminApiPermission(request, permission);

  if (auth.response) {
    return auth.response;
  }

  if (schema) {
    const result = await validateJsonRequest(request, schema);

    if (result.response) {
      return result.response;
    }

    try {
      return createAdminSuccessResponse(
        await runMutation({
          data: result.data,
          user: auth.user,
        }),
        { status },
      );
    } catch (error) {
      return createApiErrorResponse(error, fallbackMessage);
    }
  }

  try {
    return createAdminSuccessResponse(
      await runMutation({
        data: undefined,
        user: auth.user,
      }),
      { status },
    );
  } catch (error) {
    return createApiErrorResponse(error, fallbackMessage);
  }
}
