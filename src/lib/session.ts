// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export const auth = () => getServerSession(authOptions);