#!/bin/bash

# Enable SSH Server Script

echo "Enabling SSH server..."

# Start SSH service
sudo systemctl start ssh

# Enable SSH service to start on boot
sudo systemctl enable ssh

# Check status
if sudo systemctl is-active --quiet ssh; then
    echo "✓ SSH server is now running"
    echo "✓ SSH server will start automatically on boot"
    sudo systemctl status ssh --no-pager
else
    echo "✗ Failed to start SSH server"
    exit 1
fi