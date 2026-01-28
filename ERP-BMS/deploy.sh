#!/bin/bash

# 🚀 Invoice Management System - Deployment Script
# This script helps automate the deployment process on Hostinger VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║    Invoice Management System - Deployment Helper         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please do not run this script as root"
    print_info "Run as your regular user (e.g., 'deploy' user)"
    exit 1
fi

# Detect the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"

print_info "Project directory: $PROJECT_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed"
    print_info "Install it with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
print_success "Node.js $(node --version) found"

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version) found"

if ! command_exists pm2; then
    print_warning "PM2 is not installed"
    print_info "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 $(pm2 --version) found"
fi

if ! command_exists nginx; then
    print_warning "Nginx is not installed"
    print_info "Install it with: sudo apt install nginx -y"
    exit 1
fi
print_success "Nginx found"

# Check if .env files exist
print_info "Checking environment files..."

if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    print_warning "Server .env file not found"
    print_info "Creating template .env file..."
    cat > "$PROJECT_DIR/server/.env" << EOF
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/invoice_management
JWT_SECRET=change_this_to_a_secure_random_string_at_least_32_characters
FRONTEND_URL=https://yourdomain.com
EOF
    print_warning "Please edit server/.env with your actual values"
    print_info "Run: nano $PROJECT_DIR/server/.env"
    exit 1
else
    print_success "Server .env file found"
fi

if [ ! -f "$PROJECT_DIR/client/.env" ]; then
    print_warning "Client .env file not found"
    print_info "Creating template .env file..."
    cat > "$PROJECT_DIR/client/.env" << EOF
VITE_API_URL=https://yourdomain.com/api
EOF
    print_warning "Please edit client/.env with your actual values"
    print_info "Run: nano $PROJECT_DIR/client/.env"
    exit 1
else
    print_success "Client .env file found"
fi

# Ask user what to do
echo ""
print_info "What would you like to do?"
echo "1) Initial deployment (install dependencies, build, start)"
echo "2) Update deployment (pull changes, rebuild, restart)"
echo "3) Rebuild client only"
echo "4) Restart backend only"
echo "5) View logs"
echo "6) Check status"
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_info "Starting initial deployment..."
        
        # Install server dependencies
        print_info "Installing server dependencies..."
        cd "$PROJECT_DIR/server"
        npm install --production
        print_success "Server dependencies installed"
        
        # Install client dependencies and build
        print_info "Installing client dependencies..."
        cd "$PROJECT_DIR/client"
        npm install
        print_success "Client dependencies installed"
        
        print_info "Building client for production..."
        npm run build
        print_success "Client built successfully"
        
        # Start backend with PM2
        print_info "Starting backend with PM2..."
        cd "$PROJECT_DIR/server"
        pm2 delete invoice-api 2>/dev/null || true  # Delete if exists
        pm2 start server.js --name "invoice-api" --log-date-format "YYYY-MM-DD HH:mm:ss Z"
        pm2 save
        print_success "Backend started"
        
        print_info "Setting up PM2 to start on boot..."
        pm2 startup | grep "sudo" | bash || true
        
        print_success "Initial deployment complete!"
        print_info "Next steps:"
        print_info "1. Configure Nginx (see DEPLOYMENT_GUIDE.md)"
        print_info "2. Setup SSL certificate (see DEPLOYMENT_GUIDE.md)"
        ;;
        
    2)
        print_info "Starting update deployment..."
        
        # Check if git repo
        if [ -d "$PROJECT_DIR/.git" ]; then
            print_info "Pulling latest changes..."
            cd "$PROJECT_DIR"
            git pull origin main || git pull origin master
            print_success "Changes pulled"
        else
            print_warning "Not a git repository, skipping pull"
        fi
        
        # Update server
        print_info "Updating server dependencies..."
        cd "$PROJECT_DIR/server"
        npm install --production
        print_success "Server updated"
        
        # Rebuild client
        print_info "Rebuilding client..."
        cd "$PROJECT_DIR/client"
        npm install
        npm run build
        print_success "Client rebuilt"
        
        # Restart backend
        print_info "Restarting backend..."
        pm2 restart invoice-api
        print_success "Backend restarted"
        
        print_success "Update deployment complete!"
        ;;
        
    3)
        print_info "Rebuilding client..."
        cd "$PROJECT_DIR/client"
        npm install
        npm run build
        print_success "Client rebuilt successfully"
        print_info "Refresh your browser to see changes"
        ;;
        
    4)
        print_info "Restarting backend..."
        pm2 restart invoice-api
        print_success "Backend restarted"
        ;;
        
    5)
        print_info "Showing logs (Ctrl+C to exit)..."
        pm2 logs invoice-api --lines 50
        ;;
        
    6)
        print_info "System Status:"
        echo ""
        
        # PM2 Status
        print_info "PM2 Status:"
        pm2 status
        echo ""
        
        # Nginx Status
        print_info "Nginx Status:"
        sudo systemctl status nginx --no-pager || true
        echo ""
        
        # MongoDB Status (if installed locally)
        if command_exists mongod; then
            print_info "MongoDB Status:"
            sudo systemctl status mongod --no-pager || true
            echo ""
        fi
        
        # Disk Space
        print_info "Disk Space:"
        df -h | grep -E '(Filesystem|/$)'
        echo ""
        
        # Memory Usage
        print_info "Memory Usage:"
        free -m
        echo ""
        
        # Port Check
        print_info "Open Ports:"
        sudo netstat -tulpn | grep LISTEN | grep -E '(5000|80|443)'
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_info "Useful commands:"
print_info "  pm2 status              - View app status"
print_info "  pm2 logs invoice-api    - View logs"
print_info "  pm2 restart invoice-api - Restart app"
print_info "  pm2 monit               - Monitor resources"
echo ""

print_success "Done! 🎉"

