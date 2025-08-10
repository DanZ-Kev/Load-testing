'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlassCard, 
  GlassButton, 
  GlassBadge, 
  GlassInput, 
  GlassSelect,
  GlassPanel,
  GlassSkeleton 
} from '@/components/ui/glass';
import { 
  Play, 
  Pause, 
  Stop, 
  Save, 
  Code, 
  Settings, 
  BarChart3,
  Activity,
  Clock,
  Users,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TestConfig {
  name: string;
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  concurrency: number;
  duration: number;
  rampUp: number;
  headers: Record<string, string>;
  body?: string;
  script?: string;
}

interface TestResult {
  timestamp: Date;
  tps: number;
  latency: number;
  errors: number;
  activeUsers: number;
}

interface TestStatus {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  results: TestResult[];
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const SCRIPT_TEMPLATES = {
  'basic': `// Basic HTTP request
async function basicTest() {
  const response = await http.get('{{TARGET_URL}}');
  
  // Assert response
  if (response.status !== 200) {
    throw new Error(\`Expected status 200, got \${response.status}\`);
  }
  
  // Validate response time
  if (response.responseTime > 1000) {
    throw new Error('Response time too slow');
  }
}`,
  'api': `// API endpoint testing
async function apiTest() {
  const payload = {
    userId: Math.floor(Math.random() * 1000),
    data: 'test-data-' + Date.now()
  };
  
  const response = await http.post('{{TARGET_URL}}', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  // Validate response
  if (response.status !== 201) {
    throw new Error(\`Expected status 201, got \${response.status}\`);
  }
  
  const result = JSON.parse(response.body);
  if (!result.id) {
    throw new Error('Response missing ID field');
  }
}`,
  'websocket': `// WebSocket connection test
async function websocketTest() {
  const ws = new WebSocket('{{TARGET_URL}}');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        ws.close();
        resolve();
      }
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };
  });
}`,
  'graphql': `// GraphQL query test
async function graphqlTest() {
  const query = \`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  \`;
  
  const variables = { id: Math.floor(Math.random() * 100) + 1 };
  
  const response = await http.post('{{TARGET_URL}}', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  
  if (response.status !== 200) {
    throw new Error(\`GraphQL request failed: \${response.status}\`);
  }
  
  const result = JSON.parse(response.body);
  if (result.errors) {
    throw new Error(\`GraphQL errors: \${JSON.stringify(result.errors)}\`);
  }
}`
};

export default function LoadTestPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    name: '',
    targetUrl: '',
    method: 'GET',
    concurrency: 10,
    duration: 60,
    rampUp: 10,
    headers: {},
    body: '',
    script: SCRIPT_TEMPLATES.basic
  });
  
  const [testStatus, setTestStatus] = useState<TestStatus>({
    id: '',
    status: 'idle',
    progress: 0,
    results: []
  });
  
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('basic');

  // Mock real-time results for demonstration
  useEffect(() => {
    if (testStatus.status === 'running') {
      const interval = setInterval(() => {
        setTestStatus(prev => {
          if (prev.progress >= 100) {
            return { ...prev, status: 'completed', progress: 100 };
          }
          
          const newProgress = Math.min(prev.progress + Math.random() * 5, 100);
          const newResult: TestResult = {
            timestamp: new Date(),
            tps: Math.floor(Math.random() * 100) + 50,
            latency: Math.floor(Math.random() * 200) + 50,
            errors: Math.floor(Math.random() * 5),
            activeUsers: Math.floor(testConfig.concurrency * (newProgress / 100))
          };
          
          return {
            ...prev,
            progress: newProgress,
            results: [...prev.results, newResult].slice(-50) // Keep last 50 results
          };
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [testStatus.status, testStatus.progress, testConfig.concurrency]);

  const handleStartTest = useCallback(async () => {
    if (!testConfig.targetUrl) {
      alert('Please enter a target URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // TODO: Implement actual test start via API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setTestStatus({
        id: `test-${Date.now()}`,
        status: 'running',
        progress: 0,
        startTime: new Date(),
        results: []
      });
    } catch (error) {
      console.error('Failed to start test:', error);
      alert('Failed to start test');
    } finally {
      setIsLoading(false);
    }
  }, [testConfig]);

  const handleStopTest = useCallback(async () => {
    try {
      // TODO: Implement actual test stop via API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setTestStatus(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        endTime: new Date()
      }));
    } catch (error) {
      console.error('Failed to stop test:', error);
      alert('Failed to stop test');
    }
  }, []);

  const handlePauseTest = useCallback(async () => {
    try {
      // TODO: Implement actual test pause via API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setTestStatus(prev => ({
        ...prev,
        status: 'paused'
      }));
    } catch (error) {
      console.error('Failed to pause test:', error);
      alert('Failed to pause test');
    }
  }, []);

  const handleResumeTest = useCallback(async () => {
    try {
      // TODO: Implement actual test resume via API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setTestStatus(prev => ({
        ...prev,
        status: 'running'
      }));
    } catch (error) {
      console.error('Failed to resume test:', error);
      alert('Failed to resume test');
    }
  }, []);

  const handleSaveTest = useCallback(async () => {
    try {
      // TODO: Implement test configuration save
      alert('Test configuration saved!');
    } catch (error) {
      console.error('Failed to save test:', error);
      alert('Failed to save test configuration');
    }
  }, [testConfig]);

  const handleTemplateChange = useCallback((template: string) => {
    setSelectedTemplate(template);
    setTestConfig(prev => ({
      ...prev,
      script: SCRIPT_TEMPLATES[template as keyof typeof SCRIPT_TEMPLATES].replace(
        /{{TARGET_URL}}/g, 
        prev.targetUrl || 'https://example.com'
      )
    }));
  }, []);

  const addCustomHeader = useCallback(() => {
    setCustomHeaders(prev => [...prev, { key: '', value: '' }]);
  }, []);

  const removeCustomHeader = useCallback((index: number) => {
    setCustomHeaders(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateCustomHeader = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setCustomHeaders(prev => prev.map((header, i) => 
      i === index ? { ...header, [field]: value } : header
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'failed': return 'error';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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
              Load Testing Engine 🚀
            </h1>
            <p className="text-white/60">
              Configure and execute load tests with custom scripts and real-time monitoring
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <GlassButton variant="secondary" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Config
            </GlassButton>
            <GlassButton size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </GlassButton>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Basic Configuration */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Test Configuration</h3>
                <GlassBadge variant="info">Basic</GlassBadge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Test Name
                  </label>
                  <GlassInput
                    value={testConfig.name}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Load Test"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Target URL
                  </label>
                  <GlassInput
                    value={testConfig.targetUrl}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, targetUrl: e.target.value }))}
                    placeholder="https://api.example.com/endpoint"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    HTTP Method
                  </label>
                  <GlassSelect
                    value={testConfig.method}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, method: e.target.value as any }))}
                    className="w-full"
                  >
                    {HTTP_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </GlassSelect>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Concurrency
                  </label>
                  <GlassInput
                    type="number"
                    value={testConfig.concurrency}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, concurrency: parseInt(e.target.value) }))}
                    min="1"
                    max="10000"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Duration (seconds)
                  </label>
                  <GlassInput
                    type="number"
                    value={testConfig.duration}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="10"
                    max="3600"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Ramp-up (seconds)
                  </label>
                  <GlassInput
                    type="number"
                    value={testConfig.rampUp}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, rampUp: parseInt(e.target.value) }))}
                    min="0"
                    max="300"
                    className="w-full"
                  />
                </div>
              </div>
            </GlassCard>

            {/* Custom Headers */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Custom Headers</h3>
                <GlassButton variant="secondary" size="sm" onClick={addCustomHeader}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Header
                </GlassButton>
              </div>
              
              <div className="space-y-3">
                {customHeaders.map((header, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <GlassInput
                      value={header.key}
                      onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                      placeholder="Header Name"
                      className="flex-1"
                    />
                    <GlassInput
                      value={header.value}
                      onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                      placeholder="Header Value"
                      className="flex-1"
                    />
                    <GlassButton
                      variant="error"
                      size="sm"
                      onClick={() => removeCustomHeader(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlassButton>
                  </div>
                ))}
                
                {customHeaders.length === 0 && (
                  <p className="text-white/40 text-sm text-center py-4">
                    No custom headers configured
                  </p>
                )}
              </div>
            </GlassCard>

            {/* Request Body */}
            {(testConfig.method === 'POST' || testConfig.method === 'PUT' || testConfig.method === 'PATCH') && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Request Body</h3>
                <textarea
                  value={testConfig.body}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter JSON payload or form data..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </GlassCard>
            )}

            {/* Script Editor Toggle */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Custom Script</h3>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowScriptEditor(!showScriptEditor)}
                >
                  <Code className="w-4 h-4 mr-2" />
                  {showScriptEditor ? 'Hide' : 'Show'} Editor
                </GlassButton>
              </div>
              
              {!showScriptEditor && (
                <div className="text-center py-8">
                  <Code className="w-12 h-12 mx-auto mb-4 text-white/40" />
                  <p className="text-white/60 mb-2">Custom script editor is hidden</p>
                  <p className="text-white/40 text-sm">Click "Show Editor" to customize test behavior</p>
                </div>
              )}
            </GlassCard>

            {/* Script Editor */}
            <AnimatePresence>
              {showScriptEditor && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">JavaScript Test Script</h3>
                      <div className="flex items-center gap-2">
                        <GlassSelect
                          value={selectedTemplate}
                          onChange={(e) => handleTemplateChange(e.target.value)}
                          className="w-32"
                        >
                          <option value="basic">Basic</option>
                          <option value="api">API</option>
                          <option value="websocket">WebSocket</option>
                          <option value="graphql">GraphQL</option>
                        </GlassSelect>
                        <GlassButton variant="secondary" size="sm">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </GlassButton>
                      </div>
                    </div>
                    
                    <textarea
                      value={testConfig.script}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, script: e.target.value }))}
                      placeholder="Enter your custom JavaScript test script..."
                      className="w-full h-64 bg-slate-800 border border-white/10 rounded-lg p-4 text-green-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    
                    <div className="mt-4 text-xs text-white/60">
                      <p>• Use <code className="bg-white/10 px-1 rounded">http.get()</code>, <code className="bg-white/10 px-1 rounded">http.post()</code> for requests</p>
                      <p>• Access <code className="bg-white/10 px-1 rounded">{{TARGET_URL}}</code> variable for dynamic URLs</p>
                      <p>• Throw errors to fail tests, return normally to pass</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Test Controls & Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Test Controls */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Test Controls</h3>
              
              <div className="space-y-3">
                <GlassButton
                  onClick={handleStartTest}
                  disabled={isLoading || testStatus.status === 'running'}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {isLoading ? 'Starting...' : 'Start Test'}
                </GlassButton>
                
                {testStatus.status === 'running' && (
                  <GlassButton
                    onClick={handlePauseTest}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pause Test
                  </GlassButton>
                )}
                
                {testStatus.status === 'paused' && (
                  <GlassButton
                    onClick={handleResumeTest}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Resume Test
                  </GlassButton>
                )}
                
                {(testStatus.status === 'running' || testStatus.status === 'paused') && (
                  <GlassButton
                    onClick={handleStopTest}
                    variant="error"
                    className="w-full"
                    size="lg"
                  >
                    <Stop className="w-5 h-5 mr-2" />
                    Stop Test
                  </GlassButton>
                )}
              </div>
            </GlassCard>

            {/* Test Status */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Test Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Status</span>
                  <GlassBadge variant={getStatusColor(testStatus.status) as any}>
                    {getStatusIcon(testStatus.status)}
                    {testStatus.status.charAt(0).toUpperCase() + testStatus.status.slice(1)}
                  </GlassBadge>
                </div>
                
                {testStatus.startTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Started</span>
                    <span className="text-white text-sm">
                      {testStatus.startTime.toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                  </div>
                )}
                
                {testStatus.status !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">{testStatus.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${testStatus.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {testStatus.results.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Current TPS</span>
                        <p className="text-white font-semibold">
                          {testStatus.results[testStatus.results.length - 1]?.tps || 0}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/60">Avg Latency</span>
                        <p className="text-white font-semibold">
                          {testStatus.results[testStatus.results.length - 1]?.latency || 0}ms
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <GlassButton variant="secondary" size="sm" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </GlassButton>
                
                <GlassButton variant="secondary" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </GlassButton>
                
                <GlassButton variant="secondary" size="sm" className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Real-time Results Chart */}
        {testStatus.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Real-time Results</h3>
                <GlassBadge variant="success">Live</GlassBadge>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={testStatus.results}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour12: false })}
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
                    labelFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour12: false })}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tps" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                    name="TPS"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                    name="Latency (ms)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
                    name="Errors"
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}