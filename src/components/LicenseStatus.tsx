import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  RefreshCw,
  User,
  Calendar
} from 'lucide-react';
import type { LicenseInfo, Entitlement } from '@/types/salable';
import { formatExpiryDate, getDaysUntilExpiry } from '@/lib/salable';

interface LicenseStatusProps {
  granteeId: string;
}

export function LicenseStatus({ granteeId }: LicenseStatusProps) {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicenseStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/entitlements/check.json?granteeId=${encodeURIComponent(granteeId)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to check entitlements: ${response.status}`);
      }
      
      const data = await response.json();
      setLicenseInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLicenseInfo({
        status: 'error',
        entitlements: [],
        granteeId,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
  }, [granteeId]);

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />;
    
    switch (licenseInfo?.status) {
      case 'active':
        return <ShieldCheck className="h-8 w-8 text-green-500" />;
      case 'expired':
        return <ShieldX className="h-8 w-8 text-yellow-500" />;
      case 'error':
        return <ShieldX className="h-8 w-8 text-destructive" />;
      default:
        return <Shield className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="secondary">Checking...</Badge>;
    
    switch (licenseInfo?.status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'expired':
        return <Badge variant="warning">Expired</Badge>;
      case 'none':
        return <Badge variant="outline">No License</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-xl">License Status</CardTitle>
              <CardDescription>Salable entitlement check for your account</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Grantee ID:</span>
          <code className="bg-muted px-2 py-0.5 rounded text-foreground">{granteeId}</code>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {licenseInfo && licenseInfo.entitlements.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Entitlements</h4>
              <div className="space-y-2">
                {licenseInfo.entitlements.map((entitlement, index) => (
                  <EntitlementRow key={index} entitlement={entitlement} />
                ))}
              </div>
            </div>
          </>
        )}

        {licenseInfo && licenseInfo.status === 'none' && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              No active entitlements found for this user.
            </p>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <a href="/pricing">
            <Button variant="default">
              {licenseInfo && licenseInfo.entitlements.length > 0 ? 'Manage Plan' : 'Upgrade Plan'}
            </Button>
          </a>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLicenseStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EntitlementRow({ entitlement }: { entitlement: Entitlement }) {
  const daysUntilExpiry = getDaysUntilExpiry(entitlement.expiryDate);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-destructive' : isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'}`} />
        <div>
          <p className="font-medium">{entitlement.value}</p>
          <p className="text-xs text-muted-foreground capitalize">{entitlement.type}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          {entitlement.expiryDate 
            ? (isExpired ? 'Expired' : `Expires ${formatExpiryDate(entitlement.expiryDate)}`)
            : 'Never expires'
          }
        </span>
        {isExpiringSoon && !isExpired && (
          <Badge variant="warning" className="ml-2">
            {daysUntilExpiry} days left
          </Badge>
        )}
      </div>
    </div>
  );
}

export default LicenseStatus;
