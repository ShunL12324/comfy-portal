#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
handle_error() {
  log_error "An error occurred on line $1"
  exit 1
}

trap 'handle_error $LINENO' ERR

# Help message
show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo "  --no-model-manager    Skip installation of ComfyUI Model Manager"
  echo "  --help               Show this help message"
}

# Parse command line arguments
INSTALL_MODEL_MANAGER=true
while [[ $# -gt 0 ]]; do
  case $1 in
  --no-model-manager)
    INSTALL_MODEL_MANAGER=false
    shift
    ;;
  --help)
    show_help
    exit 0
    ;;
  *)
    log_error "Unknown argument: $1"
    show_help
    exit 1
    ;;
  esac
done

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  log_error "Please run as root (use sudo)"
  exit 1
fi

# Check if we're in RunPod environment
if [ ! -d "/workspace" ]; then
  log_error "This script is designed to run in a RunPod environment"
  exit 1
fi

# Show installation plan
echo -e "${BLUE}=== ComfyUI Installation Plan ===${NC}"
echo -e "This script will:"
echo -e "1. Update system packages"
echo -e "2. Install essential tools (git, zsh, tmux)"
echo -e "3. Clone and set up ComfyUI in /workspace"
echo -e "4. Install ComfyUI Manager"
if [ "$INSTALL_MODEL_MANAGER" = true ]; then
  echo -e "5. Install ComfyUI Model Manager"
fi
echo -e "6. Create necessary model directories"
echo -e "7. Start ComfyUI in a tmux session named 'comfyui'"
echo
echo -e "${YELLOW}Note: This installation requires an internet connection and may take several minutes.${NC}"
echo -e "${YELLOW}Please ensure you have sufficient disk space available.${NC}"
echo

# Ask for confirmation
read -p "Do you want to proceed with the installation? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "Installation cancelled by user"
  exit 0
fi

log_info "Starting ComfyUI installation..."

# Update system packages
log_info "Updating system packages..."
apt update && apt upgrade -y || {
  log_error "Failed to update system packages"
  exit 1
}

# Install essential tools
log_info "Installing essential tools..."
apt install -y git zsh tmux || {
  log_error "Failed to install essential tools"
  exit 1
}

# Change to workspace directory
cd /workspace

# Clone ComfyUI repository
log_info "Cloning ComfyUI repository..."
if [ ! -d "ComfyUI" ]; then
  git clone https://github.com/comfyanonymous/ComfyUI.git || {
    log_error "Failed to clone ComfyUI repository"
    exit 1
  }
else
  log_warn "ComfyUI directory already exists, skipping clone"
fi

cd ComfyUI

# Install ComfyUI dependencies
log_info "Installing ComfyUI dependencies..."
pip install --no-cache-dir -r requirements.txt || {
  log_error "Failed to install ComfyUI dependencies"
  exit 1
}

# Create custom_nodes directory if it doesn't exist
mkdir -p custom_nodes

# Install ComfyUI Manager
log_info "Installing ComfyUI Manager..."
if [ ! -d "custom_nodes/ComfyUI-Manager" ]; then
  git clone https://github.com/ltdrdata/ComfyUI-Manager.git custom_nodes/ComfyUI-Manager || {
    log_error "Failed to install ComfyUI Manager"
    exit 1
  }
else
  log_warn "ComfyUI Manager already installed, skipping"
fi

# Install Model Manager (optional)
if [ "$INSTALL_MODEL_MANAGER" = true ]; then
  log_info "Installing ComfyUI Model Manager..."
  if [ ! -d "custom_nodes/ComfyUI-Model-Manager" ]; then
    git clone https://github.com/hayden-fr/ComfyUI-Model-Manager.git custom_nodes/ComfyUI-Model-Manager || {
      log_error "Failed to install ComfyUI Model Manager"
      exit 1
    }
  else
    log_warn "ComfyUI Model Manager already installed, skipping"
  fi
else
  log_info "Skipping ComfyUI Model Manager installation"
fi

# Create models directory structure
log_info "Creating model directories..."
mkdir -p models/{checkpoints,configs,embeddings,loras,upscale_models,vae}

log_info "ComfyUI installation completed successfully!"

# Start ComfyUI in tmux session
log_info "Starting ComfyUI in tmux session..."

# Kill existing session if it exists
tmux kill-session -t comfyui 2>/dev/null || true

# Try to start ComfyUI in tmux session
if tmux new-session -d -s comfyui; then
  tmux send-keys -t comfyui "cd /workspace/ComfyUI" C-m
  tmux send-keys -t comfyui "python main.py --listen 0.0.0.0 --port 8188" C-m

  # Wait a bit to check if the session is still alive
  sleep 3
  if tmux has-session -t comfyui 2>/dev/null; then
    log_info "ComfyUI is now running in tmux session 'comfyui'"
    echo
    echo -e "${GREEN}=== How to access ComfyUI ===${NC}"
    echo -e "1. View ComfyUI logs and interact with the server:"
    echo -e "   ${BLUE}tmux attach -t comfyui${NC}"
    echo -e "2. Detach from tmux session (keep server running):"
    echo -e "   ${BLUE}Press Ctrl+B, then D${NC}"
    echo -e "3. Stop ComfyUI server:"
    echo -e "   ${BLUE}tmux kill-session -t comfyui${NC}"
    echo
    echo -e "${GREEN}ComfyUI is running at:${NC} http://localhost:8188"
  else
    log_warn "ComfyUI tmux session started but may have crashed"
    show_manual_instructions
  fi
else
  log_warn "Failed to start ComfyUI in tmux session"
  show_manual_instructions
fi

# Function to show manual running instructions
show_manual_instructions() {
  echo
  echo -e "${YELLOW}=== How to run ComfyUI manually ===${NC}"
  echo -e "Run these commands to start ComfyUI:"
  echo -e "${BLUE}cd /workspace/ComfyUI${NC}"
  echo -e "${BLUE}python main.py --listen 0.0.0.0 --port 8188${NC}"
  echo
  echo -e "Or to run in a new tmux session:"
  echo -e "${BLUE}tmux new-session -s comfyui${NC}"
  echo -e "Then run the commands above in the tmux session"
}
