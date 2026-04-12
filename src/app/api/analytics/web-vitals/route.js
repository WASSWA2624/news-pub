import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const payload = await request.json();

    if (process.env.NODE_ENV !== "production") {
      console.info("web-vitals", payload);
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
  });
}
