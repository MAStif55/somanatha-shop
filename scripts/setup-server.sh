#!/bin/bash
set -e

echo "============================================"
echo "  Somanatha Shop — Server Setup Script"
echo "============================================"

# ──────────────────────────────────────────────
# STEP 1: Create Swap File (4GB)
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 1: Creating 4GB swap file..."
if [ -f /swapfile ]; then
    echo "Swap file already exists, skipping."
else
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    # Optimize swappiness for a web server (use swap only when really needed)
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    echo "✅ 4GB swap created and activated."
fi
echo "Current memory status:"
free -h

# ──────────────────────────────────────────────
# STEP 2: Install Node.js 20 LTS
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 2: Installing Node.js 20 LTS..."
if command -v node &> /dev/null; then
    echo "Node.js already installed: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node -v), npm: $(npm -v)"
fi

# ──────────────────────────────────────────────
# STEP 3: Install Nginx
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 3: Installing Nginx..."
if command -v nginx &> /dev/null; then
    echo "Nginx already installed."
else
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo "✅ Nginx installed and started."
fi

# ──────────────────────────────────────────────
# STEP 4: Install PM2
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 4: Installing PM2..."
if command -v pm2 &> /dev/null; then
    echo "PM2 already installed."
else
    sudo npm install -g pm2
    pm2 startup systemd -u $USER --hp $HOME | tail -1 | sudo bash
    echo "✅ PM2 installed and configured for auto-start."
fi

# ──────────────────────────────────────────────
# STEP 5: Install MongoDB 7.0
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 5: Installing MongoDB 7.0..."
if command -v mongosh &> /dev/null; then
    echo "MongoDB already installed."
else
    # Import MongoDB public GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    # Add MongoDB repository
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    # Start and enable MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
    echo "✅ MongoDB 7.0 installed and started."
fi

# ──────────────────────────────────────────────
# STEP 6: Secure MongoDB (create admin + app user)
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 6: Securing MongoDB..."
# Create admin user and application database/user
mongosh --quiet --eval '
    // Switch to admin DB and create root admin
    db = db.getSiblingDB("admin");
    if (db.getUsers().users.length === 0) {
        db.createUser({
            user: "rootAdmin",
            pwd: "SomanathaSuperSafe2026",
            roles: [{ role: "root", db: "admin" }]
        });
        print("✅ Admin user created.");
    } else {
        print("Admin user already exists, skipping.");
    }

    // Switch to app DB and create app user
    db = db.getSiblingDB("somanatha_data");
    try {
        db.createUser({
            user: "somanatha_app",
            pwd: "SomanathaAppPass2026",
            roles: [{ role: "readWrite", db: "somanatha_data" }]
        });
        print("✅ Application user created for somanatha_data.");
    } catch(e) {
        print("App user may already exist: " + e.message);
    }
'

# Enable MongoDB authentication
if ! grep -q "authorization: enabled" /etc/mongod.conf; then
    sudo sed -i 's/#security:/security:\n  authorization: enabled/' /etc/mongod.conf
    sudo systemctl restart mongod
    echo "✅ MongoDB authentication enabled and service restarted."
else
    echo "MongoDB auth already enabled."
fi

# ──────────────────────────────────────────────
# STEP 7: Set up Bare Git Repository + Auto-Deploy Hook
# ──────────────────────────────────────────────
echo ""
echo ">>> STEP 7: Setting up Bare Git repo and auto-deploy hook..."

# Create directories
sudo mkdir -p /var/repo
sudo mkdir -p /var/www/somanatha-shop
sudo chown -R $USER:$USER /var/repo
sudo chown -R $USER:$USER /var/www/somanatha-shop

# Initialize bare Git repository
if [ -d /var/repo/somanatha-shop.git ]; then
    echo "Bare Git repo already exists."
else
    git init --bare /var/repo/somanatha-shop.git
    echo "✅ Bare Git repo initialized at /var/repo/somanatha-shop.git"
fi

# Create the post-receive hook (the "magic" auto-deploy script)
cat > /var/repo/somanatha-shop.git/hooks/post-receive << 'HOOK'
#!/bin/bash
set -e

TARGET="/var/www/somanatha-shop"
GIT_DIR="/var/repo/somanatha-shop.git"
BRANCH="main"

echo ""
echo "============================================"
echo "  🚀 Auto-Deploy: Received push to $BRANCH"
echo "============================================"

while read oldrev newrev ref; do
    if [[ "$ref" == "refs/heads/$BRANCH" ]]; then
        echo ">>> Checking out latest code..."
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH

        echo ">>> Installing dependencies..."
        cd $TARGET
        npm ci --production=false

        echo ">>> Building Next.js application..."
        npm run build

        echo ">>> Restarting application via PM2..."
        pm2 reload somanatha-shop --update-env || pm2 start npm --name somanatha-shop -- start

        echo ""
        echo "✅ Deploy complete! Site is live."
        echo "============================================"
    fi
done
HOOK

chmod +x /var/repo/somanatha-shop.git/hooks/post-receive
echo "✅ post-receive hook created."

# ──────────────────────────────────────────────
# FINAL: Summary
# ──────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ SERVER SETUP COMPLETE"
echo "============================================"
echo ""
echo "Services Status:"
echo "  Node.js:  $(node -v 2>/dev/null || echo 'NOT INSTALLED')"
echo "  npm:      $(npm -v 2>/dev/null || echo 'NOT INSTALLED')"
echo "  PM2:      $(pm2 -v 2>/dev/null || echo 'NOT INSTALLED')"
echo "  Nginx:    $(nginx -v 2>&1 | head -1)"
echo "  MongoDB:  $(mongosh --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""
echo "Directories:"
echo "  Bare Git Repo:   /var/repo/somanatha-shop.git"
echo "  Working Dir:     /var/www/somanatha-shop"
echo ""
echo "MongoDB Connection String (local):"
echo "  mongodb://somanatha_app:SomanathaAppPass2026@127.0.0.1:27017/somanatha_data"
echo ""
echo "To deploy from your local machine, run:"
echo "  git remote add yandex ssh://yc-user@111.88.251.124/var/repo/somanatha-shop.git"
echo "  git push yandex main"
echo ""
