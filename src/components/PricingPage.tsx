import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Cloud,
  Check,
  ArrowLeft,
  Loader2,
  LogOut
} from 'lucide-react';
import { isTauriEnvironment, getUsername as getTauriUsername } from '@/lib/tauri';
import { initializeUser, setStoredUser, clearStoredUser, isExplicitlyLoggedOut } from '@/lib/user';
import { LandingPage } from './LandingPage';
import type { LicenseInfo } from '@/types/salable';

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
        <p className="mt-2 text-muted-foreground">Loading pricing...</p>
      </div>
    </div>
  );
}

// Plan configuration (IDs come from props/env)
interface PlanConfig {
  id: string;
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  identifyingEntitlements: string[];
  features: { name: string; included: boolean }[];
}

type PlanKey = 'free' | 'pro' | 'business';

function createPlans(planIds: { free: string; pro: string; business: string }): Record<PlanKey, PlanConfig> {
  return {
    free: {
      id: planIds.free,
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      identifyingEntitlements: ['basic_storage'],
      features: [
        { name: 'Basic Storage (5GB)', included: true },
        { name: 'File Sharing', included: true },
        { name: 'Advanced Sync', included: false },
        { name: 'Priority Support', included: false },
        { name: 'Team Folders', included: false },
        { name: 'Admin Console', included: false },
      ]
    },
    pro: {
      id: planIds.pro,
      name: 'Pro',
      price: 9,
      description: 'For power users',
      popular: true,
      identifyingEntitlements: ['advanced_sync'],
      features: [
        { name: 'Basic Storage (50GB)', included: true },
        { name: 'File Sharing', included: true },
        { name: 'Advanced Sync', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Team Folders', included: false },
        { name: 'Admin Console', included: false },
      ]
    },
    business: {
      id: planIds.business,
      name: 'Business',
      price: 29,
      description: 'For teams and organizations',
      identifyingEntitlements: ['admin_console'],
      features: [
        { name: 'Basic Storage (500GB)', included: true },
        { name: 'File Sharing', included: true },
        { name: 'Advanced Sync', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Team Folders', included: true },
        { name: 'Admin Console', included: true },
      ]
    }
  };
}

// Determine user's current plan based on their entitlements
function detectCurrentPlan(entitlementNames: string[]): PlanKey | null {
  // Check from highest tier to lowest
  if (entitlementNames.includes('admin_console')) return 'business';
  if (entitlementNames.includes('advanced_sync')) return 'pro';
  if (entitlementNames.includes('basic_storage')) return 'free';
  return null;
}

interface PlanIds {
  free: string;
  pro: string;
  business: string;
}

interface PricingPageProps {
  initialUsername?: string;
  planIds: PlanIds;
}

export function PricingPage({ initialUsername, planIds }: PricingPageProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);
  const [checkingEntitlements, setCheckingEntitlements] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  
  // Create plans with the provided IDs
  const PLANS = createPlans(planIds);

  useEffect(() => {
    const init = async () => {
      const tauri = isTauriEnvironment();
      setIsTauri(tauri);
      
      // Check if user explicitly logged out - if so, show landing page
      if (isExplicitlyLoggedOut()) {
        setShowLanding(true);
        setInitializing(false);
        return;
      }
      
      // Check URL param first (takes priority even in Tauri)
      const { username: user, source } = initializeUser();
      
      if (user) {
        setUsername(user);
        setStoredUser(user);
        // If user came from URL, update the URL to remove the param
        if (source === 'url') {
          const url = new URL(window.location.href);
          url.searchParams.delete('username');
          url.searchParams.delete('user');
          window.history.replaceState({}, '', url.toString());
        }
        setInitializing(false);
        return;
      }
      
      // No URL param or stored user - in Tauri, fall back to system username
      if (tauri) {
        const tauriUser = await getTauriUsername();
        setUsername(tauriUser);
        setStoredUser(tauriUser);
        setInitializing(false);
        return;
      }
      
      // No user - show landing page
      setShowLanding(true);
      setInitializing(false);
    };
    init();
  }, []);

  // Fetch entitlements when username is set
  useEffect(() => {
    if (!username) return;

    const fetchEntitlements = async () => {
      setCheckingEntitlements(true);
      try {
        const response = await fetch(`/api/entitlements/check.json?granteeId=${encodeURIComponent(username)}`);
        if (response.ok) {
          const data: LicenseInfo = await response.json();
          const entitlementNames = data.entitlements.map(e => e.value);
          const detected = detectCurrentPlan(entitlementNames);
          setCurrentPlan(detected);
        }
      } catch (err) {
        console.error('Failed to fetch entitlements:', err);
      } finally {
        setCheckingEntitlements(false);
      }
    };

    fetchEntitlements();
  }, [username]);

  const handleLogin = (newUsername: string) => {
    setStoredUser(newUsername);
    setUsername(newUsername);
    setShowLanding(false);
  };

  const handleLogout = () => {
    clearStoredUser();
    setUsername(null);
    setCurrentPlan(null);
    setShowLanding(true);
  };

  // Show loading screen while initializing
  if (initializing) {
    return <LoadingScreen />;
  }

  // Show landing page if no user
  if (showLanding || !username) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const handleCheckout = async (planKey: keyof typeof PLANS) => {
    const plan = PLANS[planKey];
    setLoading(planKey);
    setError(null);

    try {
      const response = await fetch('/api/checkout.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          granteeId: username,
          owner: username, // Same as grantee for B2C
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back
              </a>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Cloud className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">CloudVault</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              Logged in as: <code className="bg-muted px-2 py-0.5 rounded">{username}</code>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Secure cloud storage for everyone. Start free, upgrade when you need more.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {(Object.keys(PLANS) as Array<PlanKey>).map((planKey) => {
            const plan = PLANS[planKey];
            const isPopular = 'popular' in plan && plan.popular;
            const isCurrentPlan = currentPlan === planKey;
            
            return (
              <Card 
                key={planKey} 
                className={`relative ${isPopular && !isCurrentPlan ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-green-500 border-2 bg-green-50/50 dark:bg-green-950/20' : ''}`}
              >
                {isCurrentPlan && (
                  <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500">
                    Current Plan
                  </Badge>
                )}
                {isPopular && !isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check 
                          className={`h-4 w-4 ${
                            feature.included ? 'text-green-500' : 'text-muted-foreground/30'
                          }`} 
                        />
                        <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {checkingEntitlements ? (
                    <Button className="w-full" variant="outline" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking status...
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Active
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handleCheckout(planKey)}
                      disabled={loading !== null}
                    >
                      {loading === planKey ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating checkout...
                        </>
                      ) : plan.price === 0 ? (
                        'Get Started Free'
                      ) : currentPlan ? (
                        `Upgrade to ${plan.name}`
                      ) : (
                        `Subscribe to ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>All plans include a 14-day money-back guarantee.</p>
          <p className="mt-2">
            Powered by <a href="https://salable.app" className="text-primary hover:underline">Salable</a> + Stripe
          </p>
        </div>
      </main>
    </div>
  );
}

export default PricingPage;
