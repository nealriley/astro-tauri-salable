import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud,
  Zap, 
  FolderSync, 
  Settings, 
  HardDrive,
  Share2,
  Users,
  CreditCard,
  Bell,
  HelpCircle,
  Monitor,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { LicenseStatus } from './LicenseStatus';
import { FeatureCard } from './FeatureGate';
import { LandingPage } from './LandingPage';
import type { Entitlement, LicenseInfo } from '@/types/salable';
import { isTauriEnvironment, getUsername as getTauriUsername } from '@/lib/tauri';
import { initializeUser, setStoredUser, clearStoredUser } from '@/lib/user';

interface PlanIds {
  free: string;
  pro: string;
  business: string;
}

interface DashboardProps {
  initialUsername?: string;
  planIds: PlanIds;
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <Cloud className="h-16 w-16 text-primary mx-auto animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        </div>
        <h2 className="mt-6 text-xl font-semibold">CloudVault</h2>
        <p className="mt-2 text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  );
}

export function Dashboard({ initialUsername, planIds }: DashboardProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [isTauri, setIsTauri] = useState(false);
  const [initializing, setInitializing] = useState(true); // True until we know what to show
  const [showLanding, setShowLanding] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    const init = async () => {
      const tauri = isTauriEnvironment();
      setIsTauri(tauri);
      
      // In Tauri, get username from system
      if (tauri) {
        const tauriUser = await getTauriUsername();
        setUsername(tauriUser);
        setStoredUser(tauriUser);
        // Don't set initializing false yet - wait for subscription check
        return;
      }
      
      // In browser, check URL param then localStorage
      const { username: user, source } = initializeUser();
      
      if (user) {
        setUsername(user);
        // If user came from URL, update the URL to remove the param (cleaner)
        if (source === 'url') {
          const url = new URL(window.location.href);
          url.searchParams.delete('username');
          url.searchParams.delete('user');
          window.history.replaceState({}, '', url.toString());
        }
        // Don't set initializing false yet - wait for subscription check
      } else {
        // No user stored - show landing page
        setShowLanding(true);
        setInitializing(false);
      }
    };

    init();
  }, []);

  // Fetch entitlements and check subscription status when username changes
  useEffect(() => {
    if (!username) return;
    
    const checkUserStatus = async () => {
      setCheckingSubscription(true);
      
      try {
        // First check if user has an active subscription
        const statusResponse = await fetch(`/api/user/status.json?granteeId=${encodeURIComponent(username)}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // If user has no subscription, show landing page
          if (!statusData.hasSubscription) {
            console.log('User has no subscription, showing landing page');
            setShowLanding(true);
            setInitializing(false);
            setCheckingSubscription(false);
            return;
          }
        }
        
        // User has subscription, fetch full entitlements
        const response = await fetch(`/api/entitlements/check.json?granteeId=${encodeURIComponent(username)}`);
        if (response.ok) {
          const data: LicenseInfo = await response.json();
          setEntitlements(data.entitlements);
        }
        setShowLanding(false);
      } catch (err) {
        console.error('Failed to check user status:', err);
        // On error, show landing page as fallback
        setShowLanding(true);
      } finally {
        setInitializing(false);
        setCheckingSubscription(false);
      }
    };

    checkUserStatus();
  }, [username]);

  const handleLogin = (newUsername: string) => {
    setStoredUser(newUsername);
    setUsername(newUsername);
    setShowLanding(false);
  };

  const handleLogout = () => {
    clearStoredUser();
    setUsername(null);
    setEntitlements([]);
    setShowLanding(true);
  };

  // Show loading screen while initializing (checking storage, subscription, etc.)
  if (initializing) {
    return <LoadingScreen />;
  }

  // Show landing page if no user or no subscription
  if (showLanding || !username) {
    return <LandingPage onLogin={handleLogin} freePlanId={planIds.free} />;
  }

  const userInitials = username
    .split(/[-_\s]/)
    .map(part => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Cloud className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">CloudVault</span>
              </div>
              {isTauri && (
                <Badge variant="secondary" className="gap-1">
                  <Monitor className="h-3 w-3" />
                  Tauri Desktop
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{username}</p>
                  <p className="text-xs text-muted-foreground">Grantee</p>
                </div>
                {!isTauri && (
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Switch User">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - License Status */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
              <p className="text-muted-foreground">
                Manage your license and access premium features.
              </p>
            </div>

            <LicenseStatus granteeId={username} />

            {/* Feature Cards - CloudVault Features */}
            <div>
              <h2 className="text-xl font-semibold mb-4">CloudVault Features</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard
                  title="Basic Storage"
                  description="5GB secure cloud storage"
                  entitlementName="basic_storage"
                  entitlements={entitlements}
                  icon={<HardDrive className="h-5 w-5 text-primary" />}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Storage Used</span>
                      <span className="font-medium">2.3 GB / 5 GB</span>
                    </div>
                    <Progress value={46} />
                  </div>
                </FeatureCard>

                <FeatureCard
                  title="File Sharing"
                  description="Share files with anyone"
                  entitlementName="file_sharing"
                  entitlements={entitlements}
                  icon={<Share2 className="h-5 w-5 text-primary" />}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Share Files
                  </Button>
                </FeatureCard>

                <FeatureCard
                  title="Advanced Sync"
                  description="Real-time sync across devices"
                  entitlementName="advanced_sync"
                  entitlements={entitlements}
                  icon={<FolderSync className="h-5 w-5 text-primary" />}
                >
                  <div className="text-sm text-muted-foreground">
                    <span className="text-green-500 font-medium">Synced</span> - 3 devices connected
                  </div>
                </FeatureCard>

                <FeatureCard
                  title="Priority Support"
                  description="24/7 dedicated support access"
                  entitlementName="priority_support"
                  entitlements={entitlements}
                  icon={<Zap className="h-5 w-5 text-primary" />}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </FeatureCard>

                <FeatureCard
                  title="Team Folders"
                  description="Shared folders for your team"
                  entitlementName="team_folders"
                  entitlements={entitlements}
                  icon={<Users className="h-5 w-5 text-primary" />}
                >
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <Avatar key={i} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="text-xs">U{i}</AvatarFallback>
                      </Avatar>
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      +
                    </Button>
                  </div>
                </FeatureCard>

                <FeatureCard
                  title="Admin Console"
                  description="Manage users and permissions"
                  entitlementName="admin_console"
                  entitlements={entitlements}
                  icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Open Console
                  </Button>
                </FeatureCard>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CreditCard className="h-4 w-4" />
                  Manage Subscription
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Environment Info</CardTitle>
                <CardDescription>Current runtime information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Runtime</span>
                  <Badge variant={isTauri ? 'default' : 'secondary'}>
                    {isTauri ? 'Tauri Desktop' : 'Web Browser'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Grantee ID</span>
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">{username}</code>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entitlements</span>
                  <span className="font-medium">{entitlements.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Upgrade to Pro</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Get advanced sync, priority support, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/pricing">
                  <Button variant="secondary" className="w-full">
                    View Plans
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
