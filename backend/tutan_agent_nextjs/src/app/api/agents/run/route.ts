import { NextResponse } from 'next/server';
import { ADB } from '@/lib/adb';
import { RefSystem } from '@/lib/ref-system';

const refSystem = new RefSystem();

export async function POST(req: Request) {
  try {
    const { serial, task } = await req.json();
    
    if (!serial || !task) {
      return NextResponse.json({ success: false, error: "Missing serial or task" }, { status: 400 });
    }

    // 1. Get UI Context via ADB Dump
    console.log(`[Agent] Dumping hierarchy for ${serial}...`);
    const xml = await ADB.dumpHierarchy(serial);
    
    // 2. Parse into Ref System
    const uiContext = refSystem.parseXmlDump(xml);
    console.log(`[Agent] UI Context generated (${uiContext.split('\n').length} elements)`);

    // 3. (Mock) LLM Decision
    // In Phase 4, we will integrate a real LLM call here.
    // For now, we'll return the context so the user can see it's working.
    
    return NextResponse.json({ 
      success: true, 
      message: "Context perceived successfully",
      uiContext: uiContext,
      nextStepSuggestion: "In Phase 4, LLM will decide the next action based on this context."
    });
  } catch (error: any) {
    console.error('[Agent Run Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
