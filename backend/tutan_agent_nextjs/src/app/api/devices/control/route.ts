import { NextResponse } from 'next/server';
import { ADB } from '@/lib/adb';

export async function POST(req: Request) {
  try {
    const { serial, action, params } = await req.json();

    if (!serial) {
      return NextResponse.json({ success: false, error: 'Missing serial' }, { status: 400 });
    }

    switch (action) {
      case 'tap':
        await ADB.tap(serial, params.x, params.y);
        break;
      case 'swipe':
        await ADB.swipe(serial, params.x1, params.y1, params.x2, params.y2, params.duration);
        break;
      case 'longPress':
        await ADB.longPress(serial, params.x, params.y, params.duration);
        break;
      case 'typeText':
        await ADB.typeText(serial, params.text);
        break;
      case 'key':
        await ADB.sendKey(serial, params.key);
        break;
      case 'dump':
        const xml = await ADB.dumpHierarchy(serial);
        return NextResponse.json({ success: true, xml });
      case 'screenshot':
        const buffer = await ADB.takeScreenshot(serial);
        return new Response(buffer, {
          headers: { 'Content-Type': 'image/png' }
        });
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Control API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
