# Raptor Esports Hub

Welcome to the **Raptor Esports Hub** - a comprehensive team management system designed specifically for Raptor Esports. This application provides a centralized platform for managing teams, tracking performance, monitoring attendance, and coordinating esports activities.

## 🚀 Features

### Dashboard & Analytics
- **Role-based dashboards** with customized views for Admin, Manager, Coach, Analyst, and Player roles
- **Real-time statistics** showing team performance, player metrics, and organizational data
- **Advanced analytics** with charts and performance tracking
- **PDF export functionality** for reports and analytics

### Team Management
- **Team roster management** with player assignments and role tracking
- **Responsive design** that adapts to different screen sizes
- **Tournament slot booking** and scheduling
- **Team performance monitoring**

### Performance Tracking
- **Match performance submission** for players and staff
- **OCR integration** for automatic screenshot processing
- **Performance analytics** with detailed metrics and trends
- **Smart slot selection** for tournament management

### Attendance System
- **Training session attendance** tracking
- **Verification system** for training activities
- **Daily practice session** monitoring
- **Attendance heatmaps** and statistics

### User Management
- **Role-based access control** with granular permissions
- **Profile management** with gaming details and preferences
- **Onboarding system** for new players
- **User search and management** tools

### Discord Integration
- **Webhook management** for automated notifications
- **Performance report sharing** to Discord channels
- **Attendance summaries** and team updates
- **Bot integration** for enhanced team communication

## 🛠 Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts for analytics visualization
- **PDF Generation**: jsPDF with autoTable
- **OCR**: Tesseract.js for image text extraction
- **Package Manager**: pnpm

## 🏗 Project Structure

```
raptor-esports-hub/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard pages
│   └── onboarding/        # User onboarding
├── components/            # React components
│   ├── analytics/         # Analytics components
│   ├── attendance/        # Attendance tracking
│   ├── dashboard/         # Dashboard components
│   ├── performance/       # Performance tracking
│   ├── profile/           # User profile components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
├── scripts/              # Database scripts
└── database/             # Database schemas
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd raptor-esports-hub
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   RAPTOR_BOT_API_KEY=your_discord_bot_api_key
   ```

4. **Database Setup**
   Run the database migration scripts in order:
   ```bash
   # Run scripts in the scripts/ directory in numerical order
   # Or import the database schema from database/ directory
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

The application uses a comprehensive database schema including:

- **Users**: Player profiles and authentication
- **Teams**: Team information and assignments
- **Performances**: Match performance data
- **Attendances**: Training and session attendance
- **Sessions**: Practice and training sessions
- **Slots**: Tournament slots and scheduling
- **Rosters**: Team roster management

## Database Performance Recommendations

For faster queries in dashboard and analytics, add these indexes in Supabase (SQL editor):

```sql
-- Performances hot paths
create index if not exists idx_performances_created_at on performances (created_at desc);
create index if not exists idx_performances_team_id_created on performances (team_id, created_at desc);
create index if not exists idx_performances_player_id_created on performances (player_id, created_at desc);

-- Attendance
create index if not exists idx_attendances_team_id_created on attendances (team_id, created_at desc);
create index if not exists idx_attendances_created_at on attendances (created_at desc);

-- Expenses and winnings
create index if not exists idx_slot_expenses_team_id_created on slot_expenses (team_id, created_at desc);
create index if not exists idx_winnings_team_id_created on winnings (team_id, created_at desc);

-- Teams and users filters
create index if not exists idx_teams_status on teams (status);
create index if not exists idx_users_role on users (role);
```

These indexes target the exact filters used by the APIs (timeframe windows and role-scoped team/player filters) and should significantly reduce response times under load.

## 🔧 Recent Updates & Fixes

### ✅ Completed Improvements

- **Fixed overview statistics** - Now properly displays team counts, player stats, and webhook data
- **Enhanced role-based access** - Players have streamlined interface, admins/managers have full access
- **Improved responsiveness** - Team management and all modules now work on mobile devices
- **Fixed visibility issues** - Switched to dark theme to resolve text contrast problems
- **Updated branding** - Changed from generic branding to "Raptor Esports Hub" throughout
- **Currency localization** - Changed dollar symbols to rupee (₹) symbols
- **Enhanced error handling** - Better error messages and loading states
- **PDF export fixes** - Resolved PDF generation issues with better error handling
- **Performance submission fixes** - Fixed date constraint violations in attendance
- **Removed unnecessary tabs** - Cleaned up report tabs and unused sections
- **Training verification** - Enhanced attendance verification system

### 🎯 Role-Specific Features

#### Admin/Manager
- Full access to all modules and data
- User management and role assignment
- Financial tracking and analytics
- Discord webhook configuration
- Team and tournament management

#### Coach
- Team-specific data access
- Player performance tracking
- Attendance monitoring
- Training session management

#### Analyst
- Performance analytics and reporting
- Statistical analysis tools
- Trend monitoring
- Data export capabilities

#### Player
- Personal performance tracking
- Team information access
- Training attendance marking
- Simplified dashboard interface

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **Role-based access control** with granular permissions
- **Secure authentication** via Supabase Auth
- **API route protection** with middleware
- **Session management** with automatic token refresh

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- **Desktop** - Full feature access with optimized layouts
- **Tablet** - Adaptive layouts with touch-friendly interfaces
- **Mobile** - Streamlined interfaces with card-based layouts for better usability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed for Raptor Esports.

## 🏆 About Raptor Esports

Raptor Esports is a competitive gaming organization focused on excellence in esports competitions. This hub serves as the central management system for all team operations, performance tracking, and organizational activities.

---

**Built with ❤️ for Raptor Esports**
