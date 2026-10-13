import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePlans, useCreatePlan } from '@/hooks/usePlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2 } from 'lucide-react';

const createPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  priceInr: z.coerce.number().positive('Price must be positive'),
});

type CreatePlanForm = z.infer<typeof createPlanSchema>;

export function PlansPage() {
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<{ key: string; value: string }[]>([]);

  const form = useForm<CreatePlanForm>({ resolver: zodResolver(createPlanSchema) });

  const onSubmit = (data: CreatePlanForm) => {
    const featuresMap: Record<string, string> = {};
    for (const { key, value } of features) {
      if (key.trim()) featuresMap[key.trim()] = value;
    }
    createPlan.mutate(
      { ...data, features: featuresMap },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          setFeatures([]);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button id="btn-create-plan" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Plan
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <Card>
          <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price (₹/yr)</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plans ?? []).map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      {plan.description && <div className="text-xs text-muted-foreground">{plan.description}</div>}
                    </TableCell>
                    <TableCell>₹{plan.priceInr.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Object.keys(plan.features).length} feature(s)
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
            <DialogDescription>Define a subscription plan with features.</DialogDescription>
          </DialogHeader>
          <form id="form-create-plan" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-plan-name">Plan Name</Label>
              <Input id="input-plan-name" {...form.register('name')} placeholder="Basic / Pro / Enterprise" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-plan-desc">Description (optional)</Label>
              <Input id="input-plan-desc" {...form.register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-plan-price">Price (₹/year)</Label>
              <Input id="input-plan-price" type="number" {...form.register('priceInr')} />
              {form.formState.errors.priceInr && (
                <p className="text-xs text-destructive">{form.formState.errors.priceInr.message}</p>
              )}
            </div>

            {/* Dynamic features */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <Button
                  id="btn-add-plan-feature"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFeatures((prev) => [...prev, { key: '', value: '' }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    id={`input-plan-feature-key-${i}`}
                    placeholder="key"
                    value={f.key}
                    onChange={(e) => {
                      const updated = [...features];
                      updated[i] = { ...updated[i]!, key: e.target.value };
                      setFeatures(updated);
                    }}
                    className="font-mono text-xs"
                  />
                  <Input
                    id={`input-plan-feature-value-${i}`}
                    placeholder="value"
                    value={f.value}
                    onChange={(e) => {
                      const updated = [...features];
                      updated[i] = { ...updated[i]!, value: e.target.value };
                      setFeatures(updated);
                    }}
                    className="font-mono text-xs"
                  />
                  <Button
                    id={`btn-remove-plan-feature-${i}`}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFeatures((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button id="btn-create-plan-cancel" type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button id="btn-create-plan-submit" type="submit" disabled={createPlan.isPending}>
                {createPlan.isPending ? 'Creating…' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
