import { auth } from "@/lib/session"; // Changé de @/auth à @/lib/session
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  // Vérification du rôle ADMIN
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Gestion des Utilisateurs</h1>
      <p>Connecté en tant que : {session.user.name} ({session.user.role})</p>
      <Link href="/dashboard">← Retour au Dashboard</Link>
    </div>
  );
}