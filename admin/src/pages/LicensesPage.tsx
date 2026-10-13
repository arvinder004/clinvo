import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Eye } from 'lucide-react';
import { useLicenses, type LicenseWithNames } from '@/hooks/useLicenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function statusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge variant="success">Active</Badge>;
    case 'paused': return <Badge variant="warning">Paused</Badge>;
    case 'expired': return <Badge variant="destructive">Expired</Badge>;
    case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function LicensesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useLicenses({
    page,
    pageSize: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const licenses: LicenseWithNames[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const filtered = search
    ? licenses.filter(
        (l) =>
          l.apiKeyPrefix.toLowerCase().includes(search.toLowerCase()) ||
          l.tenantName.toLowerCase().includes(search.toLowerCase()),
      )
    : licenses;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="input-license-search"
          placeholder="Search by key prefix or tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger id="select-license-status" className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button id="btn-issue-license" asChild>
            <Link to="/licenses/new">
              <Plus className="h-4 w-4" /> Issue License
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key Prefix</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-mono text-xs">{license.apiKeyPrefix}…</TableCell>
                    <TableCell>{license.tenantName}</TableCell>
                    <TableCell>{license.planName}</TableCell>
                    <TableCell>{statusBadge(license.status)}</TableCell>
                    <TableCell>
                      {license.expiresAt ? format(new Date(license.expiresAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {license.lastSeenAt ? format(new Date(license.lastSeenAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <Button id={`btn-view-license-${license.id}`} asChild variant="ghost" size="sm">
                        <Link to={`/licenses/${license.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} total licenses</span>
        <div className="flex items-center gap-2">
          <Button
            id="btn-licenses-prev"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button
            id="btn-licenses-next"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
