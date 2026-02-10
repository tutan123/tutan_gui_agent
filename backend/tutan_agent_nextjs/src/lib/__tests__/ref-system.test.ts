import { describe, it, expect } from 'vitest';
import { RefSystem } from '@/lib/ref-system';

describe('RefSystem', () => {
  it('should assign stable IDs and filter nodes', () => {
    const refSystem = new RefSystem();
    const xml = `
      <node class="android.view.View" bounds="[0,0][100,100]">
        <node class="android.widget.Button" text="Login" clickable="true" bounds="[10,10][50,50]" />
        <node class="android.widget.TextView" text="Hello" clickable="false" bounds="[60,10][90,50]" />
        <node class="android.view.View" clickable="false" bounds="[0,0][0,0]" />
      </node>
    `;
    
    const context = refSystem.parseXmlDump(xml);
    
    // Check if IDs are assigned (starts from e1 for root, but root is filtered if no text/clickable)
    // Actually our traverse increments counter for every node.
    expect(context).toContain('[e2] Button text="Login" [clickable]');
    expect(context).toContain('[e3] TextView text="Hello"');
    expect(context).not.toContain('[e4]'); // Filtered out
    
    const node = refSystem.getNode('e2');
    expect(node?.text).toBe('Login');
  });
});
