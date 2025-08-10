'use client';

import React, { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlassCard, 
  GlassInput, 
  GlassButton, 
  GlassBadge,
  GlassModal 
} from '@/components/ui/glass';
import { Eye, EyeOff, Shield, Smartphone, Key } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaToken: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        mfaToken: formData.mfaToken,
        redirect: false
      });

      if (result?.error === 'MFA_REQUIRED') {
        setMfaRequired(true);
        setShowMFA(true);
        setIsLoading(false);
        return;
      }

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Check if user needs to complete MFA setup
        const session = await getSession();
        if (session?.user) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerification = async () => {
    if (!formData.mfaToken) {
      setError('Please enter your MFA token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        mfaToken: formData.mfaToken,
        redirect: false
      });

      if (result?.error) {
        setError('Invalid MFA token');
        return;
      }

      if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('MFA verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCode = () => {
    // TODO: Implement backup code verification
    setError('Backup code verification not implemented yet');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-white/60">Sign in to your LoadTester Pro account</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <GlassInput
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                icon={<Key className="w-4 h-4" />}
              />

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/5 backdrop-blur-md transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20 px-4 py-3 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* MFA Input (shown when required) */}
              <AnimatePresence>
                {showMFA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-white/80">
                      MFA Token
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="mfaToken"
                        value={formData.mfaToken}
                        onChange={handleInputChange}
                        placeholder="Enter 6-digit code"
                        className="w-full rounded-xl border border-white/20 bg-white/5 backdrop-blur-md transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20 px-4 py-3 pl-10"
                      />
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    </div>
                    <p className="text-xs text-white/60">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg"
                  >
                    <p className="text-sm text-red-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!showMFA ? (
                  <GlassButton
                    type="submit"
                    loading={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    Sign In
                  </GlassButton>
                ) : (
                  <div className="space-y-3">
                    <GlassButton
                      type="button"
                      onClick={handleMFAVerification}
                      loading={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      Verify MFA
                    </GlassButton>
                    <GlassButton
                      type="button"
                      variant="secondary"
                      onClick={handleBackupCode}
                      className="w-full"
                      size="md"
                    >
                      Use Backup Code
                    </GlassButton>
                  </div>
                )}
              </div>

              {/* Additional Links */}
              <div className="text-center space-y-2">
                <a
                  href="/forgot-password"
                  className="text-sm text-white/60 hover:text-white/80 transition-colors"
                >
                  Forgot your password?
                </a>
                <div className="text-sm text-white/40">
                  Don't have an account?{' '}
                  <a
                    href="/register"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {/* Security Features Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-center"
        >
          <GlassBadge variant="info" className="inline-flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Enterprise-grade security with MFA
          </GlassBadge>
        </motion.div>
      </div>

      {/* MFA Required Modal */}
      <GlassModal
        isOpen={mfaRequired && !showMFA}
        onClose={() => setMfaRequired(false)}
        title="Multi-Factor Authentication Required"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              MFA Required
            </h3>
            <p className="text-white/60">
              Your account is protected with multi-factor authentication. 
              Please enter the 6-digit code from your authenticator app.
            </p>
          </div>
          
          <div className="space-y-4">
            <GlassInput
              label="MFA Token"
              type="text"
              name="mfaToken"
              value={formData.mfaToken}
              onChange={handleInputChange}
              placeholder="Enter 6-digit code"
              icon={<Smartphone className="w-4 h-4" />}
            />
            
            <div className="flex gap-3">
              <GlassButton
                onClick={handleMFAVerification}
                loading={isLoading}
                className="flex-1"
              >
                Verify
              </GlassButton>
              <GlassButton
                variant="secondary"
                onClick={handleBackupCode}
                className="flex-1"
              >
                Backup Code
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}