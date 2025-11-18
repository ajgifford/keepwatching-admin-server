#!/bin/bash

###################################################################################
# Admin Server Deployment Script
#
# Features:
#   - Dry run mode to preview changes
#   - Automatic backup before deployment
#   - Rollback capability to previous version
#   - Deployment history tracking
#   - Health checks and validation
#
# Usage:
#   ./scripts/deploy-admin.sh              # Normal deployment
#   ./scripts/deploy-admin.sh --dry-run    # Preview changes without deploying
#   ./scripts/deploy-admin.sh --rollback   # Rollback to previous deployment
###################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_ROOT/.deployments"
DEPLOYMENT_HISTORY="$BACKUP_DIR/history.log"
PM2_APP_NAME="keepwatching-admin-server"

# Parse command line arguments
DRY_RUN=false
ROLLBACK=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Preview changes without deploying"
      echo "  --rollback   Rollback to previous deployment"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $arg${NC}"
      exit 1
      ;;
  esac
done

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

print_dry_run() {
  echo -e "${YELLOW}[DRY RUN] $1${NC}"
}

create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    touch "$DEPLOYMENT_HISTORY"
    print_info "Created deployment backup directory"
  fi
}

get_current_commit() {
  git rev-parse HEAD
}

get_current_branch() {
  git rev-parse --abbrev-ref HEAD
}

create_backup() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local current_commit=$(get_current_commit)
  local current_branch=$(get_current_branch)
  local backup_name="backup_${timestamp}_${current_commit:0:8}"
  local backup_path="$BACKUP_DIR/$backup_name"

  print_info "Creating backup: $backup_name"

  mkdir -p "$backup_path"

  # Save git info
  echo "$current_commit" > "$backup_path/commit.txt"
  echo "$current_branch" > "$backup_path/branch.txt"

  # Backup dist directory if it exists
  if [ -d "$PROJECT_ROOT/dist" ]; then
    cp -r "$PROJECT_ROOT/dist" "$backup_path/dist"
    print_info "Backed up dist/ directory"
  fi

  # Save package.json and yarn.lock for dependency tracking
  cp "$PROJECT_ROOT/package.json" "$backup_path/package.json"
  if [ -f "$PROJECT_ROOT/yarn.lock" ]; then
    cp "$PROJECT_ROOT/yarn.lock" "$backup_path/yarn.lock"
  fi

  # Save current PM2 status
  pm2 describe "$PM2_APP_NAME" > "$backup_path/pm2_status.txt" 2>&1 || true

  # Record backup in history
  echo "$timestamp|$backup_name|$current_commit|$current_branch|SUCCESS" >> "$DEPLOYMENT_HISTORY"

  echo "$backup_path"
}

get_latest_backup() {
  if [ ! -f "$DEPLOYMENT_HISTORY" ]; then
    return 1
  fi

  local latest=$(tail -n 1 "$DEPLOYMENT_HISTORY" | grep "SUCCESS" || echo "")
  if [ -z "$latest" ]; then
    return 1
  fi

  local backup_name=$(echo "$latest" | cut -d'|' -f2)
  echo "$BACKUP_DIR/$backup_name"
}

restore_backup() {
  local backup_path=$1

  if [ ! -d "$backup_path" ]; then
    print_error "Backup not found: $backup_path"
    exit 1
  fi

  print_header "ROLLING BACK TO BACKUP"

  local backup_commit=$(cat "$backup_path/commit.txt")
  local backup_branch=$(cat "$backup_path/branch.txt")

  print_info "Backup commit: $backup_commit"
  print_info "Backup branch: $backup_branch"

  # Restore git state
  print_info "Restoring git state..."
  git fetch origin "$backup_branch"
  git checkout "$backup_commit"

  # Restore dependencies
  print_info "Restoring dependencies..."
  if [ -f "$backup_path/yarn.lock" ]; then
    cp "$backup_path/yarn.lock" "$PROJECT_ROOT/yarn.lock"
  fi
  yarn install

  # Restore dist if exists
  if [ -d "$backup_path/dist" ]; then
    print_info "Restoring dist/ directory..."
    rm -rf "$PROJECT_ROOT/dist"
    cp -r "$backup_path/dist" "$PROJECT_ROOT/dist"
  else
    # Rebuild if no dist backup
    print_info "Rebuilding project..."
    yarn build
  fi

  # Restart PM2
  print_info "Restarting PM2 process..."
  pm2 restart "$PM2_APP_NAME" --update-env

  print_info "✅ Rollback completed successfully!"
}

check_git_status() {
  if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory has uncommitted changes"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Deployment cancelled"
      exit 0
    fi
  fi
}

