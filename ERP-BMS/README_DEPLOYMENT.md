# 🚀 Deployment Documentation

This folder contains all the resources you need to deploy your Invoice Management System to Hostinger VPS.

---

## 📚 **Documentation Files**

### 1. **DEPLOYMENT_GUIDE.md** (Main Guide) 📖
**Complete step-by-step deployment guide covering:**
- VPS setup and security
- Software installation (Node.js, MongoDB, Nginx, PM2)
- Project configuration
- Environment variables
- SSL certificate setup
- Monitoring and maintenance
- Troubleshooting

**👉 START HERE if this is your first deployment**

---

### 2. **DEPLOYMENT_CHECKLIST.md** (Quick Reference) ✅
**Quick checklist format with:**
- Pre-deployment preparation list
- Condensed deployment steps
- Emergency commands
- Update procedures
- Testing checklist

**👉 Use this for quick reference or second deployment**

---

### 3. **deploy.sh** (Automation Script) 🤖
**Interactive bash script that automates:**
- Initial deployment
- Updates and rebuilds
- Backend restarts
- Status checks
- Log viewing

**👉 Use this after initial VPS setup to automate builds**

---

## 🎯 **Quick Start**

### **For First-Time Deployment:**

1. **Read the full guide:**
   ```bash
   Open: DEPLOYMENT_GUIDE.md
   ```

2. **Prepare your credentials:**
   - VPS IP address
   - MongoDB connection string
   - JWT secret key

3. **Follow the guide step by step**

4. **After VPS is set up, use the automation script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

---

### **For Subsequent Deployments/Updates:**

1. **SSH into your VPS:**
   ```bash
   ssh deploy@your_vps_ip
   ```

2. **Navigate to project:**
   ```bash
   cd ~/invoice-management-system
   ```

3. **Run deployment script:**
   ```bash
   ./deploy.sh
   # Choose option 2 for updates
   ```

---

## 📦 **What You Need to Send/Upload**

### **Option A: Using Git (Recommended)**
```bash
# On VPS:
git clone https://github.com/yourusername/invoice-management-system.git
```

### **Option B: Direct Upload (SCP)**
```bash
# From your local machine (Windows - use Git Bash or WSL):
cd "C:\Users\pc\Desktop\invoice Mgms"
scp -r invoice-management-system deploy@your_vps_ip:~/
```

### **Option C: Using FileZilla (GUI)**
1. Download FileZilla
2. Connect via SFTP (port 22)
3. Upload the entire `invoice-management-system` folder

---

## 🔑 **Environment Variables You Must Configure**

### **Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/invoice_management
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
FRONTEND_URL=https://yourdomain.com
```

### **Client (`client/.env`):**
```env
VITE_API_URL=https://yourdomain.com/api
```

**⚠️ IMPORTANT:** Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🖥️ **Minimum VPS Requirements**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2GB | 4GB |
| Storage | 20GB SSD | 40GB SSD |
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |
| Node.js | v18+ | v20+ |
| MongoDB | v6.0+ | v7.0+ |

---

## 🛠️ **Software to Install on VPS**

```bash
# Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt install nginx -y

# PM2
sudo npm install -g pm2

# MongoDB (optional - or use MongoDB Atlas)
# See DEPLOYMENT_GUIDE.md for MongoDB installation

# Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

---

## 🚦 **Deployment Flow**

```
┌─────────────────────────────────────────────────────────┐
│  1. Setup VPS                                           │
│     - Update system                                     │
│     - Create deploy user                                │
│     - Install Node.js, Nginx, PM2                       │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  2. Upload Project                                      │
│     - Git clone / SCP / FileZilla                       │
│     - Configure .env files                              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  3. Build & Install                                     │
│     - npm install (server)                              │
│     - npm install && npm run build (client)             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  4. Start Services                                      │
│     - PM2 start backend                                 │
│     - Configure Nginx for frontend                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  5. Setup SSL & Security                                │
│     - Install SSL certificate (Let's Encrypt)           │
│     - Configure firewall                                │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  6. Test & Verify                                       │
│     - Visit https://yourdomain.com                      │
│     - Test login, invoices, reports                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 **Common Issues & Quick Fixes**

### **Issue: Can't SSH into VPS**
```bash
# Check if you're using correct IP and credentials
ssh -v root@your_vps_ip

# Try with root user first, then create deploy user
```

### **Issue: npm install fails**
```bash
# Clear npm cache
npm cache clean --force

# Update npm
sudo npm install -g npm@latest
```

### **Issue: Port 80/443 already in use**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80

# Stop Apache if it's running
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### **Issue: MongoDB connection refused**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### **Issue: PM2 app crashes**
```bash
# View logs to see error
pm2 logs invoice-api

# Common fixes:
# 1. Check .env file exists
# 2. Check MongoDB is running
# 3. Check port 5000 is not in use
```

---

## 📊 **Post-Deployment Monitoring**

### **Daily Checks:**
```bash
pm2 status              # Check app is running
pm2 logs --lines 50     # Check for errors
df -h                   # Check disk space
free -m                 # Check memory
```

### **Weekly Checks:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
sudo certbot certificates

# Restart services for fresh start
pm2 restart invoice-api
sudo systemctl restart nginx
```

---

## 🔄 **How to Update Your App**

### **Quick Update (Using deploy.sh):**
```bash
cd ~/invoice-management-system
./deploy.sh
# Choose option 2
```

### **Manual Update:**
```bash
cd ~/invoice-management-system

# Pull changes (if using Git)
git pull origin main

# Update server
cd server
npm install --production
pm2 restart invoice-api

# Rebuild client
cd ../client
npm install
npm run build
```

---

## 🔐 **Security Checklist**

- [ ] Firewall enabled (ufw)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Root SSH login disabled
- [ ] Strong passwords used
- [ ] JWT_SECRET is random and secure (32+ characters)
- [ ] SSL certificate installed
- [ ] MongoDB authentication enabled (if local)
- [ ] Regular system updates scheduled

---

## 📞 **Getting Help**

### **Documentation:**
- Full deployment guide: `DEPLOYMENT_GUIDE.md`
- Quick reference: `DEPLOYMENT_CHECKLIST.md`

### **Useful Links:**
- **Hostinger Support**: https://support.hostinger.com
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **MongoDB Documentation**: https://www.mongodb.com/docs/

### **Logs to Check:**
```bash
# Application logs
pm2 logs invoice-api

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs (if local)
sudo tail -f /var/log/mongodb/mongod.log

# System logs
sudo journalctl -xe
```

---

## ✅ **Success Criteria**

Your deployment is successful when:

- ✅ You can access your app at `https://yourdomain.com`
- ✅ SSL certificate shows green padlock
- ✅ You can log in to the dashboard
- ✅ You can create/view invoices and customers
- ✅ Reports show data correctly
- ✅ `pm2 status` shows app is "online"
- ✅ No errors in `pm2 logs`

---

## 🎉 **You're Ready!**

Follow the guides in order:
1. `DEPLOYMENT_GUIDE.md` - Complete guide
2. `DEPLOYMENT_CHECKLIST.md` - Quick reference
3. `deploy.sh` - Automation script

**Good luck with your deployment!** 🚀

---

*Last Updated: January 2026*

