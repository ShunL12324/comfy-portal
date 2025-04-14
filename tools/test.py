import json
import requests
import uuid
import websocket
from PIL import Image
import io
import os
from urllib.parse import quote
import urllib.request
import urllib.parse

server_address = "192.168.123.158:8188"
client_id = str(uuid.uuid4())


def load_workflow(workflow_path):
    try:
        with open(workflow_path, "r") as file:
            workflow = json.load(file)
            print("Successfully loaded workflow from setu.json")

            # Generate random seed for each generation
            if "251" in workflow and "inputs" in workflow["251"]:
                new_seed = uuid.uuid4().int & ((1 << 64) - 1)
                workflow["251"]["inputs"]["noise_seed"] = new_seed
                print(f"Using random seed: {new_seed}")

            return workflow
    except Exception as e:
        print(f"Error loading workflow: {e}")
        return None


def queue_prompt(prompt):
    p = {"prompt": prompt, "client_id": client_id}
    data = json.dumps(p).encode("utf-8")
    req = urllib.request.Request(f"http://{server_address}/prompt", data=data)
    print("Sending request to server...")
    return json.loads(urllib.request.urlopen(req).read())


def get_history(prompt_id):
    with urllib.request.urlopen(
        f"http://{server_address}/history/{prompt_id}"
    ) as response:
        return json.loads(response.read())


def get_queue():
    try:
        with urllib.request.urlopen(f"http://{server_address}/queue") as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error getting queue info: {e}")
        return None


def download_image(filename, subfolder, type_):
    try:
        # Create output directory if it doesn't exist
        os.makedirs("output", exist_ok=True)

        # Download the image
        data = {"filename": filename, "subfolder": subfolder, "type": type_}
        url_values = urllib.parse.urlencode(data)
        url = f"http://{server_address}/view?{url_values}"
        print(f"Downloading image from: {url}")

        with urllib.request.urlopen(url) as response:
            image_data = response.read()

        # Save the image
        output_filename = os.path.join("output", filename)
        with open(output_filename, "wb") as f:
            f.write(image_data)
        print(f"Saved image to: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None


def get_prompt_status():
    try:
        with urllib.request.urlopen(f"http://{server_address}/prompt") as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error getting prompt status: {e}")
        return None


def track_generation(ws, prompt_id, prompt):
    print(f"\nGenerating image...")

    # 定义我们关心的事件类型
    EVENTS = {"executing", "progress"}

    # 进度追踪
    total_nodes = len(prompt.keys())
    completed_nodes = 0
    sampling_progress = 0

    def calculate_total_progress():
        # 节点执行进度占50%，采样进度占50%
        node_progress = (completed_nodes / total_nodes) * 50 if total_nodes > 0 else 0
        return node_progress + (sampling_progress * 0.5)

    while True:
        try:
            message = ws.recv()
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    msg_type = data.get("type", "")

                    if msg_type not in EVENTS:
                        continue

                    msg_data = data.get("data", {})
                    if msg_data.get("prompt_id") != prompt_id:
                        continue

                    # 检查任务是否完成
                    if msg_type == "executing":
                        node = msg_data.get("node")
                        if node is None:
                            print("\nGeneration completed!")
                            return True
                        elif node in prompt:
                            completed_nodes += 1
                            progress = calculate_total_progress()
                            print(f"\rProgress: {progress:.1f}%", end="", flush=True)

                    # 处理采样进度
                    elif msg_type == "progress":
                        value = msg_data.get("value", 0)
                        max_value = msg_data.get("max", 0)
                        if max_value > 0:
                            sampling_progress = (value / max_value) * 100
                            progress = calculate_total_progress()
                            print(f"\rProgress: {progress:.1f}%", end="", flush=True)

                except json.JSONDecodeError:
                    continue
                except KeyError:
                    continue
            elif isinstance(message, bytes):
                continue
        except websocket.WebSocketConnectionClosedException:
            print("\nWebSocket connection closed")
            return False
        except Exception as e:
            print(f"\nError tracking progress: {e}")
            return False


def process_workflow(prompt):
    try:
        # Queue the prompt
        result = queue_prompt(prompt)
        prompt_id = result["prompt_id"]
        print(f"Prompt ID: {prompt_id}")

        # Connect to websocket
        ws = websocket.WebSocket()
        ws.connect(f"ws://{server_address}/ws?clientId={client_id}")
        print("WebSocket connected")

        try:
            # Track progress
            if not track_generation(ws, prompt_id, prompt):
                print("Failed to complete workflow")
                return []

            # Get history and process images
            history = get_history(prompt_id)
            if not history or prompt_id not in history:
                return []

            downloaded_images = []
            outputs = history[prompt_id]["outputs"]

            for node_id in outputs:
                node_output = outputs[node_id]
                if "images" in node_output:
                    for image in node_output["images"]:
                        filename = image.get("filename", "")
                        subfolder = image.get("subfolder", "")
                        type_ = image.get("type", "")
                        if filename:
                            image_path = download_image(filename, subfolder, type_)
                            if image_path:
                                downloaded_images.append(image_path)

            return downloaded_images

        finally:
            ws.close()

    except Exception as e:
        print(f"Error processing workflow: {e}")
        return []


def main():
    print("Starting workflow execution...")

    # Load workflow
    prompt = load_workflow("tools/setu.json")
    if not prompt:
        return

    # Process workflow and get images
    downloaded_images = process_workflow(prompt)

    # Print results
    print(f"\nDownloaded {len(downloaded_images)} images:")
    for image_path in downloaded_images:
        print(f"- {image_path}")

    if downloaded_images:
        print("Workflow completed successfully")
    else:
        print("Workflow failed to generate any images")


if __name__ == "__main__":
    main()
