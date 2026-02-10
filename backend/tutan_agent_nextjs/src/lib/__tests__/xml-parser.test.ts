import { describe, it, expect } from 'vitest';
import { XMLParser } from '@/lib/xml-parser';

describe('XMLParser', () => {
  it('should parse simple Android UI XML', () => {
    const xml = `
      <node class="android.widget.FrameLayout" bounds="[0,0][1080,1920]">
        <node class="android.widget.Button" text="Click Me" resource-id="com.example:id/btn" clickable="true" bounds="[100,100][200,200]" />
      </node>
    `;
    const tree = XMLParser.parse(xml);
    
    expect(tree.class).toBe('android.widget.FrameLayout');
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].text).toBe('Click Me');
    expect(tree.children[0].clickable).toBe(true);
    expect(tree.children[0].bounds).toEqual({ left: 100, top: 100, right: 200, bottom: 200 });
  });

  it('should handle nested nodes', () => {
    const xml = `
      <node class="A">
        <node class="B">
          <node class="C" text="Deep" />
        </node>
      </node>
    `;
    const tree = XMLParser.parse(xml);
    expect(tree.children[0].children[0].text).toBe('Deep');
  });
});
