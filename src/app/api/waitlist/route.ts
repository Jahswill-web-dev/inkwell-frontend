import { NextResponse } from "next/server";
import { waitlistSchema, type WaitlistResponse } from "@/lib/waitlist";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<WaitlistResponse>(
      { success: false, message: "Send a valid JSON request." },
      { status: 400 },
    );
  }

  const result = waitlistSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json<WaitlistResponse>(
      {
        success: false,
        message: "Check the highlighted fields and try again.",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const apiUrl = process.env.WAITLIST_API_URL;
  const apiKey = process.env.WAITLIST_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Waitlist service is not configured.");
    return NextResponse.json<WaitlistResponse>(
      {
        success: false,
        message:
          "The waitlist is temporarily unavailable. Please try again later.",
      },
      { status: 500 },
    );
  }

  const formData = new FormData();
  formData.set("name", result.data.name);
  formData.set("email", result.data.email);

  try {
    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstreamResponse.ok) {
      console.error(
        `Waitlist service rejected a request with status ${upstreamResponse.status}.`,
      );
      return NextResponse.json<WaitlistResponse>(
        {
          success: false,
          message: "We couldn't add you right now. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "You're added to the waitlist",
    });
  } catch (error) {
    console.error(
      "Waitlist service request failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json<WaitlistResponse>(
      {
        success: false,
        message: "We couldn't add you right now. Please try again.",
      },
      { status: 502 },
    );
  }
}
