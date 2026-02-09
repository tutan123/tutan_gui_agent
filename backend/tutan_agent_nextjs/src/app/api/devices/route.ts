import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync('adb devices -l');
    const lines = stdout.trim().split('\n').slice(1);
    
    const devices = lines.map(line => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) return null;
      
      const serial = parts[0];
      const status = parts[1];
      const modelMatch = line.match(/model:(\S+)/);
      const model = modelMatch ? modelMatch[1] : 'unknown';
      
      return { serial, status, model };
    }).filter(Boolean);

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
