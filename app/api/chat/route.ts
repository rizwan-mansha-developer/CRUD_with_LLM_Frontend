import { type NextRequest, NextResponse } from "next/server";

// FastAPI backend URL - update this to match your FastAPI server
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, thread_id, messages, settings } = body;

    // Forward request to FastAPI backend
    const response = await fetch(
      `${FASTAPI_URL}/chat/?user_id=2&message=${message}`,
      {
        method: "POST",
        // headers: {
        //   "Content-Type": "application/json",
        //   // Forward any authentication headers if needed
        //   ...(request.headers.get("authorization") && {
        //     Authorization: request.headers.get("authorization")!,
        //   }),
        // },
        // body: JSON.stringify({
        //   user_id: 2,
        //   message: message,
        // }),
        // body: JSON.stringify({
        //   message,
        //   thread_id,
        //   messages: messages || [],
        //   use_functions: settings?.enableFunctions ?? true,
        //   model: settings?.model || "gpt-4",
        //   temperature: settings?.temperature || 0.7,
        //   available_functions: settings?.availableFunctions || ["get_weather", "calculate", "search_web", "get_time"],
        //   function_call_timeout: 30, // seconds
        //   max_function_calls: 5, // prevent infinite loops
        // }),
      }
    );

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("data is here:", data);

    return NextResponse.json({
      response: data.response || data.message,
      function_calls: data.function_calls || [],
      thread_id: data.thread_id || thread_id,
      usage: data.usage || null,
      function_call_count: data.function_calls?.length || 0,
      execution_time: data.execution_time || null,
      model_used: data.model_used || settings?.model || "gpt-4",
    });
  } catch (error) {
    console.error("Error calling FastAPI backend:", error);

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
        function_calls: [], // Return empty array to prevent frontend errors
      },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests for health checks
export async function GET() {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: "FastAPI backend is healthy",
        backend_info: data,
      });
    } else {
      return NextResponse.json(
        { status: "FastAPI backend is not responding" },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { status: "Cannot connect to FastAPI backend" },
      { status: 503 }
    );
  }
}
