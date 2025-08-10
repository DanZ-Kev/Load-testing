import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface SystemMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  network: number;
  activeTests: number;
  totalUsers: number;
  successRate: number;
  avgResponseTime: number;
}

export interface ActiveTest {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  users: number;
  duration: string;
  targetUrl: string;
  method: string;
  concurrency: number;
  startedAt: Date;
}

export interface NodeStatus {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'maintenance' | 'offline' | 'error';
  load: number;
  users: number;
  maxConcurrent: number;
  lastHealthCheck: Date;
}

export interface RealTimeData {
  systemMetrics: SystemMetrics[];
  activeTests: ActiveTest[];
  nodeStatus: NodeStatus[];
  globalStats: {
    totalTests: number;
    uniqueUsers: number;
    peakConcurrent: number;
    dataTransferred: number;
  };
}

export function useRealTimeData() {
  const { data: session } = useSession();
  const [data, setData] = useState<RealTimeData>({
    systemMetrics: [],
    activeTests: [],
    nodeStatus: [],
    globalStats: {
      totalTests: 0,
      uniqueUsers: 0,
      peakConcurrent: 0,
      dataTransferred: 0
    }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!session?.user) return;

    try {
      // Connect to the WebSocket endpoint
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/api/realtime/monitor`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        // Send authentication token
        ws.send(JSON.stringify({
          type: 'auth',
          token: session.user.accessToken || 'mock-token'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'metrics_update':
              setData(prevData => ({
                ...prevData,
                systemMetrics: message.data.systemMetrics || prevData.systemMetrics,
                globalStats: message.data.globalStats || prevData.globalStats
              }));
              setLastUpdate(new Date());
              break;
              
            case 'tests_update':
              setData(prevData => ({
                ...prevData,
                activeTests: message.data.activeTests || prevData.activeTests
              }));
              setLastUpdate(new Date());
              break;
              
            case 'nodes_update':
              setData(prevData => ({
                ...prevData,
                nodeStatus: message.data.nodeStatus || prevData.nodeStatus
              }));
              setLastUpdate(new Date());
              break;
              
            case 'full_update':
              setData(message.data);
              setLastUpdate(new Date());
              break;
              
            case 'error':
              setError(message.message);
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Failed to parse server message');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to establish connection');
    }
  }, [session?.user]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect when session is available
  useEffect(() => {
    if (session?.user) {
      connectWebSocket();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, [session?.user, connectWebSocket, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Mock data fallback when WebSocket is not connected
  const getMockData = useCallback((): RealTimeData => {
    const now = new Date();
    const mockMetrics: SystemMetrics[] = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (23 - i) * 60 * 60 * 1000),
      cpu: Math.floor(Math.random() * 40) + 30,
      memory: Math.floor(Math.random() * 30) + 50,
      network: Math.floor(Math.random() * 40) + 20,
      activeTests: Math.floor(Math.random() * 20) + 5,
      totalUsers: Math.floor(Math.random() * 1000) + 1500,
      successRate: Math.floor(Math.random() * 5) + 95,
      avgResponseTime: Math.floor(Math.random() * 100) + 100
    }));

    const mockTests: ActiveTest[] = [
      {
        id: '1',
        name: 'API Stress Test',
        status: 'running',
        progress: Math.floor(Math.random() * 100),
        users: 250,
        duration: '2m 30s',
        targetUrl: 'https://api.example.com',
        method: 'GET',
        concurrency: 100,
        startedAt: new Date(now.getTime() - 2 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Website Load Test',
        status: 'running',
        progress: Math.floor(Math.random() * 100),
        users: 500,
        duration: '1m 15s',
        targetUrl: 'https://website.com',
        method: 'POST',
        concurrency: 200,
        startedAt: new Date(now.getTime() - 1 * 60 * 1000)
      },
      {
        id: '3',
        name: 'Database Performance',
        status: 'queued',
        progress: 0,
        users: 100,
        duration: '0s',
        targetUrl: 'https://db.example.com',
        method: 'GET',
        concurrency: 50,
        startedAt: now
      }
    ];

    const mockNodes: NodeStatus[] = [
      {
        id: '1',
        name: 'US-East-1',
        location: 'Virginia, USA',
        status: 'active',
        load: Math.floor(Math.random() * 40) + 30,
        users: Math.floor(Math.random() * 200) + 300,
        maxConcurrent: 1000,
        lastHealthCheck: new Date(now.getTime() - 30 * 1000)
      },
      {
        id: '2',
        name: 'EU-West-1',
        location: 'Ireland',
        status: 'active',
        load: Math.floor(Math.random() * 40) + 20,
        users: Math.floor(Math.random() * 200) + 200,
        maxConcurrent: 800,
        lastHealthCheck: new Date(now.getTime() - 30 * 1000)
      },
      {
        id: '3',
        name: 'Asia-Pacific',
        location: 'Tokyo, Japan',
        status: 'maintenance',
        load: 0,
        users: 0,
        maxConcurrent: 600,
        lastHealthCheck: new Date(now.getTime() - 5 * 60 * 1000)
      }
    ];

    return {
      systemMetrics: mockMetrics,
      activeTests: mockTests,
      nodeStatus: mockNodes,
      globalStats: {
        totalTests: 2847,
        uniqueUsers: 1247,
        peakConcurrent: 750,
        dataTransferred: 1024 * 1024 * 1024 * 50 // 50 GB
      }
    };
  }, []);

  // Return mock data if not connected, real data if connected
  const currentData = isConnected ? data : getMockData();

  // Helper functions for dashboard
  const getLatestMetrics = useCallback(() => {
    if (currentData.systemMetrics.length === 0) return null;
    return currentData.systemMetrics[currentData.systemMetrics.length - 1];
  }, [currentData.systemMetrics]);

  const getActiveTestsCount = useCallback(() => {
    return currentData.activeTests.filter(test => test.status === 'running').length;
  }, [currentData.activeTests]);

  const getActiveNodesCount = useCallback(() => {
    return currentData.nodeStatus.filter(node => node.status === 'active').length;
  }, [currentData.nodeStatus]);

  const getTotalConcurrentUsers = useCallback(() => {
    return currentData.nodeStatus.reduce((total, node) => total + node.users, 0);
  }, [currentData.nodeStatus]);

  return {
    // Data
    data: currentData,
    systemMetrics: currentData.systemMetrics,
    activeTests: currentData.activeTests,
    nodeStatus: currentData.nodeStatus,
    globalStats: currentData.globalStats,
    
    // Status
    isConnected,
    lastUpdate,
    error,
    
    // Helper functions
    getLatestMetrics,
    getActiveTestsCount,
    getActiveNodesCount,
    getTotalConcurrentUsers,
    
    // Actions
    connectWebSocket,
    disconnectWebSocket,
    
    // Mock data for development
    getMockData
  };
}