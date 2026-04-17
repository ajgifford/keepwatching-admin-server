#!/bin/bash

###################################################################################
# Deployment Manager Script
#
# Manages deployment history, backups, and provides utilities for rollback
#
# Usage:
#   ./scripts/deployment-manager.sh list          # List deployment history
#   ./scripts/deployment-manager.sh backups       # List all backups
#   ./scripts/deployment-manager.sh rollback <n>  # Rollback to specific backup
#   ./scripts/deployment-manager.sh clean         # Clean old backups
#   ./scripts/deployment-manager.sh status        # Show current deployment status
###################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/.deployments"
DEPLOYMENT_HISTORY="$BACKUP_DIR/history.log"
PM2_APP_NAME="keepwatching-admin-server"

# Functions
print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_info() {
  echo -e "${GREEN}ℹ️  $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

show_usage() {
  echo "Deployment Manager - Manage deployments and backups"
  echo ""
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  list             List deployment history"
  echo "  backups          List all available backups"
  echo "  rollback <n>     Rollback to backup number n (from backups list)"
  echo "  clean [days]     Clean backups older than N days (default: 30)"
  echo "  status           Show current deployment status"
  echo "  info <backup>    Show detailed information about a backup"
  echo "  help             Show this help message"
  echo ""
}

list_history() {
  print_header "DEPLOYMENT HISTORY"

  if [ ! -f "$DEPLOYMENT_HISTORY" ]; then
    print_warning "No deployment history found"
    return
  fi

  echo -e "${CYAN}Timestamp          | Type   | Commit   | Branch                | Status${NC}"
  echo "--------------------------------------------------------------------------------"

  local count=0
  while IFS='|' read -r timestamp type commit branch status; do
    local color=$GREEN
    [ "$status" != "SUCCESS" ] && color=$RED

    printf "${color}%-18s | %-6s | %-8s | %-20s | %s${NC}\n" \
      "$timestamp" "$type" "${commit:0:8}" "$branch" "$status"

    ((count++))
  done < "$DEPLOYMENT_HISTORY"

  echo ""
  print_info "Total entries: $count"
}

list_backups() {
  print_header "AVAILABLE BACKUPS"

  if [ ! -d "$BACKUP_DIR" ]; then
    print_warning "No backups directory found"
    return
  fi

  local backups=($(ls -1dt "$BACKUP_DIR"/backup_* 2>/dev/null || echo ""))

  if [ ${#backups[@]} -eq 0 ]; then
    print_warning "No backups found"
    return
  fi

  echo -e "${CYAN}#  | Backup Name                           | Commit   | Branch           | Size${NC}"
  echo "----------------------------------------------------------------------------------------"

  local index=1
  for backup in "${backups[@]}"; do
    local backup_name=$(basename "$backup")
    local commit=$(cat "$backup/commit.txt" 2>/dev/null || echo "unknown")
    local branch=$(cat "$backup/branch.txt" 2>/dev/null || echo "unknown")
    local size=$(du -sh "$backup" 2>/dev/null | cut -f1 || echo "?")

    printf "%-2s | %-37s | %-8s | %-16s | %s\n" \
      "$index" "$backup_name" "${commit:0:8}" "$branch" "$size"

    ((index++))
  done

  echo ""
  print_info "Total backups: ${#backups[@]}"
  print_info "Backup directory: $BACKUP_DIR"
}

show_backup_info() {
  local backup_index=$1

  if [ -z "$backup_index" ]; then
    print_error "Please specify backup number (use 'backups' command to list)"
    exit 1
  fi

  local backups=($(ls -1dt "$BACKUP_DIR"/backup_* 2>/dev/null || echo ""))

  if [ $backup_index -lt 1 ] || [ $backup_index -gt ${#backups[@]} ]; then
    print_error "Invalid backup number. Use 'backups' command to see available backups"
    exit 1
  fi

  local backup_path="${backups[$((backup_index-1))]}"
  local backup_name=$(basename "$backup_path")

  print_header "BACKUP INFORMATION"

  echo -e "${CYAN}Backup:${NC} $backup_name"
  echo -e "${CYAN}Path:${NC} $backup_path"
  echo -e "${CYAN}Size:${NC} $(du -sh "$backup_path" | cut -f1)"
  echo ""

  if [ -f "$backup_path/commit.txt" ]; then
    echo -e "${CYAN}Commit:${NC} $(cat "$backup_path/commit.txt")"
  fi

  if [ -f "$backup_path/branch.txt" ]; then
    echo -e "${CYAN}Branch:${NC} $(cat "$backup_path/branch.txt")"
  fi

  echo ""
  echo -e "${CYAN}Contents:${NC}"
  ls -lh "$backup_path" | tail -n +2

  if [ -f "$backup_path/pm2_status.txt" ]; then
    echo ""
    echo -e "${CYAN}PM2 Status at backup time:${NC}"
    head -20 "$backup_path/pm2_status.txt"
  fi
}

rollback_to_backup() {
  local backup_index=$1

  if [ -z "$backup_index" ]; then
    print_error "Please specify backup number (use 'backups' command to list)"
    exit 1
  fi

  local backups=($(ls -1dt "$BACKUP_DIR"/backup_* 2>/dev/null || echo ""))

  if [ $backup_index -lt 1 ] || [ $backup_index -gt ${#backups[@]} ]; then
    print_error "Invalid backup number. Use 'backups' command to see available backups"
    exit 1
  fi

  local backup_path="${backups[$((backup_index-1))]}"
  local backup_name=$(basename "$backup_path")

  print_header "ROLLBACK TO BACKUP"

  echo -e "${CYAN}Selected backup:${NC} $backup_name"
  echo -e "${CYAN}Commit:${NC} $(cat "$backup_path/commit.txt")"
  echo -e "${CYAN}Branch:${NC} $(cat "$backup_path/branch.txt")"
  echo ""

  read -p "Are you sure you want to rollback to this backup? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Rollback cancelled"
    exit 0
  fi

  # Call the restore function from deploy script
  cd "$PROJECT_ROOT"

  local backup_commit=$(cat "$backup_path/commit.txt")
  local backup_branch=$(cat "$backup_path/branch.txt")

  print_info "Restoring git state..."
  git fetch origin "$backup_branch"
  git checkout "$backup_commit"

  print_info "Restoring dependencies..."
  if [ -f "$backup_path/yarn.lock" ]; then
    cp "$backup_path/yarn.lock" "$PROJECT_ROOT/yarn.lock"
  fi
  yarn install

  if [ -d "$backup_path/dist" ]; then
    print_info "Restoring dist/ directory..."
    rm -rf "$PROJECT_ROOT/dist"
    cp -r "$backup_path/dist" "$PROJECT_ROOT/dist"
  else
    print_info "Rebuilding project..."
    yarn build
  fi

  print_info "Restarting PM2 process..."
  pm2 restart "$PM2_APP_NAME" --update-env

  sleep 2

  if pm2 describe "$PM2_APP_NAME" | grep -q "online"; then
    print_header "ROLLBACK SUCCESSFUL ✅"
    print_info "Server is running on commit: $backup_commit"

    # Log rollback in history
    local timestamp=$(date +%Y%m%d_%H%M%S)
    echo "$timestamp|ROLLBACK|$backup_commit|$backup_branch|SUCCESS" >> "$DEPLOYMENT_HISTORY"
  else
    print_error "PM2 process failed to start after rollback!"
    exit 1
  fi
}

clean_old_backups() {
  local days=${1:-30}

  print_header "CLEANING OLD BACKUPS"

  if [ ! -d "$BACKUP_DIR" ]; then
    print_warning "No backups directory found"
    return
  fi

  print_info "Removing backups older than $days days..."

  local count=0
  while IFS= read -r -d '' backup; do
    local backup_name=$(basename "$backup")
    print_info "Removing: $backup_name"
    rm -rf "$backup"
    ((count++))
  done < <(find "$BACKUP_DIR" -name "backup_*" -type d -mtime +$days -print0 2>/dev/null)

  if [ $count -eq 0 ]; then
    print_info "No old backups to remove"
  else
    print_info "✅ Removed $count old backup(s)"
  fi
}

show_status() {
  print_header "DEPLOYMENT STATUS"

  cd "$PROJECT_ROOT"

  echo -e "${CYAN}Current Git Status:${NC}"
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "  Commit: $(git rev-parse HEAD)"
  echo "  Status: $(git status --short | wc -l) uncommitted change(s)"
  echo ""

  echo -e "${CYAN}PM2 Status:${NC}"
  pm2 describe "$PM2_APP_NAME" 2>/dev/null || print_warning "PM2 process not found"
  echo ""

  if [ -d "$PROJECT_ROOT/dist" ]; then
    echo -e "${CYAN}Build Status:${NC}"
    echo "  Dist directory: ✅ exists"
    echo "  Size: $(du -sh "$PROJECT_ROOT/dist" | cut -f1)"
    echo "  Last modified: $(stat -c %y "$PROJECT_ROOT/dist" | cut -d'.' -f1)"
  else
    echo -e "${CYAN}Build Status:${NC}"
    print_warning "Dist directory not found"
  fi
  echo ""

  if [ -f "$DEPLOYMENT_HISTORY" ]; then
    echo -e "${CYAN}Last Deployment:${NC}"
    tail -1 "$DEPLOYMENT_HISTORY" | while IFS='|' read -r timestamp type commit branch status; do
      echo "  Time: $timestamp"
      echo "  Type: $type"
      echo "  Commit: ${commit:0:8}"
      echo "  Status: $status"
    done
  else
    print_warning "No deployment history found"
  fi
  echo ""

  if [ -d "$BACKUP_DIR" ]; then
    local backup_count=$(ls -1d "$BACKUP_DIR"/backup_* 2>/dev/null | wc -l)
    local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo -e "${CYAN}Backups:${NC}"
    echo "  Count: $backup_count"
    echo "  Total size: $backup_size"
  fi
}

# Main execution
main() {
  local command=${1:-help}

  case $command in
    list|history)
      list_history
      ;;
    backups)
      list_backups
      ;;
    rollback)
      rollback_to_backup "$2"
      ;;
    clean)
      clean_old_backups "$2"
      ;;
    status)
      show_status
      ;;
    info)
      show_backup_info "$2"
      ;;
    help|--help)
      show_usage
      ;;
    *)
      print_error "Unknown command: $command"
      echo ""
      show_usage
      exit 1
      ;;
  esac
}

main "$@"
