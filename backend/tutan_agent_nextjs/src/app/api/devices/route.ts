import { NextResponse } from 'next/server';
import { ADB } from '@/lib/adb';

export async function GET() {
  try {
    const devices = await ADB.listDevices();
    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
