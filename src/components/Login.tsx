
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {  Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {getToken, messaging } from '@/lib/firebase';


export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const [token, setToken] = useState('');


const getTokenData = async () => {
    try {
      // If notifications are denied, skip token retrieval
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        console.info('Notifications are denied by the user; skipping FCM getToken.');
        return null;
      }
      const fcmToken = await getToken(messaging, {
        vapidKey: "BJR3c-k3SRZ5VgjY2XguP9c9u_EtqR5gZ1I0AfnUGnhgEPGYyepRzucYb2w6248d9rBdsIoyLLERAvkPk2SGsVM",
      });
      setToken(fcmToken || '');
      return fcmToken;
    } catch (err) {
      console.warn('Failed to get FCM token (possibly blocked/denied). Proceeding without push notifications.', err);
      return null;
    }
  };
  React.useEffect(() => {
    // Fire-and-forget; do not block login UI
    void getTokenData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        console.log("successfully logged ins");
        toast.success('Welcome back!');
      }
    } catch (error) {
      toast.error(isSignUp ? 'Failed to create account' : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <h1 className="text-2xl font-bold break-words truncate whitespace-normal"></h1>
           <img
              src="/logo.png" // Place your logo image as 'logo.png' in the public folder
              alt="Hotel Logo"
              className="object-contain "
            />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-dark mt-[30px]"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
