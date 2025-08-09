import { Metadata } from 'next'
import { Suspense } from 'react'
import { 
  Activity, 
  Server, 
  Users, 
  FileCode,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, StatusCard, SkeletonCard } from '@/components/ui/Card'
import { StatusBadge, MetricBadge, ResourceBadge } from '@/components/ui/StatusBadge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatsOverview } from '@/components/dashboard/StatsOverview'
import { ActiveJobsCard } from '@/components/dashboard/ActiveJobsCard'
import { NodeStatusCard } from '@/components/dashboard/NodeStatusCard'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { SystemHealthCard } from '@/components/dashboard/SystemHealthCard'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Load testing administration dashboard overview',
}

// Mock data - In real app, this would come from API calls
const mockStats = {
  totalNodes: 12,
  activeNodes: 10,
  totalJobs: 156,
  activeJobs: 3,
  totalScripts: 24,
  successRate: 94.5,
  avgResponseTime: 245,
  testsRun: 1247,
}

const mockActiveJobs = [
  {
    id: 'job-1',
    name: 'API Stress Test',
    status: 'running' as const,
    progress: 67,
    startTime: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    estimatedCompletion: new Date(Date.now() + 1000 * 60 * 8), // 8 minutes from now
    nodeCount: 3,
    requestsPerSecond: 150,
  },
  {
    id: 'job-2',
    name: 'User Registration Flow',
    status: 'running' as const,
    progress: 23,
    startTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    estimatedCompletion: new Date(Date.now() + 1000 * 60 * 20), // 20 minutes from now
    nodeCount: 2,
    requestsPerSecond: 75,
  },
  {
    id: 'job-3',
    name: 'Database Load Test',
    status: 'pending' as const,
    progress: 0,
    startTime: new Date(Date.now() + 1000 * 60 * 2), // 2 minutes from now
    estimatedCompletion: new Date(Date.now() + 1000 * 60 * 32), // 32 minutes from now
    nodeCount: 4,
    requestsPerSecond: 0,
  },
]

const mockNodes = [
  {
    id: 'node-1',
    name: 'Worker-US-East-1',
    status: 'online' as const,
    location: 'US East',
    cpu: 45,
    memory: 62,
    disk: 28,
    network: 15,
    uptime: '12d 4h',
    lastSeen: new Date(),
  },
  {
    id: 'node-2',
    name: 'Worker-US-West-1',
    status: 'online' as const,
    location: 'US West',
    cpu: 23,
    memory: 38,
    disk: 15,
    network: 8,
    uptime: '8d 16h',
    lastSeen: new Date(),
  },
  {
    id: 'node-3',
    name: 'Worker-EU-1',
    status: 'offline' as const,
    location: 'Europe',
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    uptime: '0h',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
]

const mockRecentActivity = [
  {
    id: '1',
    type: 'job_completed' as const,
    message: 'Load test "Authentication API" completed successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    user: 'admin@example.com',
    metadata: { duration: '12m 34s', requests: 15000, success_rate: '98.5%' },
  },
  {
    id: '2', 
    type: 'node_connected' as const,
    message: 'Worker node "Worker-EU-2" connected',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    user: 'system',
    metadata: { location: 'Frankfurt', version: '2.1.0' },
  },
  {
    id: '3',
    type: 'script_uploaded' as const,
    message: 'New test script "checkout-flow.js" uploaded',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'developer@example.com',
    metadata: { version: '1.2.0', size: '4.2KB' },
  },
]

const mockPerformanceData = [
  { name: 'Jan', requests: 45000, responseTime: 234, errors: 145 },
  { name: 'Feb', requests: 52000, responseTime: 245, errors: 167 },
  { name: 'Mar', requests: 48000, responseTime: 223, errors: 134 },
  { name: 'Apr', requests: 61000, responseTime: 267, errors: 198 },
  { name: 'May', requests: 58000, responseTime: 243, errors: 156 },
  { name: 'Jun', requests: 69000, responseTime: 251, errors: 178 },
]

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <DashboardHeader />
      
      <Suspense fallback={<PageLoading message="Loading dashboard..." />}>
        {/* Key Metrics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Active Nodes"
            value={`${mockStats.activeNodes}/${mockStats.totalNodes}`}
            status="success"
            icon={<Server className="h-5 w-5" />}
            change={{ value: 8.3, type: 'increase', period: '24h' }}
          />
          
          <StatusCard
            title="Running Jobs"
            value={mockStats.activeJobs}
            status="info"
            icon={<Activity className="h-5 w-5" />}
            change={{ value: 2.1, type: 'decrease', period: '24h' }}
          />
          
          <StatusCard
            title="Success Rate"
            value={`${mockStats.successRate}%`}
            status="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            change={{ value: 1.2, type: 'increase', period: '7d' }}
          />
          
          <StatusCard
            title="Avg Response"
            value={`${mockStats.avgResponseTime}ms`}
            status={mockStats.avgResponseTime > 300 ? "warning" : "success"}
            icon={<TrendingUp className="h-5 w-5" />}
            change={{ value: 5.7, type: 'decrease', period: '24h' }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Jobs */}
          <div className="lg:col-span-2">
            <ActiveJobsCard jobs={mockActiveJobs} />
          </div>
          
          {/* System Health */}
          <div className="space-y-6">
            <SystemHealthCard />
            <NodeStatusCard nodes={mockNodes.slice(0, 3)} />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={mockPerformanceData} />
          </div>
          
          {/* Recent Activity */}
          <RecentActivityCard activities={mockRecentActivity} />
        </div>

        {/* Additional Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scripts</CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.totalScripts}</div>
              <div className="flex items-center gap-2 mt-2">
                <MetricBadge
                  label="Active"
                  value={18}
                  variant="success"
                  size="sm"
                />
                <MetricBadge
                  label="Archived"
                  value={6}
                  variant="secondary"
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests Executed</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.testsRun.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground mt-2">
                Jobs waiting to start
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusBadge status="online" size="sm" />
                <span className="text-sm text-muted-foreground">All systems operational</span>
              </div>
              <div className="mt-3 space-y-1">
                <ResourceBadge type="cpu" usage={34} size="sm" />
                <ResourceBadge type="memory" usage={58} size="sm" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  )
}

// Loading component for the dashboard
export function DashboardPageSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} showHeader={true} />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonCard lines={6} showHeader={true} />
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={4} showHeader={true} />
          <SkeletonCard lines={4} showHeader={true} />
        </div>
      </div>

      {/* Chart section skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonCard lines={8} showHeader={true} />
        </div>
        <SkeletonCard lines={6} showHeader={true} />
      </div>
    </div>
  )
}