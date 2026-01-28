# 🚀 Hostinger VPS Deployment Guide

## 📋 **Pre-Deployment Checklist**

### **What You Need to Prepare:**

#### 1. **Hostinger VPS Account**
- [ ] VPS hosting plan purchased
- [ ] SSH access credentials (IP address, root password)
- [ ] Domain name (optional but recommended)

#### 2. **MongoDB Database**
Choose one option:
- **Option A**: MongoDB Atlas (Cloud - Recommended for beginners)
  - [ ] Create free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
  - [ ] Create cluster and get connection string
- **Option B**: Install MongoDB on VPS
  - [ ] Will install during deployment

#### 3. **Environment Variables**
Prepare these values:
```env
# Server (.env in server directory)
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
FRONTEND_URL=https://yourdomain.com

# Client (.env in client directory)
VITE_API_URL=https://yourdomain.com/api
```

#### 4. **Project Files**
- [ ] Your entire `invoice-management-system` folder
- [ ] All dependencies listed in `package.json`

---

## 🖥️ **VPS Requirements**

### **Minimum Specifications:**
- **RAM**: 2GB (4GB recommended)
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04 or 22.04 LTS
- **Node.js**: v18+ or v20+
- **MongoDB**: v6.0+ (if self-hosting)

---

## 📦 **Step 1: Initial VPS Setup**

### **1.1 Connect to VPS via SSH**
```bash
# Replace with your VPS IP
ssh root@your_vps_ip

# When prompted, enter your password
```

### **1.2 Update System**
```bash
apt update && apt upgrade -y
```

### **1.3 Create Non-Root User (Security Best Practice)**
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### **1.4 Setup Firewall**
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔧 **Step 2: Install Required Software**

### **2.1 Install Node.js (v20 LTS)**
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### **2.2 Install MongoDB (Option B - Local Installation)**
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### **2.3 Install Nginx (Web Server)**
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **2.4 Install PM2 (Process Manager)**
```bash
sudo npm install -g pm2
```

### **2.5 Install Git**
```bash
sudo apt install git -y
```

---

## 📂 **Step 3: Upload Your Project**

### **Method A: Using Git (Recommended)**
```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/yourusername/invoice-management-system.git

# Or if you don't have a repo yet, use Method B
```

### **Method B: Using SCP/SFTP**
**From your local machine:**
```bash
# Compress your project
cd "C:\Users\pc\Desktop\invoice Mgms"
tar -czf invoice-mgms.tar.gz invoice-management-system/

# Upload to VPS (use Git Bash or WSL on Windows)
scp invoice-mgms.tar.gz deploy@your_vps_ip:~/

# On VPS, extract
cd ~
tar -xzf invoice-mgms.tar.gz
```

### **Method C: Using FileZilla (GUI)**
1. Download FileZilla from https://filezilla-project.org/
2. Connect using SFTP:
   - Host: `sftp://your_vps_ip`
   - Username: `deploy`
   - Password: your password
   - Port: 22
3. Drag and drop the `invoice-management-system` folder

---

## ⚙️ **Step 4: Configure Environment Variables**

### **4.1 Server Environment**
```bash
cd ~/invoice-management-system/server
nano .env
```

**Add the following:**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/invoice_management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice_management

JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
FRONTEND_URL=https://yourdomain.com
```

**Save and exit** (Ctrl+X, Y, Enter)

### **4.2 Client Environment**
```bash
cd ~/invoice-management-system/client
nano .env
```

**Add the following:**
```env
VITE_API_URL=https://yourdomain.com/api
```

**Save and exit** (Ctrl+X, Y, Enter)

---

## 🏗️ **Step 5: Build and Install**

### **5.1 Install Server Dependencies**
```bash
cd ~/invoice-management-system/server
npm install --production
```

### **5.2 Build Client for Production**
```bash
cd ~/invoice-management-system/client
npm install
npm run build
```

This creates an optimized production build in `client/dist/`

---

## 🚀 **Step 6: Start Backend with PM2**

```bash
cd ~/invoice-management-system/server

# Start the server with PM2
pm2 start server.js --name "invoice-api"

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs invoice-api
```

---

## 🌐 **Step 7: Configure Nginx**

### **7.1 Create Nginx Configuration**
```bash
sudo nano /etc/nginx/sites-available/invoice-mgms
```

**Add the following configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React Frontend
    root /home/deploy/invoice-management-system/client/dist;
    index index.html;

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optimize static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Save and exit** (Ctrl+X, Y, Enter)

### **7.2 Enable the Site**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/invoice-mgms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 **Step 8: Setup SSL Certificate (HTTPS)**

### **Using Let's Encrypt (Free SSL)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## ✅ **Step 9: Verification**

### **9.1 Check All Services**
```bash
# Check Nginx
sudo systemctl status nginx

