# Deployment Scripts Documentation

This directory contains scripts for deploying and managing the KeepWatching Admin Server in production.

## Scripts Overview

### 1. `deploy-admin.sh` - Main Deployment Script

The primary deployment script with rollback capabilities and dry-run mode.

#### Features
- **Dry Run Mode**: Preview changes before deployment
- **Automatic Backups**: Creates backup before each deployment
- **Rollback Support**: Restore to previous version if deployment fails
- **Health Checks**: Validates deployment success
- **Deployment History**: Tracks all deployments with timestamps

#### Usage

**Normal Deployment:**
```bash
./scripts/deploy-admin.sh
```

**Dry Run (preview changes):**
```bash
./scripts/deploy-admin.sh --dry-run
```

**Rollback to Previous Version:**
```bash
./scripts/deploy-admin.sh --rollback
```

#### What It Does

1. **Pre-deployment Checks**
   - Checks git status for uncommitted changes
   - Shows commits that will be pulled
   - Detects dependency changes

2. **Backup Creation**
   - Saves current git commit hash
   - Backs up `dist/` directory
   - Saves `package.json` and `yarn.lock`
   - Records PM2 status

3. **Deployment Steps**
   - Pulls latest code from git
   - Installs/updates dependencies with yarn
   - Builds the project
   - Restarts PM2 process

4. **Validation**
   - Verifies build output exists
   - Checks PM2 process is online
   - Auto-rollback on failure

#### Dry Run Output Example
```
[DRY RUN] Git pull: Will pull new commits
[DRY RUN] Dependencies: Will update
[DRY RUN] Build: Will compile TypeScript to dist/
[DRY RUN] PM2 restart: Will restart keepwatching-admin-server
✅ Dry run completed - no changes made
```

---

### 2. `deployment-manager.sh` - Deployment Management Utility

Manages deployment history, backups, and provides advanced rollback options.

#### Commands

**List Deployment History:**
```bash
./scripts/deployment-manager.sh list
```
Shows all deployments and rollbacks with timestamps, commits, and status.

**List Available Backups:**
```bash
./scripts/deployment-manager.sh backups
```
Displays all backups with sizes and details.

**Show Current Status:**
```bash
./scripts/deployment-manager.sh status
```
Shows git status, PM2 status, build status, and last deployment info.

**Rollback to Specific Backup:**
```bash
./scripts/deployment-manager.sh rollback <backup-number>
```
Rollback to a specific backup (use `backups` command to see numbers).

**Show Backup Details:**
```bash
./scripts/deployment-manager.sh info <backup-number>
```
Display detailed information about a specific backup.

**Clean Old Backups:**
```bash
./scripts/deployment-manager.sh clean [days]
```
Remove backups older than specified days (default: 30).

#### Example Workflow

```bash
# Check current status
./scripts/deployment-manager.sh status

# List all backups
./scripts/deployment-manager.sh backups

# View details of backup #2
./scripts/deployment-manager.sh info 2

# Rollback to backup #2
./scripts/deployment-manager.sh rollback 2

# Clean backups older than 60 days
./scripts/deployment-manager.sh clean 60
```

---

### 3. `start-admin.sh` - Environment-Specific Startup

Starts the server in development or production mode with correct environment variables.

#### Usage

**Development Mode:**
```bash
./scripts/start-admin.sh dev
```

**Production Mode:**
```bash
./scripts/start-admin.sh prod
```

This script:
- Copies the appropriate `.env.development` or `.env.production` to `.env`
- Starts the server via PM2 with the correct configuration

---

## Backup System

### Backup Directory Structure

Backups are stored in `.deployments/` (gitignored):

```
.deployments/
├── history.log                          # Deployment history
├── backup_20250117_143022_3388d75a/   # Backup from deployment
│   ├── commit.txt                       # Git commit hash
│   ├── branch.txt                       # Git branch name
│   ├── package.json                     # Package manifest
│   ├── yarn.lock                        # Dependency lock file
│   ├── pm2_status.txt                   # PM2 status snapshot
│   └── dist/                            # Built application
└── backup_20250117_120000_eb9cee12/
    └── ...
```

### What Gets Backed Up

1. **Git Information**
   - Current commit hash
   - Current branch name

2. **Application Code**
   - Entire `dist/` directory (compiled JavaScript)

