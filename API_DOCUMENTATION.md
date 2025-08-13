# API Documentation

## Overview
The Raptor Esports Hub API provides RESTful endpoints for managing users, teams, performance data, finances, and Discord integration. All endpoints require authentication unless otherwise specified.

## Authentication
All API endpoints use Bearer token authentication via Supabase Auth.

```
Authorization: Bearer <supabase_access_token>
```

## Base URL
```
/api/
```

## Core Endpoints

### Users Management

#### GET /api/users
List all users with role-based filtering.

**Permissions**: Admin, Manager
**Query Parameters**:
- `role` (optional) - Filter by user role
- `team_id` (optional) - Filter by team

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com", 
      "name": "User Name",
      "role": "player",
      "team_id": "uuid",
      "onboarding_completed": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### PUT /api/users/[id]
Update user information.

**Permissions**: Admin, Manager, or self
**Body**:
```json
{
  "name": "Updated Name",
  "role": "player",
  "team_id": "uuid"
}
```

### Teams Management

#### GET /api/teams
List all teams.

**Permissions**: All authenticated users
**Response**:
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "Team Alpha",
      "tier": "T1",
      "status": "active",
      "coach_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/teams
Create a new team.

**Permissions**: Admin, Manager
**Body**:
```json
{
  "name": "New Team",
  "tier": "T2",
  "coach_id": "uuid"
}
```

### Performance Tracking

#### GET /api/performances
Get performance data with filtering.

**Permissions**: Role-based access
**Query Parameters**:
- `player_id` (optional) - Filter by player
- `team_id` (optional) - Filter by team
- `days` (optional) - Number of days to look back
- `limit` (optional) - Number of results

**Response**:
```json
{
  "performances": [
    {
      "id": "uuid",
      "player_id": "uuid",
      "team_id": "uuid",
      "match_type": "tournament",
      "map": "Sanhok",
      "kills": 8,
      "assists": 2,
      "damage": 1245,
      "survival_time": 1800,
      "placement": 3,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/performances
Submit new performance data.

**Permissions**: Player (own data), Coach, Manager, Admin
**Body**:
```json
{
  "match_type": "practice",
  "map": "Erangel", 
  "kills": 5,
  "assists": 1,
  "damage": 980,
  "survival_time": 1500,
  "placement": 1
}
```

### Session & Attendance

#### GET /api/sessions
Get practice sessions.

**Permissions**: All authenticated users
**Response**:
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Team Practice",
      "session_type": "practice",
      "start_time": "2024-01-01T18:00:00Z",
      "end_time": "2024-01-01T20:00:00Z",
      "team_id": "uuid"
    }
  ]
}
```

#### POST /api/sessions/mark-attendance
Mark attendance for a session.

**Permissions**: All authenticated users
**Body**:
```json
{
  "session_id": "uuid",
  "status": "present"
}
```

### Financial Management

#### GET /api/expenses
Get expense records.

**Permissions**: Admin, Manager
**Response**:
```json
{
  "expenses": [
    {
      "id": "uuid",
      "amount": 100.00,
      "description": "Tournament slot fee",
      "category": "tournament",
      "team_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/expenses
Add new expense.

**Permissions**: Admin, Manager
**Body**:
```json
{
  "amount": 150.00,
  "description": "Equipment purchase",
  "category": "equipment",
  "team_id": "uuid"
}
```

#### GET /api/winnings
Get tournament winnings.

**Permissions**: Admin, Manager
**Response**:
```json
{
  "winnings": [
    {
      "id": "uuid",
      "amount": 500.00,
      "tournament": "Weekly Championship",
      "placement": 1,
      "team_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Discord Integration

#### GET /api/discord-portal/webhooks
Get Discord webhooks.

**Permissions**: Admin, Manager
**Response**:
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "name": "Team Notifications",
      "url": "https://discord.com/api/webhooks/...",
      "team_id": "uuid",
      "active": true
    }
  ]
}
```

#### POST /api/discord-portal/webhooks
Create Discord webhook.

**Permissions**: Admin, Manager
**Body**:
```json
{
  "name": "New Webhook",
  "url": "https://discord.com/api/webhooks/...",
  "team_id": "uuid"
}
```

### Profile Management

#### GET /api/profile
Get current user's profile.

**Permissions**: Authenticated user
**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name", 
  "role": "player",
  "team_id": "uuid",
  "onboarding_completed": true,
  "bio": "Player bio",
  "contact_number": "+1234567890",
  "experience": "intermediate"
}
```

#### PUT /api/profile
Update current user's profile.

**Permissions**: Authenticated user
**Body**:
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "contact_number": "+1234567890"
}
```

### Agreement System

#### GET /api/agreements
Get user agreements.

**Permissions**: Authenticated user
**Response**:
```json
{
  "agreements": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "player",
      "agreement_version": 1,
      "status": "accepted",
      "accepted_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/agreements
Accept an agreement.

**Permissions**: Authenticated user
**Body**:
```json
{
  "role": "player",
  "version": 1,
  "status": "accepted"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Error Codes
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting
No rate limiting is currently implemented.

## Versioning
API is currently v1. Future versions will be prefixed with version number.

## Authentication Details

### Getting Access Token
Use Supabase client to get the current session token:

```javascript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

### Token Refresh
Tokens are automatically refreshed by Supabase client. For manual refresh:

```javascript
const { data, error } = await supabase.auth.refreshSession()
```

## Role Permissions Summary

| Endpoint | Admin | Manager | Coach | Analyst | Player |
|----------|-------|---------|--------|---------|---------|
| GET /api/users | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /api/teams | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /api/performances | ✅ | ✅ | ✅ | ✅ | Own only |
| POST /api/performances | ✅ | ✅ | ✅ | ❌ | Own only |
| GET /api/expenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discord Webhooks | ✅ | ✅ | ❌ | ❌ | ❌ |

## Data Models

### User
```typescript
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'coach' | 'analyst' | 'player' | 'pending_player'
  team_id?: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
```

### Team
```typescript
interface Team {
  id: string
  name: string
  tier: 'God' | 'T1' | 'T2' | 'T3' | 'T4'
  status: 'active' | 'inactive'
  coach_id?: string
  created_at: string
}
```

### Performance
```typescript
interface Performance {
  id: string
  player_id: string
  team_id?: string
  match_type: 'practice' | 'tournament' | 'scrim'
  map?: string
  kills: number
  assists: number
  damage: number
  survival_time: number
  placement: number
  created_at: string
}
```

## Team Monthly Stats

- Endpoint: `GET /api/teams/monthly?month=YYYY-MM&teamId=uuid`
  - Auth: Bearer token
  - RBAC: admin/manager (all teams), coach (own team only)
  - Response: `team_monthly_stats[]`

- Endpoint: `POST /api/teams/monthly`
  - Auth: Bearer token
  - RBAC: admin/manager only
  - Body:
    ```json
    {
      "teamId": "uuid",
      "month": "YYYY-MM",
      "currentTier": "T1|T2|T3|T4|godtier",
      "slotsPlayed": 0,
      "slotsWon": 0,
      "slotPricePerSlot": 0,
      "slotCostPerSlot": 0,
      "trialPhase": "none|trial|extended",
      "trialWeeksUsed": 0,
      "tournamentWinnings": 0
    }
    ```
  - Response: `{ data, outcome }` where `outcome` contains tier/status and incentive distribution.

---

For additional support or questions about the API, please contact the development team.
