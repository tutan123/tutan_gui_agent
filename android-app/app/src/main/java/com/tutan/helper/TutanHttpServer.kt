package com.tutan.helper

import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject
import android.util.Log

class TutanHttpServer(port: Int) : NanoHTTPD(port) {

    companion object {
        private const val TAG = "TutanHttpServer"
    }

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        val method = session.method

        Log.d(TAG, "Request: $method $uri")

        return try {
            when {
                uri == "/status" && method == Method.GET -> {
                    val status = JSONObject().put("status", "ok").put("service_active", TutanAccessibilityService.instance != null)
                    newFixedLengthResponse(Response.Status.OK, "application/json", status.toString())
                }
                uri == "/aria-tree" && method == Method.GET -> {
                    val service = TutanAccessibilityService.instance
                    if (service == null) {
                        newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, "application/json", "{\"error\": \"Accessibility Service not active\"}")
                    } else {
                        val tree = service.getAriaTree()
                        newFixedLengthResponse(Response.Status.OK, "application/json", tree.toString())
                    }
                }
                uri == "/tap" && method == Method.POST -> {
                    val files = mutableMapOf<String, String>()
                    session.parseBody(files)
                    val postData = files["postData"] ?: ""
                    val json = JSONObject(postData)
                    val x = json.getInt("x")
                    val y = json.getInt("y")
                    
                    val service = TutanAccessibilityService.instance
                    if (service == null) {
                        newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, "application/json", "{\"error\": \"Accessibility Service not active\"}")
                    } else {
                        val success = service.tap(x, y)
                        newFixedLengthResponse(Response.Status.OK, "application/json", "{\"success\": $success}")
                    }
                }
                else -> newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found")
            }
        } catch (e: Exception) {
            Log.error(TAG, "Error serving request", e)
            newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json", "{\"error\": \"${e.message}\"}")
        }
    }
}
