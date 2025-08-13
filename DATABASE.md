# 🗄️ Database Schema Documentation

This document outlines the complete database schema for the Raptors Esports CRM system.

## 📊 **Schema Overview**

The system uses **PostgreSQL** via Supabase with **25+ tables** covering all aspects of esports team management:

- **Core System**: Users, teams, profiles, configurations
- **Performance**: Match data, statistics, analytics
- **Attendance**: Session tracking, schedules, holidays
- **Finance**: Expenses, winnings, profit/loss
- **Tryouts**: Applications, evaluations, selections
- **Communication**: Discord integration, logs, settings

---

## 🔐 **Core Tables**

### **users**
Primary user table with role-based access control.
```sql
- id: uuid (Primary Key)
- email: text (Unique)
- name: text
- role: enum (admin, manager, coach, analyst, player, pending_player)
- team_id: uuid (Foreign Key -> teams.id)
- status: enum (Active, Benched, On Leave, Discontinued)
- device_info, contact_number, etc.
```

### **teams**
Team management with coach assignments.
```sql
- id: uuid (Primary Key)
- name: text
- tier: text (God, T1, T2, T3, T4)
- coach_id: uuid (Foreign Key -> users.id)
- status: enum (active, inactive, suspended)
```

### **profiles**
Extended user profile information.
```sql
- id: bigint (Primary Key)
- user_id: uuid (Foreign Key -> auth.users.id)
- display_name, bio, experience, preferred_role, etc.
```

---

## 🎯 **Performance Tables**

### **performances**
Match performance data tracking.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- player_id: uuid (Foreign Key -> users.id)
- match_number: integer
- map: text
- placement: integer
- kills, assists, damage, survival_time: numeric
- slot: text
- added_by: uuid (Foreign Key -> users.id)
```

### **slots**
Tournament slot management.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- organizer: text
- time_range: text
- match_count: integer
- number_of_slots: integer
- slot_rate: integer
- notes: text
- date: date
```

---

## 📅 **Attendance Tables**

### **sessions**
Session management for practices, tournaments, meetings.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- session_type: enum (practice, tournament, meeting)
- session_subtype: text
- date: date
- start_time, end_time, cutoff_time: time
- title, description: text
- is_mandatory: boolean
- created_by: uuid (Foreign Key -> users.id)
```

### **attendances**
Individual attendance records.
```sql
- id: uuid (Primary Key)
- player_id: uuid (Foreign Key -> users.id)
- team_id: uuid (Foreign Key -> teams.id)
- session_id: uuid (Foreign Key -> sessions.id)
- date: date
- session_time: text
- status: enum (present, late, absent, auto)
- source: enum (manual, auto, system)
- marked_by: uuid (Foreign Key -> users.id)
```

### **holidays**
Holiday management for attendance.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id) [nullable for global holidays]
- date: date
- name: text
- recurring_day: integer (0-6 for weekly recurring)
- is_active: boolean
```

### **practice_session_config**
Practice session time configurations.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- session_subtype: enum (Morning, Evening, Night)
- start_time, end_time, cutoff_time: time
- is_active: boolean
```

---

## 💰 **Finance Tables**

### **slot_expenses**
Tournament slot cost tracking.
```sql
- id: uuid (Primary Key)
- slot_id: uuid (Foreign Key -> slots.id)
- team_id: uuid (Foreign Key -> teams.id)
- rate: integer
- number_of_slots: integer
- total: integer
```

### **winnings**
Prize money tracking.
```sql
- id: uuid (Primary Key)
- slot_id: uuid (Foreign Key -> slots.id)
- team_id: uuid (Foreign Key -> teams.id)
- position: integer
- amount_won: integer
```

### **prize_pools**
Tournament prize pool information.
```sql
- id: uuid (Primary Key)
- slot_id: uuid (Foreign Key -> slots.id)
- total_amount: integer
- breakdown: jsonb
```

### **tier_defaults**
Default slot rates by team tier.
```sql
- id: uuid (Primary Key)
- tier: text (Unique)
- default_slot_rate: integer
```

---

## 🎮 **Tryouts System**

### **tryouts**
Tryout campaign management.
```sql
- id: uuid (Primary Key)
- name: text
- purpose: enum (new_team, existing_team, role_based)
- target_roles: text[]
- team_ids: uuid[]
- type: enum (scrim, tournament, practice, meeting)
- open_to_public: boolean
- application_deadline: timestamptz
- evaluation_method: enum (manual, automated, mixed)
- status: enum (draft, active, closed, completed, archived)
- created_by: uuid (Foreign Key -> users.id)
```

### **tryout_applications**
Public applications for tryouts.
```sql
- id: uuid (Primary Key)
- tryout_id: uuid (Foreign Key -> tryouts.id)
- full_name, ign, discord_tag: text
- role_applied_for: text
- availability: text[]
- highlights_links: text[]
- contact_email, contact_phone: text
- status: enum (applied, screened, shortlisted, rejected, withdrawn)
- screened_by: uuid (Foreign Key -> users.id)
```

### **tryout_invitations**
Invitations for shortlisted candidates.
```sql
- id: uuid (Primary Key)
- tryout_id: uuid (Foreign Key -> tryouts.id)
- application_id: uuid (Foreign Key -> tryout_applications.id)
- invited_by: uuid (Foreign Key -> users.id)
- status: enum (invited, accepted, declined, expired)
- temporary_access_granted: boolean
- temp_user_id: uuid (Foreign Key -> users.id)
```

### **tryout_sessions**
Evaluation sessions for candidates.
```sql
- id: uuid (Primary Key)
- tryout_id: uuid (Foreign Key -> tryouts.id)
- invitation_id: uuid (Foreign Key -> tryout_invitations.id)
- session_type: enum (scrim, tournament, practice, meeting, custom)
- scheduled_date: date
- status: enum (scheduled, in_progress, completed, cancelled, no_show)
- attendance_status: enum (present, late, absent, excused)
```

### **tryout_evaluations**
Performance evaluations for candidates.
```sql
- id: uuid (Primary Key)
- tryout_id: uuid (Foreign Key -> tryouts.id)
- invitation_id: uuid (Foreign Key -> tryout_invitations.id)
- evaluator_id: uuid (Foreign Key -> users.id)
- kills, assists, damage, survival_time: numeric
- game_sense_score, utility_score, etc.: integer (1-10)
- overall_score: numeric
- recommendation: enum (strong_select, select, maybe, reject, strong_reject)
```

### **tryout_selections**
Final selection decisions.
```sql
- id: uuid (Primary Key)
- tryout_id: uuid (Foreign Key -> tryouts.id)
- application_id: uuid (Foreign Key -> tryout_applications.id)
- selected_by: uuid (Foreign Key -> users.id)
- selection_status: enum (selected, rejected, extended, pending)
- assigned_team_id: uuid (Foreign Key -> teams.id)
- assigned_role: text
- player_type: enum (main, sub, support)
```

---

## 💬 **Communication Tables**

### **discord_webhooks**
Discord webhook management.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- hook_url: text
- type: enum (team, admin, global)
- active: boolean
- channel_name: text
- created_by: uuid (Foreign Key -> users.id)
```

