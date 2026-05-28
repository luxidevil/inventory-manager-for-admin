import { useListUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";
import { Users, Trash2, ShieldCheck } from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  bulk_seller: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reseller: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  small_seller: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ROLES = ["admin", "bulk_seller", "reseller", "small_seller"];

export default function UsersPage() {
  const { toast } = useToast();
  const { data: users = [], isLoading, refetch } = useListUsers({} as any);
  const patchMutation = useUpdateUser({ mutation: { onSuccess: () => { toast({ title: "User updated" }); refetch(); } } });
  const deleteMutation = useDeleteUser({ mutation: { onSuccess: () => refetch() } });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />Users
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage platform users (admin only)</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (users as any[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No users found.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(users as any[]).map((user: any) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{user.name}</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-700")}>{user.role?.replace(/_/g, " ")}</span>
                    {!user.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email} · Joined {formatDate(user.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select value={user.role} onValueChange={v => patchMutation.mutate({ id: user.id, data: { role: v } as any })}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete user?")) deleteMutation.mutate({ id: user.id }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
