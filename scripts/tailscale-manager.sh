#!/bin/bash

# Tailscale Manager Script
# Easy enable/disable Tailscale with connection info

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${BLUE}Tailscale Manager${NC}"
    echo "Usage: $0 [start|stop|status|info|verify]"
    echo ""
    echo "Commands:"
    echo "  start   - Start Tailscale and show connection info"
    echo "  stop    - Stop Tailscale service"
    echo "  status  - Show current Tailscale status"
    echo "  info    - Show connection information (when running)"
    echo "  verify  - Verify Tailscale is completely stopped"
    echo ""
}

start_tailscale() {
    echo -e "${YELLOW}Starting Tailscale...${NC}"
    
    # Start the service
    sudo systemctl start tailscaled
    
    # Wait a moment for service to start
    sleep 2
    
    # Bring up Tailscale
    sudo tailscale up
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Tailscale started successfully!${NC}"
        echo ""
        show_connection_info
    else
        echo -e "${RED}✗ Failed to start Tailscale${NC}"
        exit 1
    fi
}

stop_tailscale() {
    echo -e "${YELLOW}Stopping Tailscale...${NC}"
    
    # Bring down Tailscale
    sudo tailscale down
    
    # Stop the service
    sudo systemctl stop tailscaled
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Tailscale stopped successfully!${NC}"
        echo ""
        # Auto-verify the stop
        verify_stopped
    else
        echo -e "${RED}✗ Failed to stop Tailscale${NC}"
        exit 1
    fi
}

show_status() {
    echo -e "${BLUE}Tailscale Status:${NC}"
    tailscale status 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Tailscale is not running${NC}"
        return 1
    fi
    
    return 0
}

show_connection_info() {
    echo -e "${BLUE}=== Connection Information ===${NC}"
    
    # Get Tailscale IP
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)
    
    if [ -z "$TAILSCALE_IP" ]; then
        echo -e "${RED}Tailscale is not running or not connected${NC}"
        return 1
    fi
    
    # Get hostname
    HOSTNAME=$(hostname)
    
    # Get username
    USERNAME=$(whoami)
    
    echo -e "${GREEN}Device Name:${NC} $HOSTNAME"
    echo -e "${GREEN}Tailscale IP:${NC} $TAILSCALE_IP"
    echo -e "${GREEN}SSH Username:${NC} $USERNAME"
    echo ""
    echo -e "${BLUE}SSH Connection Commands:${NC}"
    echo -e "  ${YELLOW}ssh $USERNAME@$TAILSCALE_IP${NC}"
    echo ""
    echo -e "${BLUE}For Termius:${NC}"
    echo -e "  Host: ${YELLOW}$TAILSCALE_IP${NC}"
    echo -e "  Username: ${YELLOW}$USERNAME${NC}"
    echo -e "  Port: ${YELLOW}22${NC}"
    echo ""
    echo -e "${GREEN}✓ Ready for remote access!${NC}"
}

verify_stopped() {
    echo -e "${BLUE}=== Tailscale Complete Stop Verification ===${NC}"
    
    # Check service status
    echo -e "${YELLOW}Service status:${NC}"
    SERVICE_STATUS=$(sudo systemctl is-active tailscaled 2>/dev/null)
    if [ "$SERVICE_STATUS" = "inactive" ] || [ "$SERVICE_STATUS" = "failed" ] || [ -z "$SERVICE_STATUS" ]; then
        echo -e "${GREEN}✓ Service: ${SERVICE_STATUS:-inactive}${NC}"
        SERVICE_STOPPED=true
    else
        echo -e "${RED}✗ Service: $SERVICE_STATUS${NC}"
        SERVICE_STOPPED=false
    fi
    
    # Check and ensure boot startup is disabled
    echo -e "\n${YELLOW}Boot startup status:${NC}"
    BOOT_STATUS=$(systemctl is-enabled tailscaled 2>/dev/null)
    if [ "$BOOT_STATUS" = "disabled" ]; then
        echo -e "${GREEN}✓ Boot startup: disabled${NC}"
        BOOT_DISABLED=true
    else
        echo -e "${YELLOW}⚠ Boot startup: $BOOT_STATUS - disabling...${NC}"
        sudo systemctl disable tailscaled >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Boot startup: now disabled${NC}"
            BOOT_DISABLED=true
        else
            echo -e "${RED}✗ Failed to disable boot startup${NC}"
            BOOT_DISABLED=false
        fi
    fi
    
    # Check for Tailscale network interfaces
    echo -e "\n${YELLOW}Network interfaces:${NC}"
    INTERFACES=$(ip addr show | grep tailscale || echo "")
    if [ -z "$INTERFACES" ]; then
        echo -e "${GREEN}✓ No Tailscale interfaces found${NC}"
    else
        echo -e "${RED}✗ Tailscale interfaces still active:${NC}"
        echo "$INTERFACES"
    fi
    
    # Check for Tailscale routes
    echo -e "\n${YELLOW}Network routes:${NC}"
    ROUTES=$(ip route show | grep "100\." || echo "")
    if [ -z "$ROUTES" ]; then
        echo -e "${GREEN}✓ No Tailscale routes found${NC}"
    else
        echo -e "${RED}✗ Tailscale routes still active:${NC}"
        echo "$ROUTES"
    fi
    
    # Check for running processes (exclude browser tabs and this script)
    echo -e "\n${YELLOW}Running processes:${NC}"
    PROCESSES=$(ps aux | grep -v grep | grep tailscale | grep -v firefox | grep -v "tailscale-manager.sh" | grep -E "(tailscaled|tailscale)" || echo "")
    if [ -z "$PROCESSES" ]; then
        echo -e "${GREEN}✓ No Tailscale processes found${NC}"
    else
        echo -e "${RED}✗ Tailscale processes still running:${NC}"
        echo "$PROCESSES"
    fi
    
    # Check for listening ports
    echo -e "\n${YELLOW}Network connections:${NC}"
    PORTS=$(ss -tuln | grep -E "(41641|3478)" || echo "")
    if [ -z "$PORTS" ]; then
        echo -e "${GREEN}✓ No Tailscale ports in use${NC}"
    else
        echo -e "${RED}✗ Tailscale ports still listening:${NC}"
        echo "$PORTS"
    fi
    
    # Summary
    echo -e "\n${BLUE}=== Summary ===${NC}"
    if [ "$SERVICE_STOPPED" = "true" ] && [ "$BOOT_DISABLED" = "true" ] && [ -z "$INTERFACES" ] && [ -z "$ROUTES" ] && [ -z "$PROCESSES" ] && [ -z "$PORTS" ]; then
        echo -e "${GREEN}✓ Tailscale is completely stopped and secured - no data tunneling${NC}"
        return 0
    else
        echo -e "${RED}✗ Tailscale may still be active or not properly secured - check items above${NC}"
        return 1
    fi
}

# Main script logic
case "${1:-}" in
    "start")
        start_tailscale
        ;;
    "stop")
        stop_tailscale
        ;;
    "status")
        show_status
        ;;
    "info")
        show_connection_info
        ;;
    "verify")
        verify_stopped
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        # No argument provided, show status and info if running
        if show_status >/dev/null 2>&1; then
            show_status
            echo ""
            show_connection_info
        else
            echo -e "${YELLOW}Tailscale is not running.${NC}"
            echo "Use '$0 start' to start it."
        fi
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac