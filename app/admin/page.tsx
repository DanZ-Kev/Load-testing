'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlassCard, 
  GlassButton, 
  GlassBadge, 
  GlassPanel,
  GlassSkeleton 
} from '@/components/ui/glass';
import { 
  Users, 
  Server, 
  Shield, 
  BarChart3, 
  Settings, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Database,
  Network,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  Key,
  Eye,
  Lock,
  RefreshCw,
  Code
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalNodes: number;
  activeNodes: number;
  totalTests: number;
  runningTests: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: Date;
  securityScore: number;
  uptime: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    // Load admin data
    loadAdminData();
  }, [session, status, router]);

  const loadAdminData = async () => {
    try {
      // TODO: Replace with actual API calls
      // For now, using mock data
      setAdminStats({
        totalUsers: 1247,
        activeUsers: 892,
        totalNodes: 8,
        activeNodes: 7,
        totalTests: 15420,
        runningTests: 23,
        systemHealth: 'healthy',
        lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        securityScore: 94,
        uptime: 99.97
      });

      setRecentActivity([
        { id: 1, action: 'User registered', user: 'john.doe@example.com', time: '2 minutes ago', type: 'info' },
        { id: 2, action: 'Load test completed', user: 'admin@company.com', time: '5 minutes ago', type: 'success' },
        { id: 3, action: 'Node maintenance', user: 'system', time: '15 minutes ago', type: 'warning' },
        { id: 4, action: 'Security scan completed', user: 'system', time: '1 hour ago', type: 'success' },
        { id: 5, action: 'Backup completed', user: 'system', time: '6 hours ago', type: 'info' }
      ]);

      setSystemAlerts([
        { id: 1, type: 'warning', message: 'Node EU-West-2 showing high latency', time: '10 minutes ago' },
        { id: 2, type: 'info', message: 'Daily backup scheduled for tonight', time: '1 hour ago' },
        { id: 3, type: 'success', message: 'Security scan passed all checks', time: '2 hours ago' }
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setIsLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'users',
      title: 'Manage Users',
      description: 'Add, edit, or remove user accounts',
      icon: <Users className="w-6 h-6" />,
      action: () => router.push('/admin/users'),
      variant: 'primary'
    },
    {
      id: 'nodes',
      title: 'Node Management',
      description: 'Configure testing infrastructure',
      icon: <Server className="w-6 h-6" />,
      action: () => router.push('/admin/nodes'),
      variant: 'secondary'
    },
    {
      id: 'scripts',
      title: 'Script Editor',
      description: 'Create and manage load test scripts',
      icon: <Code className="w-6 h-6" />,
      action: () => router.push('/admin/scripts'),
      variant: 'success'
    },
    {
      id: 'security',
      title: 'Security Center',
      description: 'Monitor security events and settings',
      icon: <Shield className="w-6 h-6" />,
      action: () => router.push('/admin/security'),
      variant: 'warning'
    },
    {
      id: 'analytics',
      title: 'System Analytics',
      description: 'View detailed performance metrics',
      icon: <BarChart3 className="w-6 h-6" />,
      action: () => router.push('/admin/analytics'),
      variant: 'info'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure global system options',
      icon: <Settings className="w-6 h-6" />,
      action: () => router.push('/admin/settings'),
      variant: 'secondary'
    }
  ];

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <GlassSkeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <GlassSkeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassSkeleton className="h-80" />
            <GlassSkeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!adminStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Failed to load admin data</h1>
          <GlassButton onClick={loadAdminData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Dashboard 🛠️
            </h1>
            <p className="text-white/60">
              Welcome back, {session?.user?.email}. Manage your load testing platform.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <GlassButton variant="secondary" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </GlassButton>
            <GlassButton size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Quick Settings
            </GlassButton>
          </div>
        </motion.div>

        {/* System Health Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{adminStats.totalUsers.toLocaleString()}</p>
                <p className="text-green-400 text-sm mt-1">{adminStats.activeUsers} active</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Testing Nodes</p>
                <p className="text-3xl font-bold text-white mt-1">{adminStats.totalNodes}</p>
                <p className="text-green-400 text-sm mt-1">{adminStats.activeNodes} active</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Load Tests</p>
                <p className="text-3xl font-bold text-white mt-1">{adminStats.totalTests.toLocaleString()}</p>
                <p className="text-blue-400 text-sm mt-1">{adminStats.runningTests} running</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">System Health</p>
                <div className="flex items-center gap-2 mt-1">
                  <GlassBadge variant={getHealthColor(adminStats.systemHealth) as any}>
                    {adminStats.systemHealth}
                  </GlassBadge>
                  {getHealthIcon(adminStats.systemHealth)}
                </div>
                <p className="text-green-400 text-sm mt-1">{adminStats.uptime}% uptime</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            >
              <GlassCard 
                className="p-6 text-center hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                onClick={action.action}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  action.variant === 'primary' ? 'bg-blue-500/20 group-hover:bg-blue-500/30' :
                  action.variant === 'secondary' ? 'bg-purple-500/20 group-hover:bg-purple-500/30' :
                  action.variant === 'success' ? 'bg-green-500/20 group-hover:bg-green-500/30' :
                  action.variant === 'warning' ? 'bg-yellow-500/20 group-hover:bg-yellow-500/30' :
                  action.variant === 'error' ? 'bg-red-500/20 group-hover:bg-red-500/30' :
                  'bg-indigo-500/20 group-hover:bg-indigo-500/30'
                }`}>
                  {action.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                <p className="text-white/60 text-sm">{action.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* System Status & Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Recent Activity */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <GlassButton variant="secondary" size="sm">
                View All
              </GlassButton>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-yellow-500' :
                    activity.type === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.action}</p>
                    <p className="text-white/60 text-xs">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* System Alerts */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">System Alerts</h3>
              <GlassButton variant="secondary" size="sm">
                Manage Alerts
              </GlassButton>
            </div>
            <div className="space-y-4">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'success' ? 'bg-green-500' :
                    alert.type === 'warning' ? 'bg-yellow-500' :
                    alert.type === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{alert.message}</p>
                    <p className="text-white/60 text-xs">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Security & Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Security Score</h3>
            <p className="text-3xl font-bold text-green-400">{adminStats.securityScore}/100</p>
            <p className="text-white/60 text-sm mt-1">Excellent</p>
          </GlassCard>

          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Last Backup</h3>
            <p className="text-2xl font-bold text-blue-400">
              {adminStats.lastBackup.toLocaleTimeString('en-US', { hour12: false })}
            </p>
            <p className="text-white/60 text-sm mt-1">6 hours ago</p>
          </GlassCard>

          <GlassCard className="p-6 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">System Uptime</h3>
            <p className="text-3xl font-bold text-purple-400">{adminStats.uptime}%</p>
            <p className="text-white/60 text-sm mt-1">High Availability</p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}