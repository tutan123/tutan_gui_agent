import { XMLParser } from './xml-parser';

export interface AriaNode {
  class: string;
  text: string;
  contentDescription: string;
  id: string;
  clickable: boolean;
  editable: boolean;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  children: AriaNode[];
}

export interface RefNode {
  refId: string;
  role: string;
  text: string;
  contentDescription: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  clickable: boolean;
  editable: boolean;
}

export class RefSystem {
  private currentRefs: Map<string, RefNode> = new Map();
  private refCounter = 0;

  reset() {
    this.currentRefs.clear();
    this.refCounter = 0;
  }

  /**
   * Parse raw XML from ADB dump and return formatted context for LLM.
   */
  parseXmlDump(xml: string): string {
    const tree = XMLParser.parse(xml);
    return this.parseAriaTree(tree);
  }

  parseAriaTree(tree: AriaNode): string {
    this.reset();
    const flattened: RefNode[] = [];
    this.traverse(tree, flattened);

    const lines: string[] = [];
    for (const node of flattened) {
      // Filter for interactive or meaningful elements
      const isInteractive = node.clickable || node.editable;
      const hasContent = node.text || node.contentDescription;
      
      if (isInteractive || hasContent) {
        this.currentRefs.set(node.refId, node);
        let desc = `[${node.refId}] ${node.role}`;
        if (node.text) desc += ` text="${node.text}"`;
        if (node.contentDescription) desc += ` label="${node.contentDescription}"`;
        if (node.clickable) desc += " [clickable]";
        if (node.editable) desc += " [editable]";
        lines.push(desc);
      }
    }
    return lines.join("\n");
  }

  private traverse(node: AriaNode, result: RefNode[]) {
    this.refCounter++;
    const refId = `e${this.refCounter}`;
    
    const role = node.class.split(".").pop() || "unknown";
    
    result.push({
      refId,
      role,
      text: node.text,
      contentDescription: node.contentDescription,
      bounds: node.bounds,
      clickable: node.clickable,
      editable: node.editable
    });

    if (node.children) {
      for (const child of node.children) {
        this.traverse(child, result);
      }
    }
  }

  getNode(refId: string): RefNode | undefined {
    return this.currentRefs.get(refId);
  }
}
