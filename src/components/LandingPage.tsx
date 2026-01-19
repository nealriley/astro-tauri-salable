import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Cloud,
  Zap,
  Shield,
  Share2,
  FolderSync,
  Check,
  ArrowRight,
  Loader2,
  User,
  Folder,
  File,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (username: string) => void;
  freePlanId: string;
}

interface FileNode {
  name: string;
  path: string;
  absolute: string;
  type: 'file' | 'directory';
  ignored: boolean;
}

export function LandingPage({ onLogin, freePlanId }: LandingPageProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OpenCode files state
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('.');

  // Fetch files from OpenCode
  useEffect(() => {
    const fetchFiles = async () => {
      setFilesLoading(true);
      setFilesError(null);
      
      try {
        const response = await fetch(`/api/opencode/files.json?path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();
        
        if (data.error) {
          setFilesError(data.error);
          setFiles([]);
        } else {
          setFiles(data.files);
        }
      } catch (err) {
        setFilesError('Failed to fetch files');
        setFiles([]);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchFiles();
  }, [currentPath]);

  const refreshFiles = () => {
    setCurrentPath(prev => prev); // Trigger re-fetch
    setFilesLoading(true);
    fetch(`/api/opencode/files.json?path=${encodeURIComponent(currentPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setFilesError(data.error);
          setFiles([]);
        } else {
          setFilesError(null);
          setFiles(data.files);
        }
      })
      .catch(() => {
        setFilesError('Failed to fetch files');
        setFiles([]);
      })
      .finally(() => setFilesLoading(false));
  };

  const handleGetStarted = async () => {
    if (!username.trim()) {
      setError('Please enter a username to get started');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create checkout for free tier
      const response = await fetch('/api/checkout.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: freePlanId,
          granteeId: username.trim(),
          owner: username.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start signup');
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    onLogin(username.trim());
  };

  const features = [
    {
      icon: Shield,
      title: 'Secure Storage',
      description: 'Bank-level encryption for all your files',
    },
    {
      icon: Share2,
      title: 'Easy Sharing',
      description: 'Share files with anyone, anywhere',
    },
    {
      icon: FolderSync,
      title: 'Auto Sync',
      description: 'Keep files synced across all devices',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized for speed and performance',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">CloudVault</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                Pricing
              </a>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLogin(true)}
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Start free, upgrade anytime
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Your files, everywhere.
            <br />
            <span className="text-primary">Secure and simple.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            CloudVault keeps your files safe, synced, and accessible from any device. 
            Get started in seconds with our free tier.
          </p>

          {/* Get Started Form */}
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{showLogin ? 'Welcome back' : 'Get started free'}</CardTitle>
              <CardDescription>
                {showLogin 
                  ? 'Enter your username to access your account'
                  : 'Enter a username to create your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        showLogin ? handleLogin() : handleGetStarted();
                      }
                    }}
                    placeholder={showLogin ? 'Your username' : 'Choose a username'}
                    className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-lg"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                {showLogin ? (
                  <>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleLogin}
                      disabled={loading}
                    >
                      Log In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <button 
                        onClick={() => {
                          setShowLogin(false);
                          setError('');
                        }}
                        className="text-primary hover:underline"
                      >
                        Sign up free
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleGetStarted}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Get Started Free
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <button 
                        onClick={() => {
                          setShowLogin(true);
                          setError('');
                        }}
                        className="text-primary hover:underline"
                      >
                        Log in
                      </button>
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OpenCode Files Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  Files from OpenCode
                </CardTitle>
                <CardDescription>
                  Live file listing from OpenCode server ({currentPath})
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshFiles}
                disabled={filesLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${filesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading files...</span>
                </div>
              ) : filesError ? (
                <div className="flex items-center justify-center py-8 text-destructive">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{filesError}</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No files found
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {files.slice(0, 20).map((file) => (
                    <div 
                      key={file.path} 
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      {file.type === 'directory' ? (
                        <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {files.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Showing 20 of {files.length} items
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Everything you need for cloud storage
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card/50">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="max-w-4xl mx-auto mt-16">
          <Separator className="mb-16" />
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you need more</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <div className="text-3xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    5GB Storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    File Sharing
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardHeader>
                <Badge className="w-fit mb-2">Popular</Badge>
                <CardTitle>Pro</CardTitle>
                <div className="text-3xl font-bold">$9<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    50GB Storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Advanced Sync
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Priority Support
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Business</CardTitle>
                <div className="text-3xl font-bold">$29<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    500GB Storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Team Folders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Admin Console
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-6">
            <a href="/pricing" className="text-primary hover:underline text-sm">
              View full pricing details
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              <span>CloudVault</span>
            </div>
            <p>Powered by Salable + Stripe</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
