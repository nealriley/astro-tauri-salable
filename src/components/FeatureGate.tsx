import { useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Sparkles } from 'lucide-react';
import type { Entitlement } from '@/types/salable';
import { hasEntitlement } from '@/lib/salable';

interface FeatureGateProps {
  entitlementName: string;
  entitlements: Entitlement[];
  title: string;
  description?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({
  entitlementName,
  entitlements,
  title,
  description,
  children,
  fallback
}: FeatureGateProps) {
  const hasAccess = hasEntitlement(entitlements, entitlementName);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This feature requires the <code className="bg-muted px-1.5 py-0.5 rounded">{entitlementName}</code> entitlement.
        </p>
        <Button variant="default" size="sm">
          Upgrade to Access
        </Button>
      </CardContent>
    </Card>
  );
}

// Feature card that shows unlock status
interface FeatureCardProps {
  title: string;
  description: string;
  entitlementName: string;
  entitlements: Entitlement[];
  icon?: ReactNode;
  children?: ReactNode;
}

export function FeatureCard({
  title,
  description,
  entitlementName,
  entitlements,
  icon,
  children
}: FeatureCardProps) {
  const hasAccess = hasEntitlement(entitlements, entitlementName);

  return (
    <Card className={!hasAccess ? 'opacity-75' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`p-2 rounded-lg ${hasAccess ? 'bg-primary/10' : 'bg-muted'}`}>
                {icon}
              </div>
            )}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                {hasAccess ? (
                  <Unlock className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {hasAccess ? (
            <Badge variant="success">Unlocked</Badge>
          ) : (
            <Badge variant="outline">Locked</Badge>
          )}
        </div>
      </CardHeader>
      {hasAccess && children && (
        <CardContent>{children}</CardContent>
      )}
      {!hasAccess && (
        <CardContent>
          <Button variant="outline" size="sm" className="w-full">
            Upgrade to Unlock
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default FeatureGate;
