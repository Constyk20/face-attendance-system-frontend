import { Alert, Badge, Card, PageHeader } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import useFetch from "../hooks/useFetch";
import { getMe } from "../services/api";
import { getStoredUser, initials } from "../utils/format";

export default function Profile() {
  const me = useFetch(() => getMe().then((response) => response.data.user), []);
  const user = me.data || getStoredUser();

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account details." />
      <Alert onRetry={me.reload}>{me.error}</Alert>
      <Card className="max-w-xl">
        {!user ? (
          <div className="space-y-3" role="status" aria-label="Loading profile">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-950 text-xl font-semibold text-white">
              {initials(user.full_name)}
            </span>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
                <dd className="text-base font-semibold text-slate-800">{user.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex gap-2">
                <Badge color="blue">{user.role}</Badge>
                <Badge color={user.is_active ? "green" : "slate"}>{user.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
}
