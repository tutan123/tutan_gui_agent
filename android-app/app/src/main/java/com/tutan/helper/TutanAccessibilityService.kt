package com.tutan.helper

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class TutanAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "TutanAccessibility"
        var instance: TutanAccessibilityService? = null
    }

    private var httpServer: TutanHttpServer? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        
        // Start HTTP Server on port 8080
        try {
            httpServer = TutanHttpServer(8080)
            httpServer?.start()
            Log.i(TAG, "Tutan Accessibility Service Connected & HTTP Server started on 8080")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start HTTP Server", e)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Handle events if needed
    }

    override fun onInterrupt() {
        httpServer?.stop()
        instance = null
    }

    override fun onDestroy() {
        super.onDestroy()
        httpServer?.stop()
        instance = null
    }

    /**
     * Capture the current window's accessibility tree as a JSON structure.
     * This is the foundation for the Aria Tree / Ref System.
     */
    fun getAriaTree(): JSONObject {
        val rootNode = rootInActiveWindow ?: return JSONObject().put("error", "No active window")
        return parseNode(rootNode)
    }

    private fun parseNode(node: AccessibilityNodeInfo): JSONObject {
        val json = JSONObject()
        json.put("class", node.className)
        json.put("text", node.text ?: "")
        json.put("contentDescription", node.contentDescription ?: "")
        json.put("id", node.viewIdResourceName ?: "")
        json.put("clickable", node.isClickable)
        json.put("scrollable", node.isScrollable)
        json.put("editable", node.isEditable)
        json.put("focused", node.isFocused)
        
        val bounds = android.graphics.Rect()
        node.getBoundsInScreen(bounds)
        json.put("bounds", JSONObject()
            .put("left", bounds.left)
            .put("top", bounds.top)
            .put("right", bounds.right)
            .put("bottom", bounds.bottom)
        )

        val children = JSONArray()
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                children.put(parseNode(child))
            }
        }
        json.put("children", children)
        
        return json
    }

    /**
     * Perform a tap at specific coordinates.
     */
    fun tap(x: Int, y: int): Boolean {
        val path = Path()
        path.moveTo(x.toFloat(), y.toFloat())
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 50))
            .build()
        return dispatchGesture(gesture, null, null)
    }
}
