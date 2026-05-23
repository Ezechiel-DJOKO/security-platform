import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard?error=unauthorized");

  return (
    <div style={{ padding: 20 }}>
      <h1>Gestion des utilisateurs</h1>
      <p>Page réservée aux administrateurs</p>
      <p>Connecté en tant que : {session.user.name} ({session.user.role})</p>
    </div>
  );
}
