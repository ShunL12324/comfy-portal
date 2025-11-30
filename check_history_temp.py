import urllib.request
import json
import sys

def get_history(host):
    url = f"http://{host}/history"
    print(f"Fetching history from {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            # Get the last item
            if not data:
                print("No history found.")
                return
            
            # History is a dict where keys are prompt_ids. 
            # We want the most recent one.
            # However, the order of keys in a dict is insertion order in Python 3.7+, 
            # but ComfyUI might return them in any order? 
            # Usually it's ordered.
            last_prompt_id = list(data.keys())[-1]
            print(f"Last Prompt ID: {last_prompt_id}")
            print(json.dumps(data[last_prompt_id], indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1:8188"
    get_history(host)
