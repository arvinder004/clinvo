import { useState } from 'react';
import { format } from 'date-fns';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TenantsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTenants(page, 20);

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <Card>
          <CardHeader><CardTitle>Tenants ({total})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.ownerName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tenant.ownerEmail}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tenant.ownerPhone ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tenant.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} total tenants</span>
        <div className="flex items-center gap-2">
          <Button id="btn-tenants-prev" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button id="btn-tenants-next" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
