import { NextResponse } from 'next/server';
import { ActionExecutor } from '@/lib/action-executor';
import { RefSystem } from '@/lib/ref-system';

// We need a way to persist the RefSystem across requests if we want to use ref_ids.
// For now, we'll use a global instance (not ideal for production multi-user, but okay for prototype).
const refSystem = new RefSystem();

export async function POST(req: Request) {
  try {
    const { serial, action, params, xml } = await req.json();
    
    if (!serial || !action) {
      return NextResponse.json({ success: false, error: "Missing serial or action" }, { status: 400 });
    }

    // If XML is provided, update the RefSystem first
    if (xml) {
      refSystem.parseXmlDump(xml);
    }

    const executor = new ActionExecutor(serial, refSystem);
    const success = await executor.execute(action, params);

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('[Agent Action Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
