import { NextResponse } from "next/server";

import { captureViewEventSchema, recordViewEvent } from "@/lib/analytics";
import { validateJsonRequest } from "@/lib/validation/api-placeholders";

export async function POST(request) {
  const result = await validateJsonRequest(request, captureViewEventSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const event = await recordViewEvent(result.data, {
      request,
    });

    return NextResponse.json(
      {
        data: {
          id: event.id,
        },
        success: true,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "view_event_not_recorded",
        success: false,
      },
      { status: 202 },
    );
  }
}
