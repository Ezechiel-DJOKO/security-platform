import Pusher from "pusher";
import { NextResponse } from "next/server";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  const { message } = await request.json();

  // Envoie flash à Pusher puis libère immédiatement la fonction serverless
  await pusher.trigger("alertes", "nouveau-message", { message });

  return NextResponse.json({ success: true });
}
