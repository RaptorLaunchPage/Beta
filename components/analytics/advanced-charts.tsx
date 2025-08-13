"use client"

import React from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316'
}

interface ChartProps {
  data: any[]
  height?: number
  className?: string
}

// Performance Trend Chart
export function PerformanceTrendChart({ data, height = 300, className = '' }: ChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="killsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="damageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="avgKills"
            stroke={COLORS.danger}
            fillOpacity={1}
            fill="url(#killsGradient)"
            name="Avg Kills"
          />
          <Area
            type="monotone"
            dataKey="avgDamage"
            stroke={COLORS.primary}
            fillOpacity={1}
            fill="url(#damageGradient)"
            name="Avg Damage"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Team Comparison Bar Chart
export function TeamComparisonChart({ data, height = 300, className = '' }: ChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="teamName" 
            stroke="#9CA3AF"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend />
          <Bar dataKey="avgKills" fill={COLORS.danger} name="Avg Kills" />
          <Bar dataKey="avgDamage" fill={COLORS.primary} name="Avg Damage" />
          <Bar dataKey="winRate" fill={COLORS.secondary} name="Win Rate %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Player Performance Radar Chart
export function PlayerRadarChart({ data, height = 300, className = '' }: ChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            domain={[0, 100]}
          />
          <Radar
            dataKey="value"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Map Performance Pie Chart
export function MapPerformanceChart({ data, height = 300, className = '' }: ChartProps) {
  const pieColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.danger, COLORS.purple, COLORS.pink, COLORS.teal, COLORS.orange]

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Kill Distribution Line Chart
export function KillDistributionChart({ data, height = 300, className = '' }: ChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="match" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="kills"
            stroke={COLORS.danger}
            strokeWidth={2}
            dot={{ fill: COLORS.danger, strokeWidth: 2, r: 4 }}
            name="Kills"
          />
          <Line
            type="monotone"
            dataKey="assists"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
            name="Assists"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Performance Metrics Summary Card
interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  trend = 'neutral',
  color = 'blue' 
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600'
  }

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  }

  return (
    <div className={`${colorClasses[color]} text-white rounded-lg p-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${trendColors[trend]}`}>
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className="opacity-80">
          {icon}
        </div>
      </div>
    </div>
  )
}