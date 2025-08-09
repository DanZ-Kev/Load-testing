# ==============================================
# Load Testing Admin Dashboard - Environment Configuration
# ==============================================
# Copy this file to .env.local and fill in your values

# ==============================================
# APPLICATION SETTINGS
# ==============================================
# Next.js configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here-generate-a-strong-random-string

# Application environment
NODE_ENV=development
NEXT_PUBLIC_APP_NAME="LoadTest Admin Dashboard"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
# PostgreSQL connection string
# For Supabase: postgresql://postgres:[password]@[host]:5432/[database]
# For Neon: postgresql://[user]:[password]@[host]/[database]?sslmode=require
DATABASE_URL="postgresql://username:password@localhost:5432/loadtest_db"

# Direct database URL for Prisma migrations (required for some providers)
DIRECT_URL="postgresql://username:password@localhost:5432/loadtest_db"

# ==============================================
# AUTHENTICATION & SECURITY
# ==============================================
# JWT secret for token signing (generate a strong random string)
JWT_SECRET=your-jwt-secret-here-min-32-characters-long

# Encryption key for sensitive data (32-byte hex string)
ENCRYPTION_KEY=your-32-byte-encryption-key-in-hex

# Password hashing rounds (10-12 recommended for production)
BCRYPT_ROUNDS=12

# Session configuration
SESSION_SECRET=your-session-secret-here
SESSION_MAX_AGE=86400000

# CORS origins (comma-separated list for multiple origins)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# ==============================================
# FILE STORAGE
# ==============================================
# Choose one: Vercel Blob or AWS S3

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# OR AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Maximum file upload size in bytes (default: 200KB for scripts)
MAX_SCRIPT_SIZE=204800
MAX_FILE_SIZE=10485760

# ==============================================
# REDIS (OPTIONAL - FOR CACHING & SESSIONS)
# ==============================================
# Redis connection URL for caching and real-time features
REDIS_URL=redis://localhost:6379
# For Redis Cloud: redis://:[password]@[host]:[port]

# Redis configuration
REDIS_CACHE_TTL=3600
REDIS_SESSION_TTL=86400

# ==============================================
# EMAIL CONFIGURATION (OPTIONAL)
# ==============================================
# SMTP settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Email features
ENABLE_EMAIL_NOTIFICATIONS=false
EMAIL_ADMIN_ALERTS=admin@yourdomain.com

# ==============================================
# WORKER NODE CONFIGURATION
# ==============================================
# Default settings for worker nodes
DEFAULT_WORKER_TIMEOUT=300000
DEFAULT_MAX_CONCURRENT_JOBS=5
WORKER_HEARTBEAT_INTERVAL=30000
WORKER_OFFLINE_THRESHOLD=90000

# Worker security
WORKER_API_KEY_LENGTH=32
WORKER_TOKEN_EXPIRY=3600000

# ==============================================
# LOAD TESTING LIMITS & SECURITY
# ==============================================
# Global rate limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600000

# Test execution limits
MAX_TEST_DURATION=3600000
MAX_CONCURRENT_TESTS=10
MAX_REQUESTS_PER_SECOND=1000
MAX_VIRTUAL_USERS=1000

# Security restrictions
ALLOW_EXTERNAL_TARGETS=false
REQUIRE_TARGET_VERIFICATION=true
BLOCKED_DOMAINS=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# ==============================================
# MONITORING & ANALYTICS
# ==============================================
# WebSocket configuration for real-time updates
ENABLE_WEBSOCKETS=true
WS_HEARTBEAT_INTERVAL=30000

# Metrics retention
METRICS_RETENTION_DAYS=30
LOG_RETENTION_DAYS=90

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1

# ==============================================
# FEATURE FLAGS
# ==============================================
# Enable/disable features
FEATURE_TWO_FACTOR_AUTH=true
FEATURE_API_KEYS=true
FEATURE_AUDIT_LOG=true
FEATURE_SCHEDULED_TESTS=true
FEATURE_SCRIPT_VERSIONING=true
FEATURE_TEAM_MANAGEMENT=true

# ==============================================
# THIRD-PARTY INTEGRATIONS
# ==============================================
# Webhook configuration
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT=10000

# External API integrations (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK

# Analytics (optional)
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your-mixpanel-token

# ==============================================
# DEVELOPMENT SETTINGS
# ==============================================
# Development-only settings
DEBUG=false
LOG_LEVEL=info
PRETTY_LOGS=true

# Database debugging
DEBUG_DATABASE=false
LOG_QUERIES=false

# Disable security features for local development
DISABLE_CSRF=false
DISABLE_RATE_LIMITING=false
ALLOW_HTTP_COOKIES=false

# ==============================================
# PRODUCTION OVERRIDES
# ==============================================
# These should be set in production environment
# NEXTAUTH_URL=https://yourdomain.com
# NODE_ENV=production
# DEBUG=false
# LOG_LEVEL=warn
# DISABLE_CSRF=false
# DISABLE_RATE_LIMITING=false
# ALLOW_HTTP_COOKIES=false