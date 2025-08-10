import { VM } from 'vm';
import { EventEmitter } from 'events';
import { EnterpriseSecurityManager } from './security';

interface ScriptContext {
  userId: string;
  scriptId: string;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedDomains: string[];
  rateLimit: number;
}

interface ScriptResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  memoryUsage: number;
  requestsMade: number;
  errors: string[];
}

interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
}

class SecureScriptRunner extends EventEmitter {
  private context: ScriptContext;
  private vm: VM;
  private startTime: number;
  private memoryUsage: number;
  private requestsMade: number;
  private errors: string[];
  private isRunning: boolean;
  private timeoutId?: NodeJS.Timeout;

  constructor(context: ScriptContext) {
    super();
    this.context = context;
    this.startTime = 0;
    this.memoryUsage = 0;
    this.requestsMade = 0;
    this.errors = [];
    this.isRunning = false;

    // Create secure VM context
    this.vm = new VM({
      timeout: context.maxExecutionTime * 1000,
      sandbox: this.createSandbox(),
      compiler: 'javascript',
      eval: false,
      wasm: false
    });
  }

  private createSandbox(): any {
    const sandbox: any = {
      // Console methods (limited)
      console: {
        log: (...args: any[]) => this.log('log', args),
        info: (...args: any[]) => this.log('info', args),
        warn: (...args: any[]) => this.log('warn', args),
        error: (...args: any[]) => this.log('error', args)
      },

      // HTTP client with restrictions
      http: this.createHTTPClient(),

      // Utility functions
      setTimeout: (fn: Function, delay: number) => {
        if (delay > 5000) throw new Error('Maximum timeout is 5000ms');
        return setTimeout(fn, delay);
      },

      setInterval: (fn: Function, delay: number) => {
        if (delay < 100) throw new Error('Minimum interval is 100ms');
        return setInterval(fn, delay);
      },

      // Math and utility functions
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,

      // Custom load testing utilities
      loadTest: {
        sleep: (ms: number) => this.sleep(ms),
        random: (min: number, max: number) => Math.random() * (max - min) + min,
        uuid: () => this.generateUUID(),
        timestamp: () => Date.now(),
        metrics: this.getMetrics()
      }
    };

    // Freeze sandbox to prevent modification
    Object.freeze(sandbox);
    return sandbox;
  }

  private createHTTPClient(): any {
    const client: any = {};

    // GET request
    client.get = async (url: string, options: any = {}) => {
      return this.makeRequest('GET', url, options);
    };

    // POST request
    client.post = async (url: string, data: any, options: any = {}) => {
      return this.makeRequest('POST', url, { ...options, data });
    };

    // PUT request
    client.put = async (url: string, data: any, options: any = {}) => {
      return this.makeRequest('PUT', url, { ...options, data });
    };

    // DELETE request
    client.delete = async (url: string, options: any = {}) => {
      return this.makeRequest('DELETE', url, options);
    };

    // PATCH request
    client.patch = async (url: string, data: any, options: any = {}) => {
      return this.makeRequest('PATCH', url, { ...options, data });
    };

    return client;
  }

