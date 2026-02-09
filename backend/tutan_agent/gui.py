import gradio as gr
import httpx
import asyncio
import socketio
import json
from PIL import Image
import io

# Backend API URL
API_URL = "http://localhost:18888"

# Socket.IO client
sio = socketio.AsyncClient()

# Global state to store agent logs and screen data
agent_logs = []
current_screen = None

async def connect_to_backend():
    try:
        await sio.connect(API_URL)
        print("Connected to backend via Socket.IO")
    except Exception as e:
        print(f"Failed to connect to backend: {e}")

@sio.on("agent_step")
async def on_agent_step(data):
    log_entry = f"Step {data['step']}: {data['thinking']}\nAction: {data['action']}({data['params']})"
    agent_logs.append(log_entry)

@sio.on("screen_data")
async def on_screen_data(data):
    # This would receive raw H.264 chunks in a real implementation.
    # For this prototype, we'll just log that we received data.
    pass

async def get_devices():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_URL}/api/devices")
            if response.status_code == 200:
                devices = response.json()["devices"]
                return [f"{d['serial']} ({d['model']})" for d in devices]
        except Exception as e:
            return [f"Error: {e}"]
    return []

async def start_agent(device_info):
    serial = device_info.split(" ")[0]
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_URL}/api/agents/start?serial={serial}")
            return response.json()["message"]
        except Exception as e:
            return f"Error: {e}"

async def run_task(device_info, task):
    serial = device_info.split(" ")[0]
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_URL}/api/agents/run?serial={serial}&task={task}")
            return response.json()["message"]
        except Exception as e:
            return f"Error: {e}"

def update_logs():
    return "\n\n".join(agent_logs[-10:])

# Gradio UI
with gr.Blocks(title="TUTAN_AGENT Console") as demo:
    gr.Markdown("# 🤖 TUTAN_AGENT 控制台")
    
    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### 📱 设备管理")
            device_dropdown = gr.Dropdown(label="选择设备", choices=[])
            refresh_btn = gr.Button("刷新设备列表")
            start_agent_btn = gr.Button("启动 Agent", variant="primary")
            status_output = gr.Textbox(label="状态", interactive=False)
            
            gr.Markdown("### 🎯 任务执行")
            task_input = gr.Textbox(label="任务指令", placeholder="例如：打开微信，给张三发消息说你好")
            run_btn = gr.Button("执行任务", variant="primary")
            
        with gr.Column(scale=2):
            gr.Markdown("### 📋 Agent 日志")
            log_display = gr.Textbox(label="实时日志", lines=15, interactive=False)
            log_timer = gr.Timer(1.0)
            log_timer.tick(update_logs, outputs=log_display)

    # Event bindings
    refresh_btn.click(get_devices, outputs=device_dropdown)
    start_agent_btn.click(start_agent, inputs=device_dropdown, outputs=status_output)
    run_btn.click(run_task, inputs=[device_dropdown, task_input], outputs=status_output)

    # Connect to Socket.IO on load
    demo.load(connect_to_backend)

if __name__ == "__main__":
    demo.launch(server_port=18889)
