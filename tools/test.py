import json
import requests
from urllib import request
import sys
import time
import uuid
import websocket
from PIL import Image
import io
import os
from urllib.parse import quote

server_address = "192.168.1.109:8188"
client_id = str(uuid.uuid4())


def load_workflow(workflow_path):
    try:
        with open(workflow_path, "r") as file:
            workflow = json.load(file)
            print("Successfully loaded workflow from setu.json")
            return workflow
    except Exception as e:
        print(f"Error loading workflow: {e}")
        sys.exit(1)


def queue_prompt(prompt):
    try:
        p = {"prompt": prompt, "client_id": client_id}
        data = json.dumps(p).encode("utf-8")
        print(f"Sending request to http://{server_address}/prompt")
        req = request.Request(f"http://{server_address}/prompt", data=data)
        response = request.urlopen(req)
        return json.loads(response.read())
    except Exception as e:
        print(f"Error queuing prompt: {e}")
        sys.exit(1)


def get_history(prompt_id):
    try:
        with request.urlopen(
            f"http://{server_address}/history/{prompt_id}"
        ) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error getting history: {e}")
        return None


def download_image(filename, subfolder, type_):
    try:
        # Create output directory if it doesn't exist
        os.makedirs("output", exist_ok=True)

        # Properly encode the filename and subfolder
        encoded_filename = quote(filename)
        encoded_subfolder = quote(subfolder if subfolder else "")

        # Download the image
        url = f"http://{server_address}/view?filename={encoded_filename}&subfolder={encoded_subfolder}&type={type_}"
        print(f"Downloading image from: {url}")
        response = requests.get(url)
        response.raise_for_status()

        # Save the image
        output_filename = os.path.join("output", filename)
        with open(output_filename, "wb") as f:
            f.write(response.content)
        print(f"Saved image to: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None


def track_progress(ws, prompt_id, prompt):
    node_ids = list(prompt.keys())
    finished_nodes = []

    while True:
        try:
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)

                # Track K-Sampler progress
                if message["type"] == "progress":
                    data = message["data"]
                    print(f'K-Sampler Progress: Step {data["value"]} of {data["max"]}')

                # Track node execution
                elif message["type"] == "execution_cached":
                    data = message["data"]
                    for node in data["nodes"]:
                        if node not in finished_nodes:
                            finished_nodes.append(node)
                            print(
                                f"Progress: {len(finished_nodes)}/{len(node_ids)} nodes completed"
                            )

                # Track execution status
                elif message["type"] == "executing":
                    data = message["data"]
                    if data["node"] is not None:
                        if data["node"] not in finished_nodes:
                            finished_nodes.append(data["node"])
                            print(f'Executing node: {data["node"]}')
                            print(
                                f"Progress: {len(finished_nodes)}/{len(node_ids)} nodes completed"
                            )
                    elif data["prompt_id"] == prompt_id:
                        print("Execution completed")
                        return True

                # Handle execution errors
                elif message["type"] == "execution_error":
                    print(
                        f"Execution error: {message.get('data', {}).get('error', 'Unknown error')}"
                    )
                    return False

            else:
                continue

        except Exception as e:
            print(f"Error tracking progress: {e}")
            return False


def process_workflow(prompt):
    try:
        # Connect to websocket
        ws = websocket.WebSocket()
        ws.connect(f"ws://{server_address}/ws?clientId={client_id}")
        print("WebSocket connected")

        # Queue the prompt
        prompt_id = queue_prompt(prompt)["prompt_id"]
        print(f"Prompt ID: {prompt_id}")

        # Track progress
        if not track_progress(ws, prompt_id, prompt):
            print("Failed to complete workflow")
            return []

        # Get history and process images
        history = get_history(prompt_id)
        if not history:
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

    except Exception as e:
        print(f"Error processing workflow: {e}")
        return []
    finally:
        if "ws" in locals():
            ws.close()


def main():
    print("Starting workflow execution...")

    # Load workflow
    prompt = load_workflow("tools/setu.json")

    # Process workflow and get images
    downloaded_images = process_workflow(prompt)

    # Print results
    print(f"\nDownloaded {len(downloaded_images)} images:")
    for image_path in downloaded_images:
        print(f"- {image_path}")

    print("Workflow completed successfully")


if __name__ == "__main__":
    main()