### **communication_logs**
Message delivery tracking.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- webhook_id: uuid (Foreign Key -> discord_webhooks.id)
- message_type: text
- status: enum (success, failed, pending, retry)
- payload: jsonb
- response_code: integer
- error_message: text
- retry_count: integer
```

### **communication_settings**
Team communication preferences.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- setting_key: text
- setting_value: boolean
- updated_by: uuid (Foreign Key -> users.id)
```

---

## ⚙️ **System Tables**

### **admin_config**
System-wide configuration.
```sql
- key: text (Primary Key)
- value: text
```

### **module_permissions**
Role-based module access control.
```sql
- id: integer (Primary Key)
- role: text
- module: text
- can_access: boolean
```

### **user_agreements**
Role agreement tracking.
```sql
- id: uuid (Primary Key)
- user_id: uuid (Foreign Key -> users.id)
- role: text
- agreement_version: integer
- status: enum (accepted, pending, declined)
- ip_address: inet
- user_agent: text
```

### **rosters**
Team roster management.
```sql
- id: uuid (Primary Key)
- team_id: uuid (Foreign Key -> teams.id)
- user_id: uuid (Foreign Key -> users.id)
- in_game_role: text
- contact_number: text
- device_info: text
```

---

## 🔗 **Key Relationships**

### **User-Team Hierarchy**
- Users belong to teams (users.team_id -> teams.id)
- Teams have coaches (teams.coach_id -> users.id)
- Rosters link users to teams with additional info

### **Performance Tracking**
- Performances link players to teams and slots
- Slots track tournament participation
- Expenses and winnings connect to slots

### **Attendance Flow**
- Sessions define when attendance is required
- Attendances record individual participation
- Practice configs set team-specific schedules

### **Tryout Workflow**
- Applications -> Invitations -> Sessions -> Evaluations -> Selections
- Temporary user accounts for tryout participants

---

## 🔒 **Security & RLS**

### **Row Level Security**
All tables implement RLS policies:
- Users see only their team's data (except admins)
- Coaches access only assigned team information
- Players view only personal and team data

### **Authentication**
- JWT-based authentication via Supabase Auth
- Role-based access control at API level
- Secure profile creation with conflict resolution

---

## 📈 **Indexes & Performance**

### **Key Indexes**
- `users(team_id, role)` - Role-based queries
- `performances(team_id, created_at)` - Team performance lookups
- `attendances(session_id)` - Session attendance queries
- `sessions(team_id, date)` - Team session lookups

### **Optimization**
- Composite indexes for common query patterns
- Foreign key indexes for join performance
- Date-based indexes for time-range queries

---

## 🔄 **Data Flow**

### **Performance Entry**
1. User submits performance data
2. System validates team membership
3. Creates performance record
4. Auto-generates session and attendance

### **Attendance Tracking**
1. Sessions created for teams
2. Players mark attendance
3. System tracks status and timing
4. Reports generated for analysis

### **Tryout Process**
1. Public applications submitted
2. Staff screen and shortlist
3. Invitations sent to candidates
4. Evaluation sessions conducted
5. Final selections made

---

**Database Schema Version**: 2025.01 - Production Ready ✅

### **team_monthly_stats**
Monthly snapshot for tiering and incentives.
```sql
- id: uuid (PK)
- team_id: uuid (FK -> teams.id)
- month: text (YYYY-MM, unique with team)
- current_tier: text
- slots_played: int, slots_won: int
- slot_price_per_slot: int, slot_cost_per_slot: int
- trial_phase: text, trial_weeks_used: int
- tournament_winnings: int
- win_percentage: numeric
- updated_tier: text
- status_update: text (promoted|retained|demoted|exited)
- sponsorship_status: text (trial|sponsored|exited|none)
- trial_extension_granted: boolean, trial_extension_weeks: int
- monthly_prize_pool: int, monthly_cost: int, surplus: int
- org_share: int, team_share: int, split_rule: text
- recalculated_at, created_by, created_at, updated_at
```

RLS:
- admin/manager: full access
- coach: read own team only