  private async makeRequest(method: string, url: string, options: any = {}): Promise<any> {
    try {
      // Validate URL
      if (!this.isAllowedDomain(url)) {
        throw new Error(`Domain not allowed: ${url}`);
      }

      // Check rate limit
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Increment request counter
      this.requestsMade++;

      // Simulate HTTP request (in production, this would use actual HTTP client)
      const startTime = Date.now();
      
      // Simulate network delay
      await this.sleep(Math.random() * 100 + 50);
      
      const responseTime = Date.now() - startTime;

      // Simulate response
      const response = {
        status: Math.random() > 0.1 ? 200 : 500, // 90% success rate
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'Simulated response' },
        responseTime
      };

      // Emit metrics
      this.emit('request', {
        method,
        url,
        status: response.status,
        responseTime,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      this.errors.push(`Request failed: ${error.message}`);
      throw error;
    }
  }

  private isAllowedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.context.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  private checkRateLimit(): boolean {
    // Simple rate limiting (in production, use Redis)
    return this.requestsMade < this.context.rateLimit;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getMetrics(): LoadTestMetrics {
    return {
      totalRequests: this.requestsMade,
      successfulRequests: this.requestsMade - this.errors.length,
      failedRequests: this.errors.length,
      averageResponseTime: 0, // Calculate from actual requests
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: this.requestsMade / (this.getExecutionTime() / 1000),
      errorRate: this.errors.length / Math.max(this.requestsMade, 1)
    };
  }

  private getExecutionTime(): number {
    return Date.now() - this.startTime;
  }

  private log(level: string, args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    this.emit('log', { level, message, timestamp: Date.now() });
  }

  public async execute(scriptCode: string): Promise<ScriptResult> {
    if (this.isRunning) {
      throw new Error('Script is already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.memoryUsage = process.memoryUsage().heapUsed;

    try {
      // Set execution timeout
      this.timeoutId = setTimeout(() => {
        this.stop('Execution timeout exceeded');
      }, this.context.maxExecutionTime * 1000);

      // Execute script
      const result = await this.vm.run(scriptCode);

      // Clear timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      const executionTime = this.getExecutionTime();
      const finalMemoryUsage = process.memoryUsage().heapUsed - this.memoryUsage;

      // Log execution
      await EnterpriseSecurityManager.logAuditEvent(
        'SCRIPT_EXECUTION',
        this.context.userId,
        'load_test_script',
        {
          scriptId: this.context.scriptId,
          executionTime,
          memoryUsage: finalMemoryUsage,
          requestsMade: this.requestsMade,
          errors: this.errors.length
        }
      );

      return {
        success: true,
        data: result,
        executionTime,
        memoryUsage: finalMemoryUsage,
        requestsMade: this.requestsMade,
        errors: this.errors
      };

    } catch (error) {
      const executionTime = this.getExecutionTime();
      const finalMemoryUsage = process.memoryUsage().heapUsed - this.memoryUsage;

      // Log error
      await EnterpriseSecurityManager.logSecurityEvent(
        'SCRIPT_EXECUTION_ERROR',
        'ERROR',
        `Script execution failed: ${error.message}`,
        this.context.userId,
        undefined,
        {
          scriptId: this.context.scriptId,
          executionTime,
          memoryUsage: finalMemoryUsage,
          error: error.message
        }
      );

      return {
        success: false,
        error: error.message,
        executionTime,
        memoryUsage: finalMemoryUsage,
        requestsMade: this.requestsMade,
        errors: this.errors
      };

    } finally {
      this.isRunning = false;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    }
  }

  public stop(reason: string = 'Manual stop'): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.emit('stopped', { reason, timestamp: Date.now() });
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      executionTime: this.getExecutionTime(),
      requestsMade: this.requestsMade,
      errors: this.errors.length,
      memoryUsage: process.memoryUsage().heapUsed - this.memoryUsage
    };
  }
}

// Script template library
export const scriptTemplates = {
  // REST API load test
  restAPI: `
async function loadTest() {
  const baseUrl = 'https://api.example.com';
  const endpoints = ['/users', '/posts', '/comments'];
  
  for (let i = 0; i < 100; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = baseUrl + endpoint;
    
    try {
      const response = await http.get(url);
      loadTest.log('info', \`Request to \${endpoint}: \${response.status}\`);
      
      // Random delay between requests
      await loadTest.sleep(loadTest.random(100, 500));
      
    } catch (error) {
      loadTest.log('error', \`Request failed: \${error.message}\`);
    }
  }
}

loadTest();
  `,

  // WebSocket load test
  websocket: `
async function websocketTest() {
  const messages = ['ping', 'data', 'status'];
  
  for (let i = 0; i < 50; i++) {
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      // Simulate WebSocket message
      loadTest.log('info', \`Sending: \${message}\`);
      
      // Random delay
      await loadTest.sleep(loadTest.random(200, 1000));
      
    } catch (error) {
      loadTest.log('error', \`WebSocket error: \${error.message}\`);
    }
  }
}

websocketTest();
  `,

  // Database load test
  database: `
async function databaseTest() {
  const operations = ['read', 'write', 'update', 'delete'];
  
  for (let i = 0; i < 75; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    try {
      loadTest.log('info', \`Database operation: \${operation}\`);
      
      // Simulate database operation time
      await loadTest.sleep(loadTest.random(50, 300));
      
    } catch (error) {
      loadTest.log('error', \`Database error: \${error.message}\`);
    }
  }
}

databaseTest();
  `
};

// Factory function to create script runner
export function createScriptRunner(context: ScriptContext): SecureScriptRunner {
  return new SecureScriptRunner(context);
}

// Export types
export type { ScriptContext, ScriptResult, LoadTestMetrics };
export { SecureScriptRunner };