# Check MongoDB (if local)
sudo systemctl status mongod

# Check Node.js API
pm2 status
pm2 logs invoice-api --lines 50

# Check if ports are listening
sudo netstat -tulpn | grep LISTEN
```

### **9.2 Test Your Application**
1. Open browser: `https://yourdomain.com`
2. Try logging in
3. Test creating an invoice
4. Check reports

---

## 🔧 **Common Commands**

### **PM2 Management**
```bash
pm2 status              # View all processes
pm2 logs invoice-api    # View logs
pm2 restart invoice-api # Restart app
pm2 stop invoice-api    # Stop app
pm2 delete invoice-api  # Remove from PM2
```

### **Nginx Management**
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test config
sudo tail -f /var/log/nginx/error.log  # View error logs
```

### **MongoDB Management**
```bash
sudo systemctl status mongod  # Check status
sudo systemctl restart mongod # Restart
mongo                         # Connect to MongoDB shell
```

---

## 🔄 **Updating Your Application**

### **After Making Code Changes:**
```bash
# 1. Navigate to project
cd ~/invoice-management-system

# 2. Pull latest changes (if using Git)
git pull origin main

# 3. Update server
cd server
npm install --production
pm2 restart invoice-api

# 4. Rebuild client
cd ../client
npm install
npm run build

# 5. Restart Nginx (optional)
sudo systemctl restart nginx
```

---

## 🐛 **Troubleshooting**

### **Problem: Can't connect to API**
```bash
# Check if backend is running
pm2 status
pm2 logs invoice-api

# Check if port 5000 is open
sudo netstat -tulpn | grep 5000

# Check firewall
sudo ufw status
```

### **Problem: MongoDB connection error**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Try connecting manually
mongosh
```

### **Problem: Nginx 502 Bad Gateway**
```bash
# Check if backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both services
pm2 restart invoice-api
sudo systemctl restart nginx
```

### **Problem: White screen / React not loading**
```bash
# Check if build exists
ls -la ~/invoice-management-system/client/dist

# Rebuild client
cd ~/invoice-management-system/client
npm run build

# Check Nginx config
sudo nginx -t

# Check browser console for API URL errors
```

---

## 📊 **Monitoring & Maintenance**

### **Set up PM2 Monitoring**
```bash
# View real-time monitoring
pm2 monit

# Enable PM2 web dashboard (optional)
pm2 install pm2-server-monit
```

### **Regular Maintenance Tasks**
```bash
# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Check memory usage
free -m

# View PM2 logs
pm2 logs --lines 100

# Clear old logs
pm2 flush
```

---

## 🔐 **Security Hardening (Recommended)**

### **1. Configure Firewall**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### **2. Disable Root SSH Login**
```bash
sudo nano /etc/ssh/sshd_config

# Change these lines:
PermitRootLogin no
PasswordAuthentication no  # Only if you setup SSH keys

# Restart SSH
sudo systemctl restart sshd
```

### **3. Setup Fail2Ban**
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📱 **Quick Reference Card**

| **Task** | **Command** |
|----------|-------------|
| View app status | `pm2 status` |
| View logs | `pm2 logs invoice-api` |
| Restart app | `pm2 restart invoice-api` |
| Check Nginx | `sudo nginx -t` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check MongoDB | `sudo systemctl status mongod` |
| View disk space | `df -h` |
| View memory | `free -m` |

---

## 📞 **Need Help?**

- **PM2 Docs**: https://pm2.keymetrics.io/docs/
- **Nginx Docs**: https://nginx.org/en/docs/
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **Hostinger Support**: Check your hosting panel

---

## ✅ **Deployment Checklist**

- [ ] VPS setup complete
- [ ] Node.js installed
- [ ] MongoDB installed/connected
- [ ] Project uploaded
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Client built for production
- [ ] PM2 running backend
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Domain pointing to VPS
- [ ] Firewall configured
- [ ] Application tested and working

---

**🎉 Congratulations! Your Invoice Management System is now live on Hostinger VPS!**

---

*Last Updated: January 2026*

