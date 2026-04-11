scp -o StrictHostKeyChecking=no .env.local yc-user@111.88.251.124:/tmp/.env.local
ssh -o StrictHostKeyChecking=no yc-user@111.88.251.124 "sudo mv /tmp/.env.local /var/www/somanatha-shop/.env.local; sudo chown yc-user:root /var/www/somanatha-shop/.env.local; cd /var/www/somanatha-shop; npm run build; pm2 reload somanatha-shop"
