# 🚀 LoadTest Admin Dashboard

A production-ready, secure, and beautiful admin dashboard for managing distributed load testing infrastructure. Built with Next.js 14, TypeScript, and modern UI/UX principles.

![Dashboard Preview](https://via.placeholder.com/1200x600/3b82f6/ffffff?text=LoadTest+Admin+Dashboard)

## ✨ Key Features

### 🎨 **Exceptional UI/UX**
- **Modern Design System**: Custom-built components with consistent design tokens
- **Dark/Light Themes**: Automatic system preference detection with manual toggle
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Micro-interactions**: Smooth animations and hover effects for enhanced user experience

### 🔒 **Enterprise Security**
- **Multi-layer Authentication**: JWT + bcrypt with optional 2FA support
- **Role-based Access Control**: Granular permissions (Super Admin, Admin, User)
- **Script Sandboxing**: Safe execution environment preventing malicious code
- **Input Validation**: Comprehensive validation and sanitization
- **Audit Logging**: Complete activity trail with security monitoring

### 🏗️ **Scalable Architecture**
- **Distributed Workers**: Independent Docker containers/VMs for load generation
- **Real-time Updates**: WebSocket connections for live metrics and status
- **Database Agnostic**: PostgreSQL with Prisma ORM (Supabase/Neon ready)
- **File Storage**: Vercel Blob or AWS S3 integration
- **Caching Layer**: Redis for performance optimization

### 📊 **Advanced Monitoring**
- **Real-time Metrics**: Live performance dashboards with beautiful charts
- **Health Monitoring**: System status, resource usage, and node health
- **Load Test Analytics**: Detailed reports with success rates and response times
- **Alert System**: Email notifications for critical events

## 🚀 Quick Start

### One-Click Deployment to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Floadtest-admin-dashboard&env=DATABASE_URL,NEXTAUTH_SECRET,JWT_SECRET&project-name=loadtest-dashboard&repository-name=loadtest-admin-dashboard)

### Local Development

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/loadtest-admin-dashboard.git
   cd loadtest-admin-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # (Optional) Seed database with sample data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Prerequisites

- **Node.js 18+**: Runtime environment
- **PostgreSQL Database**: Supabase, Neon, or self-hosted
- **Redis (Optional)**: For caching and real-time features
- **Docker (Optional)**: For worker nodes

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling with custom design system
- **Framer Motion**: Smooth animations and transitions
- **Recharts**: Beautiful and responsive charts
- **Radix UI**: Accessible component primitives

### Backend
- **Next.js API Routes**: Serverless functions
- **Prisma ORM**: Type-safe database access
- **NextAuth.js**: Authentication and session management
- **Zod**: Runtime type validation
- **bcryptjs**: Password hashing
- **Jose**: JWT token handling

### Infrastructure
- **PostgreSQL**: Primary database
- **Redis**: Caching and real-time features
- **Vercel Blob/AWS S3**: File storage
- **WebSockets**: Real-time communication

## 📁 Project Structure

```
loadtest-admin-dashboard/
├── 📁 app/                    # Next.js app directory
│   ├── 📁 api/               # API routes
│   ├── 📁 dashboard/         # Dashboard pages
│   ├── 📁 nodes/            # Node management
│   ├── 📁 scripts/          # Script management
│   ├── 📁 jobs/             # Job scheduling
│   ├── 📁 users/            # User management
│   ├── 📁 settings/         # Configuration
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page redirect
├── 📁 components/            # Reusable components
│   ├── 📁 ui/               # Base UI components
│   ├── 📁 layout/           # Layout components
│   ├── 📁 dashboard/        # Dashboard-specific
│   └── 📁 providers/        # Context providers
├── 📁 lib/                   # Utility libraries
│   ├── auth.ts              # Authentication logic
│   ├── db.ts                # Database connection
│   ├── utils.ts             # Helper functions
│   ├── validations.ts       # Schema validations
│   └── constants.ts         # App constants
├── 📁 types/                 # TypeScript definitions
├── 📁 worker-example/        # Standalone worker
│   ├── Dockerfile           # Container configuration
│   ├── src/                 # Worker implementation
│   └── package.json         # Worker dependencies
├── 📁 docs/                  # Documentation
│   ├── deployment.md        # Deployment guide
│   ├── security.md          # Security documentation
│   └── api-reference.md     # API documentation
├── 📁 prisma/               # Database schema
│   ├── schema.prisma        # Database models
│   ├── migrations/          # Migration files
│   └── seed.ts              # Sample data
└── 📁 public/               # Static assets
```

## 🎨 Component Library

Our custom-built component library emphasizes accessibility, performance, and developer experience:

### Core Components
- **Button**: 8 variants with loading states and icons
- **Input**: Enhanced inputs with validation and accessibility
- **Card**: Flexible containers with loading and error states
- **StatusBadge**: Rich status indicators with animations
- **DataTable**: Sortable, filterable tables with pagination
- **Modal**: Accessible dialogs with focus management
- **Toast**: Notification system with queue management

### Layout Components
- **Header**: Responsive navigation with user menu
- **Sidebar**: Collapsible navigation with active states
- **PageLayout**: Consistent page structure with breadcrumbs

### Dashboard Components
- **StatsOverview**: Key metrics with trend indicators
- **PerformanceChart**: Real-time charts with multiple datasets
- **NodeStatus**: Live node monitoring with health indicators
- **ActivityFeed**: Real-time activity with filtering

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Security**: bcrypt hashing with configurable rounds
- **Two-Factor Authentication**: TOTP support with QR codes
- **Role-based Access**: Granular permissions system
- **Session Management**: Secure session handling with auto-logout

### Script Security
- **Upload Validation**: File type, size, and content checks
- **Static Analysis**: Dangerous API detection
- **Sandboxed Execution**: Isolated execution environment
- **Content Security Policy**: XSS protection headers

### Network Security
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: API and login attempt protection
- **Security Headers**: Comprehensive security header implementation
- **Input Sanitization**: XSS and injection prevention

## 📊 Monitoring & Analytics

### Real-time Metrics
- **System Health**: CPU, memory, disk, and network usage
- **Test Performance**: Response times, throughput, error rates
- **Node Status**: Connection status, latency, resource usage
- **User Activity**: Login patterns, feature usage

### Dashboards
- **Overview Dashboard**: Key metrics and system status
- **Performance Analytics**: Historical trends and patterns
- **Node Management**: Worker health and resource monitoring
- **Audit Trail**: Security events and user actions

## 🔄 Worker Architecture

### Standalone Workers
Workers run independently as Docker containers or VMs:

```bash
# Build worker image
cd worker-example
docker build -t loadtest-worker .

# Run worker
docker run -e API_ENDPOINT=https://your-dashboard.vercel.app \
           -e API_KEY=your-worker-api-key \
           loadtest-worker
```

### Communication Protocol
- **JWT Authentication**: Secure worker registration
- **Heartbeat System**: Regular health checks
- **Job Distribution**: Encrypted job payloads
- **Result Streaming**: Real-time test results

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**: Import your GitHub repository to Vercel
2. **Environment Variables**: Configure required environment variables
3. **Database Setup**: Create PostgreSQL database (Supabase/Neon)
4. **Deploy**: Automatic deployment with every push

### Environment Configuration

Required environment variables:
```bash
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
JWT_SECRET=your-jwt-secret
NEXTAUTH_URL=https://your-domain.com
```

### Database Migration
```bash
# Production database setup
npx prisma migrate deploy
npx prisma generate
```

## 🧪 Testing

### Test Suite
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Quality Assurance
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **GitHub Actions**: Automated CI/CD

## 📚 API Documentation

### Authentication
```typescript
POST /api/auth/login
POST /api/auth/register  
POST /api/auth/logout
GET  /api/auth/me
```

### Node Management
```typescript
GET    /api/nodes          # List all nodes
POST   /api/nodes          # Register new node
GET    /api/nodes/:id      # Get node details
PUT    /api/nodes/:id      # Update node
DELETE /api/nodes/:id      # Remove node
```

### Job Management
```typescript
GET    /api/jobs           # List jobs
POST   /api/jobs           # Create job
GET    /api/jobs/:id       # Job details
POST   /api/jobs/:id/start # Start job
POST   /api/jobs/:id/stop  # Stop job
```

For complete API documentation, see [API Reference](./docs/api-reference.md).

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**: Submit PR with detailed description

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation for changes
- Follow conventional commit messages
- Ensure accessibility compliance

## 🔧 Configuration

### Feature Flags
Control features through environment variables:

```bash
FEATURE_TWO_FACTOR_AUTH=true
FEATURE_API_KEYS=true
FEATURE_AUDIT_LOG=true
FEATURE_SCHEDULED_TESTS=true
FEATURE_SCRIPT_VERSIONING=true
FEATURE_TEAM_MANAGEMENT=true
```

### Security Settings
```bash
# Rate limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600000

# Test limits
MAX_TEST_DURATION=3600000
MAX_CONCURRENT_TESTS=10
MAX_REQUESTS_PER_SECOND=1000
MAX_VIRTUAL_USERS=1000

# Domain restrictions
BLOCKED_DOMAINS=localhost,127.0.0.1,10.0.0.0/8
REQUIRE_TARGET_VERIFICATION=true
```

### Performance Tuning
```bash
# Database connection pooling
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=30000

# Redis caching
REDIS_CACHE_TTL=3600
REDIS_SESSION_TTL=86400

# File upload limits
MAX_SCRIPT_SIZE=204800
MAX_FILE_SIZE=10485760
```

## 📈 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Caching Strategy**: Multi-layer caching (CDN, Redis, Browser)
- **Bundle Analysis**: Webpack Bundle Analyzer integration
- **Performance Monitoring**: Web Vitals tracking

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms
- **Lighthouse Score**: 90+ on all metrics

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database URL format
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Test connection
npx prisma db pull
```

**Authentication Issues**
```bash
# Verify secrets are set
echo $NEXTAUTH_SECRET
echo $JWT_SECRET

# Check token expiry settings
SESSION_MAX_AGE=86400000
```

**Worker Connection Problems**
```bash
# Verify worker API endpoint
API_ENDPOINT=https://your-dashboard.vercel.app

# Check API key format
API_KEY=your-32-character-api-key
```

### Debug Mode
```bash
# Enable detailed logging
DEBUG=true
LOG_LEVEL=debug
PRETTY_LOGS=true

# Database query logging
DEBUG_DATABASE=true
LOG_QUERIES=true
```

## 📊 Monitoring & Observability

### Health Checks
```typescript
GET /api/health          # Basic health check
GET /api/health/detailed # Comprehensive system status
```

### Metrics Collection
- **Application Metrics**: Request rates, error rates, response times
- **Business Metrics**: Test execution stats, user activity
- **Infrastructure Metrics**: Database performance, cache hit rates
- **Custom Metrics**: Domain-specific measurements

### Alerting
Configure alerts for critical events:
- System failures or high error rates
- Database connection issues
- Worker node disconnections
- Security events (failed logins, suspicious activity)

## 🛡️ Security Best Practices

### Deployment Security
- **Environment Isolation**: Separate staging/production environments
- **Secret Management**: Use encrypted secret storage
- **SSL/TLS**: Enforce HTTPS in production
- **Database Security**: Connection encryption and access controls

### Operational Security
- **Regular Updates**: Keep dependencies updated
- **Security Scanning**: Automated vulnerability scanning
- **Access Logging**: Comprehensive audit trails
- **Incident Response**: Security event monitoring

### Development Security
- **Code Reviews**: Mandatory peer reviews
- **Static Analysis**: Security-focused linting
- **Dependency Scanning**: Vulnerability detection
- **Security Testing**: Penetration testing

## 🌟 Advanced Features

### API Key Management
- Generate and manage API keys for programmatic access
- Rate limiting and usage analytics per API key
- Key rotation and expiration policies

### Scheduled Testing
- Cron-based test scheduling
- Recurring test patterns
- Calendar integration for test planning

### Team Management
- Multi-tenant architecture support
- Team-based resource isolation
- Collaborative test development

### Webhook Integration
- Real-time event notifications
- Custom webhook endpoints
- Payload customization and filtering

### Script Versioning
- Git-like version control for test scripts
- Branching and merging capabilities
- Rollback to previous versions

## 📱 Mobile Support

### Progressive Web App (PWA)
- Installable web application
- Offline capability for basic features
- Push notifications for critical alerts

### Mobile-Optimized UI
- Touch-friendly interface design
- Responsive breakpoints for all devices
- Mobile-specific navigation patterns

## 🔌 Integration Ecosystem

### Third-Party Integrations
- **Slack/Discord**: Test result notifications
- **GitHub/GitLab**: CI/CD integration
- **Jira/Linear**: Issue tracking integration
- **DataDog/New Relic**: Monitoring integration

### API Ecosystem
- **REST API**: Full-featured REST endpoints
- **GraphQL**: Flexible query interface (optional)
- **WebSocket API**: Real-time data streaming
- **Webhook API**: Event-driven integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Prisma](https://www.prisma.io/) - Next-generation database toolkit
- [Vercel](https://vercel.com/) - Deployment and hosting platform

## 📞 Support

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community Q&A and ideas
- **Discord Server**: Real-time community chat

### Enterprise Support
- **Priority Support**: Dedicated support channel
- **Custom Development**: Feature development services
- **Consulting**: Architecture and deployment consulting
- **Training**: Team onboarding and training sessions

### Documentation
- **API Reference**: Complete API documentation
- **User Guide**: Step-by-step usage instructions
- **Developer Guide**: Technical implementation details
- **Video Tutorials**: Visual learning resources

---

## 🚀 Get Started Today!

Ready to revolutionize your load testing workflow? Deploy the LoadTest Admin Dashboard in minutes:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Floadtest-admin-dashboard)

Or start developing locally:

```bash
git clone https://github.com/your-username/loadtest-admin-dashboard.git
cd loadtest-admin-dashboard
npm install
npm run dev
```

**Built with ❤️ by the LoadTest Team**

---

*For more information, visit our [documentation site](https://loadtest-docs.vercel.app) or check out the [live demo](https://loadtest-demo.vercel.app).*