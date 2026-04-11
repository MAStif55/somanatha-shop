scp -o StrictHostKeyChecking=no nginx.conf yc-user@111.88.251.124:/tmp/nginx.conf
ssh -o StrictHostKeyChecking=no yc-user@111.88.251.124 "sudo mv /tmp/nginx.conf /etc/nginx/sites-available/somanatha; sudo systemctl restart nginx; cd /var/www/somanatha-shop; pm2 start npm --name somanatha-shop -- start"
