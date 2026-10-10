# Deploying Weather App to EC2 with systemd and a Custom Domain

## Prerequisites
- An AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- A domain name with access to its DNS settings
- SSH access to your EC2 instance

---

## 1. Launch & Configure EC2

1. Launch an EC2 instance (Ubuntu 22.04, `t2.micro` is fine for this app)
2. In the Security Group, open these inbound ports:
   - `22` — SSH
   - `80` — HTTP
   - `443` — HTTPS

   Later go back to your security group and open port 3000. 

---

## 2. Point Your Domain to EC2

In your domain registrar's DNS settings, add an **A record**:

| Type | Name | Value              |
|------|------|--------------------|
| A    | @    | `<your-ec2-public-ip>` |
| A    | www  | `<your-ec2-public-ip>` |

> DNS propagation can take up to 30 minutes.

---

## 3. SSH into Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
```

---

## 4. Install Node.js and Nginx

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
n

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 5. Deploy the App

```bash
# Clone your repo
git clone https://github.com/<your-username>/weather-app-2026.git
cd weather-app-2026

# Install dependencies
npm install --omit=dev
```

---

## 6. Create a systemd Service

This keeps the app running and auto-restarts it on crash or reboot.

```bash
sudo vim /etc/systemd/system/weather-app.service
```

Paste the following (replace `ubuntu` with your actual username if different):

```ini
[Unit]
Description=Weather App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/weather-app-2026
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable weather-app
sudo systemctl start weather-app

# Verify it's running
sudo systemctl status weather-app
```

---

## 7. Configure Nginx as a Reverse Proxy

```bash
sudo vim /etc/nginx/sites-available/weather-app
```

Paste the following (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name weather-app.borderlesstechacademy.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the config and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/weather-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Enable HTTPS with Let's Encrypt


```bash
sudo certbot --nginx -d www.weather-app.borderlesstechacademy.com 
```

Certbot will automatically update your Nginx config with SSL. Certificates auto-renew via a cron job installed by Certbot.

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 9. Verify Everything

```bash
# Check app service
sudo systemctl status weather-app

# Check Nginx
sudo systemctl status nginx
```

Visit `https://yourdomain.com` in your browser — your weather app should be live.

---

## Useful Commands

| Task                  | Command                                  |
|-----------------------|------------------------------------------|
| View app logs         | `sudo journalctl -u weather-app -f`      |
| Restart app           | `sudo systemctl restart weather-app`     |
| Restart Nginx         | `sudo systemctl restart nginx`           |
| Pull latest code      | `git pull && sudo systemctl restart weather-app` |
