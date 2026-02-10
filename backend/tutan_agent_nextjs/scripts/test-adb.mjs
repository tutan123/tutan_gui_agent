import { ADB } from '../src/lib/adb';

async function main() {
  console.log('--- ADB Integration Test ---');
  
  const devices = await ADB.listDevices();
  console.log('Connected devices:', devices);

  if (devices.length === 0) {
    console.log('No devices found. Skipping further tests.');
    return;
  }

  const serial = devices[0].serial;
  console.log(`Using device: ${serial}`);

  try {
    console.log('1. Getting screen size...');
    const size = await ADB.getScreenSize(serial);
    console.log('Screen size:', size);

    console.log('2. Dumping hierarchy...');
    const xml = await ADB.dumpHierarchy(serial);
    console.log(`Hierarchy dumped, length: ${xml.length}`);

    console.log('3. Taking screenshot...');
    const screenshot = await ADB.takeScreenshot(serial);
    console.log(`Screenshot taken, size: ${screenshot.length} bytes`);

    console.log('4. Testing back button...');
    await ADB.sendKey(serial, 'BACK');
    console.log('Back button pressed.');

    console.log('--- ADB Integration Test Completed ---');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
