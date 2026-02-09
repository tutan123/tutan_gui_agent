from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class RefNode:
    ref_id: str
    role: str
    text: str
    content_description: str
    resource_id: str
    bounds: Dict[str, int]
    clickable: bool
    editable: bool

class RefSystem:
    """
    Semantic Reference System inspired by OpenClaw.
    Assigns stable IDs (e1, e2...) to UI elements for LLM reasoning.
    """
    def __init__(self):
        self.current_refs: Dict[str, RefNode] = {}
        self._ref_counter = 0

    def reset(self):
        self.current_refs = {}
        self._ref_counter = 0

    def parse_aria_tree(self, tree_json: Dict[str, Any]) -> str:
        """
        Convert raw Aria Tree JSON to a flattened reference map and return a text representation for LLM.
        """
        self.reset()
        flattened_nodes = []
        self._traverse(tree_json, flattened_nodes)
        
        # Build text representation
        lines = []
        for node in flattened_nodes:
            # Only include potentially interactive or informative nodes
            if node.text or node.content_description or node.clickable or node.editable:
                self.current_refs[node.ref_id] = node
                desc = f"[{node.ref_id}] {node.role}"
                if node.text:
                    desc += f' text="{node.text}"'
                if node.content_description:
                    desc += f' label="{node.content_description}"'
                if node.clickable:
                    desc += " [clickable]"
                if node.editable:
                    desc += " [editable]"
                lines.append(desc)
        
        return "\n".join(lines)

    def _traverse(self, node: Dict[str, Any], result: List[RefNode]):
        self._ref_counter += 1
        ref_id = f"e{self._ref_counter}"
        
        ref_node = RefNode(
            ref_id=ref_id,
            role=node.get("class", "unknown").split(".")[-1], # Shorten class name
            text=node.get("text", ""),
            content_description=node.get("contentDescription", ""),
            resource_id=node.get("id", ""),
            bounds=node.get("bounds", {}),
            clickable=node.get("clickable", False),
            editable=node.get("editable", False)
        )
        
        result.append(ref_node)
        
        for child in node.get("children", []):
            self._traverse(child, result)

    def get_node(self, ref_id: str) -> Optional[RefNode]:
        return self.current_refs.get(ref_id)
