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
    // Find the first <node ...> tag
    const startTagMatch = xml.match(/<node\s+([^>]+?)(\s*\/?>)/);
    if (!startTagMatch) return null;

    const attrString = startTagMatch[1];
    const isSelfClosing = startTagMatch[2].includes('/');
    
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

    if (!isSelfClosing) {
      // Find the corresponding </node> tag by counting depth
      let depth = 1;
      let currentIndex = startTagMatch.index! + startTagMatch[0].length;
      let contentStart = currentIndex;
      let contentEnd = -1;

      const tagRegex = /<(\/?)node/g;
      tagRegex.lastIndex = currentIndex;
      
      let tagMatch;
      while ((tagMatch = tagRegex.exec(xml)) !== null) {
        if (tagMatch[1] === '/') {
          depth--;
        } else {
          // Check if this is a self-closing tag
          const restOfTag = xml.substring(tagMatch.index).match(/<node\s+[^>]*?(\/?)>/);
          if (restOfTag && !restOfTag[1]) {
            depth++;
          }
        }

        if (depth === 0) {
          contentEnd = tagMatch.index;
          break;
        }
      }

      if (contentEnd !== -1) {
        const content = xml.substring(contentStart, contentEnd);
        let remainingContent = content;
        while (remainingContent.trim()) {
          const childNode = this.parseRecursive(remainingContent);
          if (childNode) {
            node.children.push(childNode);
            // We need to skip the entire child node in the remaining content
            // This is tricky because parseRecursive doesn't return how much it consumed.
            // Let's find the end of the child node we just parsed.
            const childStartMatch = remainingContent.match(/<node\s+[^>]*?(\/?)>/);
            if (childStartMatch) {
              if (childStartMatch[1]) { // self-closing
                remainingContent = remainingContent.substring(childStartMatch.index! + childStartMatch[0].length);
              } else {
                // find matching close tag for this child
                let cDepth = 1;
                let cIdx = childStartMatch.index! + childStartMatch[0].length;
                const cTagRegex = /<(\/?)node/g;
                cTagRegex.lastIndex = cIdx;
                let cTagMatch;
                while ((cTagMatch = cTagRegex.exec(remainingContent)) !== null) {
                  if (cTagMatch[1] === '/') {
                    cDepth--;
                  } else {
                    const cRest = remainingContent.substring(cTagMatch.index).match(/<node\s+[^>]*?(\/?)>/);
                    if (cRest && !cRest[1]) cDepth++;
                  }
                  if (cDepth === 0) {
                    remainingContent = remainingContent.substring(cTagMatch.index + cTagMatch[0].length);
                    break;
                  }
                }
              }
            } else {
              break;
            }
          } else {
            break;
          }
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