show_git_changes() {
  local current_commit=$(get_current_commit)

  print_info "Current commit: $current_commit"

  # Fetch latest changes
  git fetch origin

  local remote_commit=$(git rev-parse origin/$(get_current_branch))

  if [ "$current_commit" = "$remote_commit" ]; then
    print_info "Already up to date"
    return 0
  fi

  echo ""
  print_info "New commits to be pulled:"
  git log --oneline --decorate "$current_commit..$remote_commit"
  echo ""

  return 1
}

check_dependencies_changes() {
  local has_changes=false

  # Save current yarn.lock hash
  local current_lock_hash=""
  if [ -f "$PROJECT_ROOT/yarn.lock" ]; then
    current_lock_hash=$(md5sum "$PROJECT_ROOT/yarn.lock" | cut -d' ' -f1)
  fi

  # Fetch to check for changes
  git fetch origin

  # Check if yarn.lock or package.json would change
  local remote_lock_hash=$(git show origin/$(get_current_branch):yarn.lock 2>/dev/null | md5sum | cut -d' ' -f1 || echo "")

  if [ -n "$remote_lock_hash" ] && [ "$current_lock_hash" != "$remote_lock_hash" ]; then
    print_warning "Dependencies will be updated (yarn.lock changed)"
    has_changes=true
  fi

  return $([ "$has_changes" = true ] && echo 0 || echo 1)
}

perform_deployment() {
  cd "$PROJECT_ROOT"

  print_header "ADMIN SERVER DEPLOYMENT"

  # Check git status
  print_info "Checking git status..."
  check_git_status

  # Show what will change
  show_git_changes
  local git_up_to_date=$?

  check_dependencies_changes
  local deps_will_change=$?

  if $DRY_RUN; then
    print_header "DRY RUN SUMMARY"
    print_dry_run "Git pull: $([ $git_up_to_date -eq 0 ] && echo 'No changes' || echo 'Will pull new commits')"
    print_dry_run "Dependencies: $([ $deps_will_change -eq 0 ] && echo 'Will update' || echo 'No changes')"
    print_dry_run "Build: Will compile TypeScript to dist/"
    print_dry_run "PM2 restart: Will restart $PM2_APP_NAME"
    print_info "✅ Dry run completed - no changes made"
    return 0
  fi

  # Create backup before deployment
  create_backup_dir
  local backup_path=$(create_backup)
  print_info "Backup created: $backup_path"

  # Deployment steps
  print_info "Pulling latest from Git..."
  git pull

  print_info "Installing dependencies..."
  yarn install

  print_info "Building project..."
  yarn build

  # Verify build succeeded
  if [ ! -d "$PROJECT_ROOT/dist" ] || [ ! -f "$PROJECT_ROOT/dist/server.js" ]; then
    print_error "Build failed - dist/server.js not found!"
    print_warning "Rolling back to previous version..."
    restore_backup "$backup_path"
    exit 1
  fi

  print_info "Restarting PM2 process..."
  pm2 restart "$PM2_APP_NAME" --update-env

  # Wait a bit for PM2 to start
  sleep 2

  # Check PM2 status
  if pm2 describe "$PM2_APP_NAME" | grep -q "online"; then
    print_header "DEPLOYMENT SUCCESSFUL ✅"
    print_info "Server is running"
    print_info "Backup available at: $backup_path"

    # Save successful deployment
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local current_commit=$(get_current_commit)
    echo "$timestamp|DEPLOY|$current_commit|$(get_current_branch)|SUCCESS" >> "$DEPLOYMENT_HISTORY"
  else
    print_error "PM2 process failed to start!"
    print_warning "Rolling back to previous version..."
    restore_backup "$backup_path"
    exit 1
  fi
}

perform_rollback() {
  cd "$PROJECT_ROOT"

  create_backup_dir

  local latest_backup=$(get_latest_backup)

  if [ -z "$latest_backup" ]; then
    print_error "No backup found to rollback to"
    exit 1
  fi

  print_warning "Latest backup: $latest_backup"

  if $DRY_RUN; then
    print_header "DRY RUN - ROLLBACK PREVIEW"
    local backup_commit=$(cat "$latest_backup/commit.txt")
    local backup_branch=$(cat "$latest_backup/branch.txt")
    print_dry_run "Would restore to commit: $backup_commit"
    print_dry_run "Would restore to branch: $backup_branch"
    print_dry_run "Would restore dependencies from backup"
    print_dry_run "Would restore dist/ directory"
    print_dry_run "Would restart PM2 process"
    print_info "✅ Dry run completed - no changes made"
    return 0
  fi

  read -p "Are you sure you want to rollback? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Rollback cancelled"
    exit 0
  fi

  restore_backup "$latest_backup"
}

# Main execution
main() {
  if $ROLLBACK; then
    perform_rollback
  else
    perform_deployment
  fi
}

main
