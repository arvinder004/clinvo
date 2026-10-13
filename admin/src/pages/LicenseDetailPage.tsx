import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  useLicense,
  useUpdateLicenseStatus,
  useUpdateLicenseFeatures,
  useUpdateLicenseExpiry,
} from '@/hooks/useLicenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pause, Play, XCircle, Plus, Trash2 } from 'lucide-react';

function statusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge variant="success">Active</Badge>;
    case 'paused': return <Badge variant="warning">Paused</Badge>;
    case 'expired': return <Badge variant="destructive">Expired</Badge>;
    case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const licenseId = id!;
  const { data: license, isLoading } = useLicense(licenseId);
  const updateStatus = useUpdateLicenseStatus(licenseId);
  const updateFeatures = useUpdateLicenseFeatures(licenseId);
  const updateExpiry = useUpdateLicenseExpiry(licenseId);

  const [confirm, setConfirm] = useState<{ action: string; status: string } | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [featureOverrides, setFeatureOverrides] = useState<{ key: string; value: string }[]>([]);
  const [featuresInitialized, setFeaturesInitialized] = useState(false);

  // Initialize feature overrides from data
  if (license && !featuresInitialized) {
    const entries = Object.entries(license.overrides as Record<string, string>).map(([key, value]) => ({ key, value }));
    setFeatureOverrides(entries);
    setFeaturesInitialized(true);
  }

  const handleStatusChange = (status: string) => {
    updateStatus.mutate(status, { onSuccess: () => setConfirm(null) });
  };

  const handleSaveExpiry = () => {
    if (!newExpiry) return;
    updateExpiry.mutate(new Date(newExpiry).toISOString());
  };

  const handleSaveFeatures = () => {
    const features: Record<string, string> = {};
    for (const { key, value } of featureOverrides) {
      if (key.trim()) features[key.trim()] = value;
    }
    updateFeatures.mutate(features);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!license) return <p className="text-muted-foreground">License not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-mono text-lg font-semibold">{license.apiKeyPrefix}…</h2>
          <p className="text-sm text-muted-foreground">{license.tenant?.name} · {license.plan?.name}</p>
        </div>
        {statusBadge(license.status)}
      </div>

      {/* Status Actions */}
      <Card>
        <CardHeader><CardTitle>Status Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {license.status !== 'paused' && license.status !== 'expired' && license.status !== 'cancelled' && (
            <Button
              id="btn-pause-license"
              variant="outline"
              onClick={() => setConfirm({ action: 'Pause', status: 'paused' })}
            >
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
          )}
          {license.status === 'paused' && (
            <Button
              id="btn-resume-license"
              variant="outline"
              onClick={() => setConfirm({ action: 'Resume', status: 'active' })}
            >
              <Play className="h-4 w-4 mr-2" /> Resume
            </Button>
          )}
          {license.status !== 'cancelled' && (
            <Button
              id="btn-revoke-license"
              variant="destructive"
              onClick={() => setConfirm({ action: 'Revoke', status: 'cancelled' })}
            >
              <XCircle className="h-4 w-4 mr-2" /> Revoke
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Extend Expiry */}
      <Card>
        <CardHeader><CardTitle>Extend Expiry</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Current: {license.expiresAt ? format(new Date(license.expiresAt), 'dd MMM yyyy') : 'Never'}
          </div>
          <Input
            id="input-new-expiry"
            type="date"
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            className="w-44"
          />
          <Button
            id="btn-save-expiry"
            onClick={handleSaveExpiry}
            disabled={!newExpiry || updateExpiry.isPending}
            size="sm"
          >
            {updateExpiry.isPending ? 'Saving…' : 'Save'}
          </Button>
          {updateExpiry.isSuccess && <span className="text-xs text-green-600">Saved!</span>}
        </CardContent>
      </Card>

      {/* Feature Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feature Overrides</CardTitle>
            <Button
              id="btn-add-feature"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFeatureOverrides((prev) => [...prev, { key: '', value: '' }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureOverrides.length === 0 && (
            <p className="text-sm text-muted-foreground">No feature overrides. Click Add to create one.</p>
          )}
          {featureOverrides.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                id={`input-feature-key-${i}`}
                placeholder="feature_key"
                value={f.key}
                onChange={(e) => {
                  const updated = [...featureOverrides];
                  updated[i] = { ...updated[i]!, key: e.target.value };
                  setFeatureOverrides(updated);
                }}
                className="flex-1 font-mono text-xs"
              />
              <Input
                id={`input-feature-value-${i}`}
                placeholder="value"
                value={f.value}
                onChange={(e) => {
                  const updated = [...featureOverrides];
                  updated[i] = { ...updated[i]!, value: e.target.value };
                  setFeatureOverrides(updated);
                }}
                className="flex-1 font-mono text-xs"
              />
              <Button
                id={`btn-remove-feature-${i}`}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFeatureOverrides((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button
            id="btn-save-features"
            onClick={handleSaveFeatures}
            disabled={updateFeatures.isPending}
            size="sm"
          >
            {updateFeatures.isPending ? 'Saving…' : 'Save Overrides'}
          </Button>
          {updateFeatures.isSuccess && <span className="ml-2 text-xs text-green-600">Saved!</span>}
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader><CardTitle>Event Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(license.events as Array<{ id: string; eventType: string; metadata: unknown; createdAt: string }>).map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-mono text-xs">{ev.eventType}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-xs truncate">
                    {JSON.stringify(ev.metadata)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(ev.createdAt), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={Boolean(confirm)} onOpenChange={() => setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm: {confirm?.action} License</DialogTitle>
            <DialogDescription>
              This will change the license status to <strong>{confirm?.status}</strong>. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button id="btn-confirm-cancel" variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              id="btn-confirm-action"
              variant={confirm?.status === 'cancelled' ? 'destructive' : 'default'}
              onClick={() => confirm && handleStatusChange(confirm.status)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Updating…' : `Confirm ${confirm?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
