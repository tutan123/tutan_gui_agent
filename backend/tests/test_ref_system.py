import pytest
import json
from tutan_agent.core.ref_system import RefSystem

def test_ref_system_parsing():
    ref_sys = RefSystem()
    
    # Mock Aria Tree JSON
    mock_tree = {
        "class": "android.widget.FrameLayout",
        "text": "",
        "contentDescription": "",
        "clickable": False,
        "bounds": {"left": 0, "top": 0, "right": 1080, "bottom": 1920},
        "children": [
            {
                "class": "android.widget.Button",
                "text": "Login",
                "contentDescription": "Login Button",
                "clickable": True,
                "bounds": {"left": 100, "top": 100, "right": 300, "bottom": 200},
                "children": []
            },
            {
                "class": "android.widget.EditText",
                "text": "",
                "contentDescription": "Username",
                "clickable": True,
                "editable": True,
                "bounds": {"left": 100, "top": 300, "right": 500, "bottom": 400},
                "children": []
            }
        ]
    }
    
    context_text = ref_sys.parse_aria_tree(mock_tree)
    
    # Check if IDs are assigned
    assert "[e2] Button" in context_text
    assert "text=\"Login\"" in context_text
    assert "[e3] EditText" in context_text
    assert "[editable]" in context_text
    
    # Check node retrieval
    node = ref_sys.get_node("e2")
    assert node is not None
    assert node.role == "Button"
    assert node.text == "Login"

def test_ref_system_reset():
    ref_sys = RefSystem()
    ref_sys.parse_aria_tree({"class": "View", "clickable": True})
    assert len(ref_sys.current_refs) > 0
    
    ref_sys.reset()
    assert len(ref_sys.current_refs) == 0
    assert ref_sys._ref_counter == 0
