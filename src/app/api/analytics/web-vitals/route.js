import { NextResponse } from "next/server";
import { captureWebVitalSchema, recordWebVitalMetric } from "@/lib/analytics";
import { validateJsonRequest } from "@/lib/validation/api-request";

export async function POST(request) {
  const result = await validateJsonRequest(request, captureWebVitalSchema);

  if (result.response) {
    return result.response;
  }

  try {
    const metric = await recordWebVitalMetric(result.data);

    return NextResponse.json(
      {
        data: metric ? { id: metric.id, name: metric.name, path: metric.path } : null,
        success: true,
      },
      { status: metric ? 201 : 202 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "web_vital_not_recorded",
        success: false,
      },
      { status: 202 },
    );
  }
}
