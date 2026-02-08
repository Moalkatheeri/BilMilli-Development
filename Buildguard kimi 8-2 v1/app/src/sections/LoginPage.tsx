import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Building2, Camera, Wallet } from 'lucide-react';

export function LoginPage() {
  const { login, register, loading, error, clearError } = useProjectStore();
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('owner');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(loginEmail, loginPassword);
    } catch {
      // Error is handled in store
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({ email: registerEmail, password: registerPassword, full_name: fullName, role });
    } catch {
      // Error is handled in store
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold">BuildGuard Pro</h1>
          </div>
          
          <p className="text-xl text-slate-300">
            Protect your villa construction investment with AI-powered oversight
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <Camera className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white">AI Photo Analysis</h3>
              <p className="text-sm text-slate-400 mt-1">Detect quality issues automatically</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <Building2 className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white">Stage Tracking</h3>
              <p className="text-sm text-slate-400 mt-1">Monitor construction progress</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <Wallet className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="font-semibold text-white">Payment Gates</h3>
              <p className="text-sm text-slate-400 mt-1">Release payments on milestones</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <Shield className="w-8 h-8 text-rose-400 mb-3" />
              <h3 className="font-semibold text-white">Deviation Detection</h3>
              <p className="text-sm text-slate-400 mt-1">Catch errors before it's too late</p>
            </div>
          </div>
        </div>
        
        {/* Right side - Auth forms */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">BuildGuard Pro</span>
            </div>
            <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to manage your construction projects
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-slate-600">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-slate-600">Create Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive" className="bg-rose-900/50 border-rose-700">
                      <AlertDescription className="text-rose-200">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive" className="bg-rose-900/50 border-rose-700">
                      <AlertDescription className="text-rose-200">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="text-slate-300">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-slate-300">Password</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-slate-300">Role</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-slate-700 border border-slate-600 text-white"
                    >
                      <option value="owner">Homeowner</option>
                      <option value="consultant">Consultant</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
