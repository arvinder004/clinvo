import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTenants, useCreateTenant } from '@/hooks/useTenants';
import { usePlans } from '@/hooks/usePlans';
import { useIssueLicense } from '@/hooks/useLicenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Copy, CheckCheck, AlertTriangle } from 'lucide-react';

const schema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  planId: z.string().min(1, 'Plan is required'),
  expiresAt: z.string().min(1, 'Expiry date is required'),
  env: z.enum(['live', 'test']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const createTenantSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

export function NewLicensePage() {
  const navigate = useNavigate();
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [issuedLicenseId, setIssuedLicenseId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tenants } = useTenants();
  const { data: plans } = usePlans();
  const issueLicense = useIssueLicense();
  const createTenant = useCreateTenant();

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { env: 'live' } });
  const createTenantForm = useForm<CreateTenantForm>({ resolver: zodResolver(createTenantSchema) });

  const onSubmit = (data: FormData) => {
    issueLicense.mutate(
      { ...data, expiresAt: new Date(data.expiresAt).toISOString() },
      {
        onSuccess: (res) => {
          setIssuedKey(res.apiKey);
          setIssuedLicenseId(res.license.id);
        },
      },
    );
  };

  const onCreateTenant = (data: CreateTenantForm) => {
    createTenant.mutate(data, {
      onSuccess: (tenant) => {
        form.setValue('tenantId', tenant.id);
        setShowCreateTenant(false);
        createTenantForm.reset();
      },
    });
  };

  const handleCopy = () => {
    if (issuedKey) {
      void navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue New License</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="form-issue-license" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Tenant */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <div className="flex gap-2">
                <Select onValueChange={(v) => form.setValue('tenantId', v)}>
                  <SelectTrigger id="select-tenant" className="flex-1">
                    <SelectValue placeholder="Select tenant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tenants?.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} — {t.ownerEmail}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  id="btn-new-tenant"
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTenant(true)}
                >
                  + New
                </Button>
              </div>
              {form.formState.errors.tenantId && (
                <p className="text-xs text-destructive">{form.formState.errors.tenantId.message}</p>
              )}
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select onValueChange={(v) => form.setValue('planId', v)}>
                <SelectTrigger id="select-plan">
                  <SelectValue placeholder="Select plan…" />
                </SelectTrigger>
                <SelectContent>
                  {(plans ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.priceInr}/yr</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.planId && (
                <p className="text-xs text-destructive">{form.formState.errors.planId.message}</p>
              )}
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <Label>Environment</Label>
              <div className="flex gap-4">
                {(['live', 'test'] as const).map((env) => (
                  <label key={env} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      id={`radio-env-${env}`}
                      value={env}
                      {...form.register('env')}
                    />
                    <span className="text-sm capitalize">{env}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label htmlFor="input-expiry">Expiry Date</Label>
              <Input
                id="input-expiry"
                type="date"
                {...form.register('expiresAt')}
              />
              {form.formState.errors.expiresAt && (
                <p className="text-xs text-destructive">{form.formState.errors.expiresAt.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="input-notes">Notes (optional)</Label>
              <textarea
                id="input-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Internal notes about this license…"
                {...form.register('notes')}
              />
            </div>

            {issueLicense.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Failed to issue license. Please check the form and try again.
              </p>
            )}

            <div className="flex gap-3">
              <Button id="btn-submit-issue" type="submit" disabled={issueLicense.isPending}>
                {issueLicense.isPending ? 'Issuing…' : 'Issue License'}
              </Button>
              <Button id="btn-cancel-issue" type="button" variant="outline" onClick={() => navigate('/licenses')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Add a new clinic/tenant to the system.</DialogDescription>
          </DialogHeader>
          <form id="form-create-tenant" onSubmit={createTenantForm.handleSubmit(onCreateTenant)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-tenant-name">Clinic Name</Label>
              <Input id="input-tenant-name" {...createTenantForm.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-owner-name">Owner Name</Label>
              <Input id="input-owner-name" {...createTenantForm.register('ownerName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-owner-email">Owner Email</Label>
              <Input id="input-owner-email" type="email" {...createTenantForm.register('ownerEmail')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-owner-phone">Phone (optional)</Label>
              <Input id="input-owner-phone" {...createTenantForm.register('ownerPhone')} />
            </div>
            <div className="flex gap-3">
              <Button id="btn-create-tenant-submit" type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? 'Creating…' : 'Create Tenant'}
              </Button>
              <Button id="btn-create-tenant-cancel" type="button" variant="outline" onClick={() => setShowCreateTenant(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issued Key Dialog */}
      <Dialog open={Boolean(issuedKey)} onOpenChange={() => { setIssuedKey(null); navigate(`/licenses/${issuedLicenseId}`); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              ✅ License Issued Successfully
            </DialogTitle>
            <DialogDescription>
              Save this API key now — <strong>it will never be shown again</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
              <AlertTriangle className="ml-2 h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-mono text-xs break-all px-2 py-1 flex-1">{issuedKey}</span>
              <Button id="btn-copy-api-key" type="button" variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Provide this key to the tenant. They must pass it as{' '}
              <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code> in API requests.
            </p>
            <Button
              id="btn-go-to-license"
              className="w-full"
              onClick={() => { setIssuedKey(null); navigate(`/licenses/${issuedLicenseId}`); }}
            >
              View License →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
