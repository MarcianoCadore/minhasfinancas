#!/usr/bin/env bash
# Envia o código atual para a VM, gera o build lá e reinicia o app.
# O build é feito na VM (Linux) porque o do Windows não roda lá.
# Uso (Git Bash):  ./deploy/deploy.sh ubuntu@IP_DA_VM
set -euo pipefail

DESTINO=${1:?Uso: ./deploy/deploy.sh ubuntu@IP_DA_VM}
APP_DIR=/opt/minhasfinancas
cd "$(dirname "$0")/.."

echo "Enviando código para $DESTINO..."
# .env* e dados/ são só do computador local; o banco da VM fica em /var/lib/minhasfinancas.
tar --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude='./.env*' --exclude=./dados -czf - . |
  ssh "$DESTINO" "find $APP_DIR -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .next -exec rm -rf {} + && tar -xzf - -C $APP_DIR"

echo "Instalando dependências e gerando o build na VM..."
ssh "$DESTINO" "cd $APP_DIR && npm ci --no-audit --no-fund && npm run build && sudo systemctl restart minhasfinancas"

echo "Pronto: http://${DESTINO#*@}"
