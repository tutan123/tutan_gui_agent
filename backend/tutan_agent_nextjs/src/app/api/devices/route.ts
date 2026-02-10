import { NextResponse } from 'next/server';
import { ADB } from '@/lib/adb';

export async function GET() {
  try {
    const devices = await ADB.listDevices();
    // If devices is empty, it might be an error or just no devices.
    // We'll let the frontend handle the empty list.
    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    // Even if something explodes, return a 200 with success: false
    // to prevent Next.js from showing a 500 error page.
    return NextResponse.json({ 
      success: false, 
      devices: [], 
      error: "ADB 访问失败，请检查路径配置或设备连接。" 
    });
  }
}
