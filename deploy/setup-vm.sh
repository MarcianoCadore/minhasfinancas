#!/usr/bin/env bash
# Prepara a VM Ubuntu uma única vez: Node 24, nginx, swap e o serviço do app.
# Rodar a partir do seu computador:  ssh ubuntu@IP_DA_VM 'bash -s' < deploy/setup-vm.sh
set -euo pipefail

APP_DIR=/opt/minhasfinancas
DADOS_DIR=/var/lib/minhasfinancas # banco SQLite; fora do APP_DIR, que o deploy recria
USUARIO=$(whoami)

sudo apt-get update
if ! node -v 2>/dev/null | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y nginx

# O next build passa de 1 GB de RAM; sem swap ele morre nas VMs menores.
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

sudo mkdir -p "$APP_DIR" "$DADOS_DIR"
sudo chown "$USUARIO": "$APP_DIR" "$DADOS_DIR"

# O app escuta só em 127.0.0.1:3000; quem fica exposto na porta 80 é o nginx.
sudo tee /etc/systemd/system/minhasfinancas.service >/dev/null <<EOF
[Unit]
Description=Minhas Financas (Next.js)
After=network.target

[Service]
User=$USUARIO
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=BANCO_ARQUIVO=$DADOS_DIR/minhasfinancas.db
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/nginx/sites-available/minhasfinancas >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/minhasfinancas /etc/nginx/sites-enabled/minhasfinancas
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

sudo systemctl daemon-reload
sudo systemctl enable minhasfinancas

echo "VM pronta. Agora rode deploy/deploy.sh no seu computador."
