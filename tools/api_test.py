import requests
import json
from typing import Dict, Any, Optional


def test_endpoint(
    server_address: str, endpoint: str, method="GET", data=None
) -> Optional[Dict[str, Any]]:
    """Test a specific API endpoint and return the response."""
    try:
        url = f"http://{server_address}{endpoint}"
        print(f"\nTesting endpoint: {url} [{method}]")

        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)

        response.raise_for_status()

        if response.status_code == 200:
            print("✅ Success!")
            return response.json()
        else:
            print(f"❌ Failed with status code: {response.status_code}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {str(e)}")
        return None


def get_model_directories(object_info: Dict[str, Any]) -> Dict[str, list]:
    """Extract model directory information from object_info."""
    model_dirs = {
        "checkpoints": set(),
        "loras": set(),
        "embeddings": set(),
        "vae": set(),
        "controlnet": set(),
        "upscale_models": set(),
    }

    # Look for nodes that have file inputs
    for node_name, node_info in object_info.items():
        if isinstance(node_info, dict) and "input" in node_info:
            inputs = node_info["input"]
            if isinstance(inputs, dict):
                for input_name, input_info in inputs.items():
                    if isinstance(input_info, dict) and "filebrowser" in input_info:
                        file_info = input_info["filebrowser"]
                        file_type = file_info.get("type", "")
                        if file_type:
                            print(f"\nFound file browser in {node_name}.{input_name}:")
                            print(f"Type: {file_type}")
                            print(f"Filter: {file_info.get('filter', '')}")

                            # Map file types to categories
                            if "checkpoint" in file_type.lower():
                                model_dirs["checkpoints"].add(file_type)
                            elif "lora" in file_type.lower():
                                model_dirs["loras"].add(file_type)
                            elif "embedding" in file_type.lower():
                                model_dirs["embeddings"].add(file_type)
                            elif "vae" in file_type.lower():
                                model_dirs["vae"].add(file_type)
                            elif "controlnet" in file_type.lower():
                                model_dirs["controlnet"].add(file_type)
                            elif "upscale" in file_type.lower():
                                model_dirs["upscale_models"].add(file_type)

    return {k: sorted(v) for k, v in model_dirs.items()}


def main():
    # ComfyUI server address
    server_address = "192.168.1.109:8188"

    print("🔍 Starting ComfyUI API endpoint testing...")
    print(f"Server address: {server_address}")

    # Get object info to find model directories
    print("\nFetching object info...")
    result = test_endpoint(server_address, "/object_info", "GET")    if result:
        print("\nAnalyzing object info for model directories...")
        model_dirs = get_model_directories(result)
        # Print results
        print("\n📦 Model Directory Types:")
        for category, types in model_dirs.items():
            if types:
                print(f"\n{category.upper()}:")
                for type_info in types:
                    print(f"  - {type_info}")