3. **Dependencies**
   - `package.json`
   - `yarn.lock`

4. **Runtime State**
   - PM2 process status

### Backup Retention

- Backups are created automatically before each deployment
- Use `deployment-manager.sh clean` to remove old backups
- Recommended: Clean backups older than 30-60 days to save space

---

## Deployment Workflow

### Standard Deployment

```bash
# 1. Preview changes with dry run
./scripts/deploy-admin.sh --dry-run

# 2. If everything looks good, deploy
./scripts/deploy-admin.sh

# 3. Verify deployment
./scripts/deployment-manager.sh status
```

### If Deployment Fails

The script automatically attempts rollback on failure. You can also manually rollback:

```bash
# Quick rollback to last backup
./scripts/deploy-admin.sh --rollback

# Or rollback to specific backup
./scripts/deployment-manager.sh backups
./scripts/deployment-manager.sh rollback 2
```

### Emergency Rollback

If you need to rollback outside of the deployment script:

```bash
# 1. List backups
./scripts/deployment-manager.sh backups

# 2. View backup details
./scripts/deployment-manager.sh info <backup-number>

# 3. Perform rollback
./scripts/deployment-manager.sh rollback <backup-number>
```

---

## Troubleshooting

### Deployment Stuck or Failed

1. Check PM2 logs:
   ```bash
   pm2 logs keepwatching-admin-server
   ```

2. Check deployment status:
   ```bash
   ./scripts/deployment-manager.sh status
   ```

3. Review deployment history:
   ```bash
   ./scripts/deployment-manager.sh list
   ```

### Rollback Not Working

1. Ensure backup exists:
   ```bash
   ./scripts/deployment-manager.sh backups
   ```

2. Check backup integrity:
   ```bash
   ./scripts/deployment-manager.sh info <backup-number>
   ```

3. Manually restore if needed:
   ```bash
   cd ~/git/keepwatching-admin-server
   git checkout <commit-hash>
   yarn install
   yarn build
   pm2 restart keepwatching-admin-server
   ```

### Disk Space Issues

Clean old backups to free space:

```bash
# Remove backups older than 30 days
./scripts/deployment-manager.sh clean 30

# Check backup disk usage
du -sh .deployments/
```

---

## Best Practices

1. **Always Use Dry Run First**
   - Run `--dry-run` before actual deployment
   - Review what will change

2. **Monitor After Deployment**
   - Check PM2 logs: `pm2 logs`
   - Verify status: `./scripts/deployment-manager.sh status`
   - Test critical endpoints

3. **Regular Backup Cleanup**
   - Clean backups monthly
   - Keep at least 3-5 recent backups

4. **Git Best Practices**
   - Commit local changes before deployment
   - Use feature branches for development
   - Only deploy from tested commits

5. **Document Issues**
   - If rollback is needed, document why
   - Track failed deployments in history

---

## Configuration

### PM2 Application Name

The scripts expect PM2 app name: `keepwatching-admin-server`

To change this, edit both scripts:
```bash
PM2_APP_NAME="your-app-name"
```

### Backup Location

Default: `.deployments/` in project root

To change, edit both scripts:
```bash
BACKUP_DIR="/path/to/backups"
```

---

## Integration with CI/CD

These scripts can be integrated into automated deployment pipelines:

```bash
# In your CI/CD pipeline
ssh user@raspberry-pi << 'EOF'
  cd ~/git/keepwatching-admin-server
  ./scripts/deploy-admin.sh --dry-run  # Preview
  ./scripts/deploy-admin.sh             # Deploy
  ./scripts/deployment-manager.sh status # Verify
EOF
```

---

## Safety Features

1. **Pre-deployment Checks**
   - Git status validation
   - Uncommitted changes warning
   - User confirmation for risky operations

2. **Automatic Rollback**
   - On build failure
   - On PM2 start failure

3. **Manual Rollback**
   - User confirmation required
   - Backup validation before restore

4. **Health Validation**
   - Post-deployment PM2 status check
   - Build output verification

---

## Support

For issues or questions about deployment:
1. Check deployment history: `./scripts/deployment-manager.sh list`
2. Review logs: `pm2 logs keepwatching-admin-server`
3. Check status: `./scripts/deployment-manager.sh status`
