'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlassCard, 
  GlassButton, 
  GlassBadge, 
  GlassPanel,
  GlassSkeleton 
} from '@/components/ui/glass';
import { 
  Play, 
  Pause, 
  Stop, 
  Plus, 
  Activity, 
  Users, 
  Clock, 
  TrendingUp,
  Server,
  Zap,
  Shield,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useRealTimeData } from '@/lib/hooks/useRealTimeData';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Real-time data hook
  const {
    systemMetrics,
    activeTests,
    nodeStatus,
    globalStats,
    isConnected,
    lastUpdate,
    error,
    getActiveTestsCount,
    getActiveNodesCount,
    getTotalConcurrentUsers,
    connectWebSocket,
    disconnectWebSocket
  } = useRealTimeData();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'queued': return 'warning';
      case 'completed': return 'info';
      case 'failed': return 'error';
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'offline': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4" />;
      case 'queued': return <Clock className="w-4 h-4" />;
      case 'completed': return <TrendingUp className="w-4 h-4" />;
      case 'failed': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const handleTestAction = (testId: string, action: string) => {
    console.log(`${action} test ${testId}`);
    // TODO: Implement actual test control actions via WebSocket
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (startedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - startedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Prepare chart data for system metrics
  const chartData = systemMetrics.slice(-24).map(metric => ({
    time: new Date(metric.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    cpu: metric.cpu,
    memory: metric.memory,
    network: metric.network
  }));

  // Prepare daily test volume data
  const dailyTestData = [
    { day: 'Mon', tests: 45 },
    { day: 'Tue', tests: 52 },
    { day: 'Wed', tests: 48 },
    { day: 'Thu', tests: 67 },
    { day: 'Fri', tests: 73 },
    { day: 'Sat', tests: 38 },
    { day: 'Sun', tests: 42 }
  ];

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
              Welcome back, {session?.user?.email || 'User'}! 👋
            </h1>
            <p className="text-white/60">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} • {currentTime.toLocaleTimeString('en-US', { 
                hour12: false 
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <GlassBadge variant="success" className="flex items-center gap-2">
                  <Wifi className="w-3 h-3" />
                  Live
                </GlassBadge>
              ) : (
                <GlassBadge variant="error" className="flex items-center gap-2">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </GlassBadge>
              )}
              {lastUpdate && (
                <span className="text-xs text-white/40">
                  Last: {lastUpdate.toLocaleTimeString('en-US', { hour12: false })}
                </span>
              )}
            </div>
            
            <GlassButton 
              variant="secondary" 
              size="sm"
              onClick={isConnected ? disconnectWebSocket : connectWebSocket}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isConnected ? 'animate-spin' : ''}`} />
              {isConnected ? 'Disconnect' : 'Connect'}
            </GlassButton>
            
            <GlassButton variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Test
            </GlassButton>
            
            <GlassButton size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </GlassButton>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg"
            >
              <p className="text-sm text-red-200">
                <strong>Connection Error:</strong> {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Active Tests</p>
                <p className="text-3xl font-bold text-white mt-1">{getActiveTestsCount()}</p>
                <p className="text-green-400 text-sm mt-1">+2 from yesterday</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{globalStats.uniqueUsers.toLocaleString()}</p>
                <p className="text-green-400 text-sm mt-1">+156 this week</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Success Rate</p>
                <p className="text-3xl font-bold text-white mt-1">98.7%</p>
                <p className="text-green-400 text-sm mt-1">+0.3% improvement</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Avg Response</p>
                <p className="text-3xl font-bold text-white mt-1">127ms</p>
                <p className="text-red-400 text-sm mt-1">+12ms from avg</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* System Performance Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">System Performance</h3>
              <GlassBadge variant="info">
                {isConnected ? 'Live' : 'Mock Data'}
              </GlassBadge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="time" 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="network" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-white/60">CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-white/60">Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-white/60">Network</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Daily Test Volume</h3>
              <GlassBadge variant="success">+12%</GlassBadge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTestData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar 
                  dataKey="tests" 
                  fill="url(#gradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Active Tests & Node Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Active Tests */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Active Tests</h3>
              <GlassBadge variant="warning">{getActiveTestsCount()} Running</GlassBadge>
            </div>
            <div className="space-y-4">
              {activeTests.length > 0 ? (
                activeTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(test.status)}
                        <h4 className="font-medium text-white">{test.name}</h4>
                        <GlassBadge variant={getStatusColor(test.status) as any}>
                          {test.status}
                        </GlassBadge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>{test.users} users</span>
                        <span>{test.status === 'running' ? formatDuration(test.startedAt) : test.duration}</span>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded">
                          {test.method} {test.targetUrl}
                        </span>
                      </div>
                      {test.status === 'running' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                            <span>Progress</span>
                            <span>{test.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${test.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {test.status === 'running' && (
                        <>
                          <GlassButton 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTestAction(test.id, 'pause')}
                          >
                            <Pause className="w-3 h-3" />
                          </GlassButton>
                          <GlassButton 
                            size="sm" 
                            variant="error"
                            onClick={() => handleTestAction(test.id, 'stop')}
                          >
                            <Stop className="w-3 h-3" />
                          </GlassButton>
                        </>
                      )}
                      {test.status === 'queued' && (
                        <GlassButton 
                          size="sm" 
                          variant="error"
                          onClick={() => handleTestAction(test.id, 'cancel')}
                        >
                          <Stop className="w-3 h-3" />
                        </GlassButton>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/40">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active tests</p>
                  <p className="text-sm">Start a new test to see it here</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Node Status */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Node Status</h3>
              <GlassBadge variant="info">{getActiveNodesCount()} Active</GlassBadge>
            </div>
            <div className="space-y-4">
              {nodeStatus.length > 0 ? (
                nodeStatus.map((node) => (
                  <div key={node.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        node.status === 'active' ? 'bg-green-500' :
                        node.status === 'maintenance' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-white">{node.name}</h4>
                        <p className="text-sm text-white/60">{node.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/60">Load: {node.load}%</div>
                      <div className="text-sm text-white/60">{node.users} / {node.maxConcurrent}</div>
                      <div className="text-xs text-white/40">
                        {new Date(node.lastHealthCheck).toLocaleTimeString('en-US', { hour12: false })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/40">
                  <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No nodes available</p>
                  <p className="text-sm">Check your infrastructure setup</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <GlassCard className="p-6 text-center hover:bg-white/10 transition-all duration-300 cursor-pointer group">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-all duration-300">
              <Play className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start New Test</h3>
            <p className="text-white/60 text-sm">Create and configure a new load test</p>
          </GlassCard>

          <GlassCard className="p-6 text-center hover:bg-white/10 transition-all duration-300 cursor-pointer group">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/30 transition-all duration-300">
              <Server className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Manage Nodes</h3>
            <p className="text-sm text-white/60">Configure testing infrastructure</p>
          </GlassCard>

          <GlassCard className="p-6 text-center hover:bg-white/10 transition-all duration-300 cursor-pointer group">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-all duration-300">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Security</h3>
            <p className="text-white/60 text-sm">View security logs and settings</p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}