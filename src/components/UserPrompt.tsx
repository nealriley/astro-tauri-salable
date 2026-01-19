import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, User } from 'lucide-react';

interface UserPromptProps {
  onUserSet: (username: string) => void;
}

export function UserPrompt({ onUserSet }: UserPromptProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }
    onUserSet(trimmed);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Cloud className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to CloudVault</CardTitle>
          <CardDescription>
            Enter your username to continue. This will be used as your grantee ID for license checks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., user1, john_doe"
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Continue
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Tip: You can also set the user via URL parameter: <code className="bg-muted px-1 rounded">?username=yourname</code>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserPrompt;
