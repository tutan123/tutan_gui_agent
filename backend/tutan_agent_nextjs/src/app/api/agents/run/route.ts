import { NextResponse } from 'next/server';
import { TutanAgent } from '@/lib/agent';

export async function POST(req: Request) {
  try {
    const { serial, task, config } = await req.json();
    
    if (!serial || !task) {
      return NextResponse.json({ success: false, error: "Missing serial or task" }, { status: 400 });
    }

    const agent = new TutanAgent(serial, config);
    
    // Create a TransformStream for streaming events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of agent.runTask(task)) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error: any) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Agent Run Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
