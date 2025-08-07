#!/bin/bash

# Disable SSH Server Script

echo "Disabling SSH server..."

# Stop SSH service
sudo systemctl stop ssh

# Disable SSH service from starting on boot
sudo systemctl disable ssh

# Check status
if ! sudo systemctl is-active --quiet ssh; then
    echo "✓ SSH server is now stopped"
    echo "✓ SSH server will NOT start automatically on boot"
else
    echo "✗ SSH server is still running"
    exit 1
fi