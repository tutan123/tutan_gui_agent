import { AriaNode } from './ref-system';

export class XMLParser {
  /**
   * Parse Android UI XML string into a JSON AriaNode tree.
   */
  static parse(xml: string): AriaNode {
    // Android XML dump is usually a single line or very simple.
    // We'll use a recursive approach to build the tree.
    
    // 1. Extract all nodes using a regex that captures attributes
    const nodeRegex = /<node\s+([^>]+?)\s*(\/>|>)/g;
    const attrRegex = /([a-z-]+)="([^"]*)"/g;

    const root: AriaNode = {
      class: "root",
      text: "",
      contentDescription: "",
      id: "",
      clickable: false,
      editable: false,
      bounds: { left: 0, top: 0, right: 0, bottom: 0 },
      children: []
    };

    const stack: AriaNode[] = [root];
    let match;

    while ((match = nodeRegex.exec(xml)) !== null) {
      const attrString = match[1];
      const isSelfClosing = match[2] === "/>";
      
      const attrs: Record<string, string> = {};
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrString)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const node: AriaNode = {
        class: attrs["class"] || "unknown",
        text: attrs["text"] || "",
        contentDescription: attrs["content-desc"] || "",
        id: attrs["resource-id"] || "",
        clickable: attrs["clickable"] === "true",
        editable: attrs["focusable"] === "true" && attrs["class"]?.includes("Edit"),
        bounds: this.parseBounds(attrs["bounds"] || "[0,0][0,0]"),
        children: []
      };

      // Add to parent
      const currentParent = stack[stack.length - 1];
      currentParent.children.push(node);

      if (!isSelfClosing) {
        stack.push(node);
      }

      // Check for closing tags to pop from stack
      const remainingXml = xml.substring(nodeRegex.lastIndex);
      const closeTagMatch = remainingXml.match(/^\s*<\/node>/);
      if (closeTagMatch) {
        // This is a bit tricky with global regex. 
        // A better way is to use a proper parser, but let's refine this.
      }
    }

    // Since the regex approach above is complex for nested structures without a real parser,
    // let's use a simpler but more reliable recursive descent approach.
    return this.parseRecursive(xml) || root;
  }

  private static parseRecursive(xml: string): AriaNode | null {
    const tagMatch = xml.match(/<node\s+([^>]+?)(\s*\/>|>([\s\S]*?)<\/node>)/);
    if (!tagMatch) return null;

    const attrString = tagMatch[1];
    const content = tagMatch[3];
    
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-z-]+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const node: AriaNode = {
      class: attrs["class"] || "unknown",
      text: attrs["text"] || "",
      contentDescription: attrs["content-desc"] || "",
      id: attrs["resource-id"] || "",
      clickable: attrs["clickable"] === "true",
      editable: attrs["focusable"] === "true" && attrs["class"]?.includes("Edit"),
      bounds: this.parseBounds(attrs["bounds"] || "[0,0][0,0]"),
      children: []
    };

    if (content) {
      // Find direct children
      let remainingContent = content;
      while (remainingContent.trim()) {
        const childMatch = remainingContent.match(/<node\s+[\s\S]*?(\/>|<\/node>)/);
        if (childMatch) {
          const childNode = this.parseRecursive(childMatch[0]);
          if (childNode) node.children.push(childNode);
          remainingContent = remainingContent.substring(childMatch.index! + childMatch[0].length);
        } else {
          break;
        }
      }
    }

    return node;
  }

  private static parseBounds(boundsStr: string) {
    // Format: [left,top][right,bottom]  e.g., [0,0][1080,1920]
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      return {
        left: parseInt(match[1]),
        top: parseInt(match[2]),
        right: parseInt(match[3]),
        bottom: parseInt(match[4])
      };
    }
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
}
