// src/app/dashboard/page.tsx
import { auth } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>
      <p>Bienvenue {session.user.name} ({session.user.role})</p>
      <nav>
        <Link href="/scans">Scans</Link> |{" "}
        <Link href="/vulnerabilites">Vulnérabilités</Link> |{" "}
        <Link href="/plans">Plans</Link> |{" "}
        <Link href="/rapports">Rapports</Link> |{" "}
        {session.user.role === "ADMIN" && <Link href="/users">Utilisateurs</Link>}
      </nav>
    </div>
  );
}