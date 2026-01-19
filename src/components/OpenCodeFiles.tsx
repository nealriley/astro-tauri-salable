import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Folder,
  File,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Home,
  ChevronRight,
  Server
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  absolute: string;
  type: 'file' | 'directory';
  ignored: boolean;
}

interface OpenCodeStatus {
  healthy: boolean;
  version: string | null;
  error: string | null;
}

export function OpenCodeFiles() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('.');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<OpenCodeStatus | null>(null);

  // Fetch OpenCode status
  useEffect(() => {
    fetch('/api/opencode/status.json')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus({ healthy: false, version: null, error: 'Failed to fetch' }));
  }, []);

  // Fetch files
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/opencode/files.json?path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setFiles([]);
        } else {
          setFiles(data.files);
        }
      } catch (err) {
        setError('Failed to fetch files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentPath]);

  const navigateToFolder = (folderPath: string) => {
    setPathHistory(prev => [...prev, currentPath]);
    setCurrentPath(folderPath);
  };

  const goBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(prev => prev.slice(0, -1));
      setCurrentPath(previousPath);
    }
  };

  const goHome = () => {
    setPathHistory([]);
    setCurrentPath('.');
  };

  const refresh = () => {
    setLoading(true);
    fetch(`/api/opencode/files.json?path=${encodeURIComponent(currentPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setFiles([]);
        } else {
          setError(null);
          setFiles(data.files);
        }
      })
      .catch(() => {
        setError('Failed to fetch files');
        setFiles([]);
      })
      .finally(() => setLoading(false));
  };

  // Parse path for breadcrumbs
  const pathParts = currentPath === '.' ? [] : currentPath.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </a>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Server className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">OpenCode Files</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {status && (
                <Badge variant={status.healthy ? 'default' : 'destructive'} className={status.healthy ? 'bg-green-600' : ''}>
                  {status.healthy ? `OpenCode v${status.version}` : 'Offline'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>OpenCode Server Integration</CardTitle>
              <CardDescription>
                This page queries the OpenCode server running at localhost:4096 and displays the file listing.
                The Astro app fetches data from our API endpoint, which proxies the request to OpenCode.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* File Browser */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" />
                    File Browser
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Browsing files from OpenCode server
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goHome}
                    disabled={currentPath === '.'}
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goBack}
                    disabled={pathHistory.length === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refresh}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground overflow-x-auto">
                <button 
                  onClick={goHome}
                  className="hover:text-foreground flex items-center gap-1"
                >
                  <Home className="h-3 w-3" />
                  Home
                </button>
                {pathParts.map((part, index) => (
                  <span key={index} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <span className={index === pathParts.length - 1 ? 'text-foreground font-medium' : ''}>
                      {part}
                    </span>
                  </span>
                ))}
              </div>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading files from OpenCode...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                  <AlertCircle className="h-10 w-10 mb-3" />
                  <span className="font-medium">Failed to load files</span>
                  <span className="text-sm mt-1">{error}</span>
                  <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
                    Try Again
                  </Button>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <span>No files found in this directory</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {files.map((file) => (
                      <div 
                        key={file.path} 
                        className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                          file.type === 'directory' ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => file.type === 'directory' && navigateToFolder(file.absolute)}
                      >
                        {file.type === 'directory' ? (
                          <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.type === 'directory' ? 'Folder' : 'File'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground text-center">
                    Showing {files.length} items
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default OpenCodeFiles;
