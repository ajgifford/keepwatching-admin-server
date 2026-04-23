#!/usr/bin/env bash
# cert-renewal-hook.sh
#
# Automatically reloads nginx after Certbot renews TLS certificates so that
# the renewed cert is picked up without a full service restart.
#
# One-time server setup:
#   sudo ln -s /path/to/keepwatching-admin-server/scripts/cert-renewal-hook.sh \
#     /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#   sudo chmod +x /path/to/keepwatching-admin-server/scripts/cert-renewal-hook.sh
#
# Verify the hook will fire on the next renewal dry-run:
#   sudo certbot renew --dry-run

set -euo pipefail

LOG_FILE="/var/log/cert-renewal.log"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" | tee -a "${LOG_FILE}"
}

log "Certificate renewal detected — reloading nginx..."

if systemctl reload nginx; then
  log "nginx reloaded successfully."
else
  log "ERROR: nginx reload failed. Check nginx config with: sudo nginx -t"
  exit 1
fi

log "Restarting keepwatching-admin-server to pick up renewed certificates..."

if pm2 restart keepwatching-admin-server; then
  log "PM2 process restarted successfully."
else
  log "ERROR: PM2 restart failed. Restart manually with: pm2 restart keepwatching-admin-server"
  exit 1
fi
