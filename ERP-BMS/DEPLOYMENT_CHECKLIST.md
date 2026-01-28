# ✅ Quick Deployment Checklist

## 📦 **What to Prepare BEFORE Deployment**

### **1. Credentials & Access**
```
[ ] Hostinger VPS IP Address: ___________________
[ ] SSH Username: ___________________
[ ] SSH Password: ___________________
[ ] Domain Name (optional): ___________________
```

### **2. MongoDB Choice**
**Pick ONE:**
```
[ ] Option A: MongoDB Atlas (Cloud)
    Connection String: ___________________________________

[ ] Option B: Install MongoDB on VPS (will do during setup)
```

### **3. Generate JWT Secret**
```bash
# Run this on your local machine to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_SECRET: ___________________________________
```

### **4. Environment Variables to Configure**

**Server `.env`:**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_generated_jwt_secret_here
FRONTEND_URL=https://yourdomain.com
```

**Client `.env`:**
```env
VITE_API_URL=https://yourdomain.com/api
```

---

## 🚀 **Quick Deployment Steps**

### **Step 1: Connect to VPS**
```bash
ssh root@your_vps_ip
```

### **Step 2: Initial Setup**
```bash
# Update system
apt update && apt upgrade -y

# Create user
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### **Step 3: Install Software**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt install nginx -y

# PM2
sudo npm install -g pm2

# Git
sudo apt install git -y
```

### **Step 4: Upload Project**
```bash
# Using SCP from your machine:
scp -r "C:\Users\pc\Desktop\invoice Mgms\invoice-management-system" deploy@your_vps_ip:~/
```

### **Step 5: Configure Environment**
```bash
cd ~/invoice-management-system/server
nano .env  # Add your server environment variables

cd ~/invoice-management-system/client
nano .env  # Add your client environment variables
```

### **Step 6: Build & Install**
```bash
# Server
cd ~/invoice-management-system/server
npm install --production

# Client
cd ~/invoice-management-system/client
npm install
npm run build
```

### **Step 7: Start Backend**
```bash
cd ~/invoice-management-system/server
pm2 start server.js --name "invoice-api"
pm2 save
pm2 startup  # Run the command it outputs
```

### **Step 8: Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/invoice-mgms
# Copy the Nginx config from DEPLOYMENT_GUIDE.md

sudo ln -s /etc/nginx/sites-available/invoice-mgms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### **Step 9: Setup SSL**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Step 10: Setup Firewall**
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🧪 **Testing Your Deployment**

```bash
# Check backend is running
pm2 status
pm2 logs invoice-api

# Check Nginx
sudo systemctl status nginx

# Check MongoDB (if local)
sudo systemctl status mongod

# Test in browser
# Visit: https://yourdomain.com
```

---

## 🔄 **How to Update After Deployment**

```bash
# 1. Connect to VPS
ssh deploy@your_vps_ip

# 2. Navigate to project
cd ~/invoice-management-system

# 3. Pull changes (if using Git)
git pull origin main

# 4. Update server
cd server
npm install --production
pm2 restart invoice-api

# 5. Rebuild client
cd ../client
npm install
npm run build

# Done! No need to restart Nginx
```

---

## 🆘 **Emergency Commands**

```bash
# Restart everything
pm2 restart invoice-api
sudo systemctl restart nginx
sudo systemctl restart mongod  # If using local MongoDB

# View logs
pm2 logs invoice-api --lines 100
sudo tail -f /var/log/nginx/error.log

# Check what's running
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod
```

---

## 📊 **Daily Monitoring Commands**

```bash
# Check app status
pm2 status

# View live logs
pm2 logs invoice-api --lines 50

# Check server resources
df -h        # Disk space
free -m      # Memory usage
top          # CPU usage

# Check if everything is running
sudo systemctl status nginx
sudo systemctl status mongod  # If using local MongoDB
```

---

## 🎯 **Final Checklist**

```
Server Setup:
[ ] SSH access working
[ ] Node.js v20+ installed
[ ] Nginx installed
[ ] PM2 installed
[ ] MongoDB setup complete

Project Setup:
[ ] Project uploaded to VPS
[ ] Server .env configured
[ ] Client .env configured
[ ] Server dependencies installed
[ ] Client built successfully

Services Running:
[ ] PM2 running backend (pm2 status shows "online")
[ ] Nginx running (sudo systemctl status nginx)
[ ] MongoDB running (if local)
[ ] PM2 set to start on boot (pm2 startup done)

Security:
[ ] Firewall enabled (sudo ufw status)
[ ] SSL certificate installed
[ ] HTTPS working

Testing:
[ ] Website loads at https://yourdomain.com
[ ] Can login successfully
[ ] Can create invoice/customer
[ ] Dashboard shows data
[ ] Reports work
```

---

## 📞 **Support Resources**

- **Full Guide**: See `DEPLOYMENT_GUIDE.md` in project root
- **Hostinger Docs**: https://support.hostinger.com
- **PM2 Docs**: https://pm2.keymetrics.io
- **Nginx Docs**: https://nginx.org/en/docs

---

**Last Updated**: January 2026

