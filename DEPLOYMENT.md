# Deployment Guide

## Overview
This guide covers deployment of the Raptor Esports Hub to production environments. The application is optimized for deployment on Vercel with Supabase as the backend.

## Prerequisites

### Required Accounts
- [Vercel](https://vercel.com) account for hosting
- [Supabase](https://supabase.com) account for database and auth
- [Discord Developer](https://discord.com/developers/applications) account for OAuth (optional)
- GitHub account for repository hosting

### Local Development Setup
- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

## Environment Configuration

### Required Environment Variables

Create these environment variables in your deployment platform:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Discord OAuth (Optional)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id

# Optional: Analytics and Monitoring
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### Development Environment
For local development, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
```

## Supabase Setup

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Select region closest to your users
5. Set a strong database password
6. Wait for project initialization

### 2. Database Schema Setup
Run the provided SQL scripts in Supabase SQL Editor:

#### Core Schema
```sql
-- Run SUPABASE_TRYOUTS_SETUP_FIXED.sql first
-- This creates all core tables and RLS policies
```

#### Agreement System (Optional)
```sql
-- Run AGREEMENT_ENFORCEMENT_SETUP.sql
-- This adds user agreement functionality
```

#### Emergency Fixes (If Needed)
```sql
-- Run EMERGENCY_AGREEMENT_FIX.sql if agreement issues occur
```

### 3. Authentication Configuration

#### Enable Providers
1. Go to Authentication → Providers
2. Configure Email provider:
   - Enable email confirmations
   - Set custom SMTP (optional)
3. Configure Discord OAuth:
   - Add Discord provider
   - Set Client ID and Secret
   - Add redirect URL: `{YOUR_SITE_URL}/auth/confirm`

#### Row Level Security
Ensure RLS is enabled on all tables:
- Users table: ✅ Enabled
- Teams table: ✅ Enabled
- Performances table: ✅ Enabled
- All other tables: ✅ Enabled

### 4. API Keys
1. Go to Project Settings → API
2. Copy your project URL and anon key
3. Generate service role key (keep secure)

## Discord OAuth Setup (Optional)

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application
4. Go to OAuth2 → General

### 2. Configure OAuth2
1. Add redirect URIs:
   - `http://localhost:3000/auth/confirm` (development)
   - `https://your-domain.com/auth/confirm` (production)
2. Select scopes: `identify`, `email`
3. Copy Client ID for environment variables

## Vercel Deployment

### 1. Prepare Repository
```bash
# Ensure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/raptor-esports-hub.git
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set up environment variables
# - Deploy
```

#### Option B: GitHub Integration
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Connect GitHub and select repository
4. Configure project settings
5. Add environment variables
6. Deploy

### 3. Environment Variables in Vercel
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add all required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_DISCORD_CLIENT_ID`

### 4. Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_SITE_URL` to your domain

## Database Migration

### Production Database Setup
1. **Backup Strategy**: Set up automated backups in Supabase
2. **Migration Script**: Run all SQL files in order:
   ```sql
   -- 1. Core schema
   \i SUPABASE_TRYOUTS_SETUP_FIXED.sql
   
   -- 2. Agreement system (if using)
   \i AGREEMENT_ENFORCEMENT_SETUP.sql
   
   -- 3. Emergency fixes (if needed)
   \i EMERGENCY_AGREEMENT_FIX.sql
   ```

### Data Seeding (Optional)
Create initial admin user:
```sql
-- Insert into auth.users first (via Supabase Auth)
-- Then create profile
INSERT INTO users (id, email, name, role, role_level, onboarding_completed)
VALUES ('auth-user-id', 'admin@yourdomain.com', 'Admin User', 'admin', 100, true);
```

## Security Configuration

### 1. Row Level Security Policies
Verify all RLS policies are active:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 2. API Security
- Service role key kept secure
- Anon key is public (intended)
- No sensitive data in client-side code

### 3. Authentication Security
- JWT tokens auto-expire
- Refresh tokens handled securely
- Session management with timeouts

## Performance Optimization

### 1. Supabase Optimization
- Enable connection pooling
- Add database indexes for frequent queries
- Configure caching policies

### 2. Vercel Optimization
- Enable Edge Caching
- Configure ISR for static content
- Optimize images with Next.js Image component

### 3. Frontend Optimization
- Bundle analysis: `npm run build`
- Lazy loading implemented
- Code splitting enabled

## Monitoring & Analytics

### 1. Application Monitoring
- Vercel Analytics (automatic)
- Error tracking via Vercel
- Performance monitoring

### 2. Database Monitoring
- Supabase Dashboard metrics
- Query performance tracking
- Resource usage monitoring

### 3. User Analytics (Optional)
```javascript
// Add Google Analytics
// Set NEXT_PUBLIC_GA_ID in environment
```

## SSL/TLS Configuration

### Vercel (Automatic)
- SSL certificates automatically provisioned
- HTTPS enforced by default
- Certificate renewal automated

### Custom Domain
- SSL/TLS handled by Vercel
- Redirect HTTP to HTTPS enabled
- HSTS headers configured

## Backup Strategy

### 1. Database Backups
- Supabase automatic daily backups
- Point-in-time recovery available
- Manual backup creation:
  ```bash
  # Using Supabase CLI
  supabase db dump > backup.sql
  ```

### 2. Code Backups
- Git repository on GitHub
- Vercel deployment history
- Local development backups

## Health Checks

### 1. Application Health
Create health check endpoint (`/api/health`):
```typescript
export async function GET() {
  return Response.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  })
}
```

### 2. Database Health
Monitor Supabase dashboard for:
- Connection pooling status
- Query performance
- Resource utilization

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
vercel logs

# Common fixes:
npm run build    # Test locally
npm run type-check  # Check TypeScript errors
```

#### Database Connection Issues
- Verify environment variables
- Check RLS policies
- Validate API keys

#### Authentication Problems
- Confirm redirect URLs
- Check Discord OAuth settings
- Verify JWT configuration

#### Performance Issues
- Review Vercel function logs
- Check database query performance
- Analyze bundle size

### Emergency Procedures

#### Rollback Deployment
```bash
# Vercel CLI
vercel rollback

# Or via dashboard:
# Go to Deployments → Select previous version → Promote
```

#### Database Recovery
```bash
# Restore from backup (Supabase)
# Go to Settings → Database → Backups
# Select backup and restore
```

## Post-Deployment Checklist

### 1. Functionality Testing
- [ ] User registration works
- [ ] Authentication flow complete
- [ ] Dashboard loads correctly
- [ ] Role-based access working
- [ ] Discord integration functional
- [ ] Performance tracking operational

### 2. Security Verification
- [ ] HTTPS enforced
- [ ] RLS policies active
- [ ] API endpoints secured
- [ ] Environment variables set
- [ ] No sensitive data exposed

### 3. Performance Validation
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Images loading efficiently

### 4. Monitoring Setup
- [ ] Error tracking active
- [ ] Performance monitoring enabled
- [ ] Database monitoring configured
- [ ] Backup verification complete

## Maintenance

### Regular Tasks
- **Weekly**: Check error logs and performance metrics
- **Monthly**: Review database performance and optimize queries
- **Quarterly**: Update dependencies and security patches
- **Annually**: Review backup and disaster recovery procedures

### Updates and Patches
```bash
# Update dependencies
npm audit
npm update

# Test updates
npm run build
npm run test

# Deploy updates
git push origin main  # Auto-deploys via Vercel
```

## Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### Emergency Contacts
- Development Team: [contact information]
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com

---

This deployment guide ensures a production-ready setup for the Raptor Esports Hub application. Follow each section carefully and test thoroughly before going live.
