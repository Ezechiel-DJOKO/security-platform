"use client";
import { useEffect, useState, useEffectEvent } from "react";
import Pusher from "pusher-js";

export default function AlertListener() {
  const [notification, setNotification] = useState<string>("");

  // Next.js 16 / React 19 native event handler extraction
  const onMessageReceived = useEffectEvent((data: { message: string }) => {
    setNotification(data.message);
  });

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("alertes");
    channel.bind("nouveau-message", onMessageReceived);

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []); // Plus besoin de passer onMessageReceived dans les dépendances grâce à useEffectEvent !

  return notification ? (
    <div className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400">
      ⚡ {notification}
    </div>
  ) : null;
}
