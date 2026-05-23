// app/dashboard/page.tsx (serveur)
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  
  return <div>Bienvenue {session.user.name} ({session.user.role})</div>;
}