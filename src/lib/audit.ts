import { prisma } from "./prisma";
import { TypeAction, EntiteCible, Prisma } from "@prisma/client";

interface AuditLogParams {
  idUtilisateur?: string;
  action: TypeAction;
  entite: EntiteCible;
  idEntite?: string;
  // Correction : utiliser le type Prisma pour Json
  details?: Prisma.InputJsonValue;
  ipAdresse?: string;
  userAgent?: string;
}

/**
 * Enregistre une action dans l'audit trail
 */
export async function logAction(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        idUtilisateur: params.idUtilisateur,
        action: params.action,
        entite: params.entite,
        idEntite: params.idEntite,
        // Correction : utiliser Prisma.DbNull pour null explicite
        details: params.details ?? Prisma.DbNull,
        ipAdresse: params.ipAdresse ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[Audit] Erreur lors de l'enregistrement:", error);
  }
}

/**
 * Helper pour logger les actions d'authentification
 */
export async function logAuth(
  idUtilisateur: string | undefined,
  action: "CONNEXION" | "DECONNEXION",
  ipAdresse?: string,
  userAgent?: string
) {
  return logAction({
    idUtilisateur,
    action: action as TypeAction,
    entite: "UTILISATEUR",
    idEntite: idUtilisateur,
    ipAdresse,
    userAgent,
  });
}

/**
 * Helper pour logger les opérations CRUD
 */
export async function logCRUD(
  idUtilisateur: string | undefined,
  action: "CREATION" | "MODIFICATION" | "SUPPRESSION" | "LECTURE",
  entite: EntiteCible,
  idEntite: string,
  details?: Record<string, any>,
  ipAdresse?: string,
  userAgent?: string
) {
  return logAction({
    idUtilisateur,
    action: action as TypeAction,
    entite,
    idEntite,
    details,
    ipAdresse,
    userAgent,
  });
}

/**
 * Récupère l'historique d'audit pour une entité
 */
export async function getAuditHistory(
  entite: EntiteCible,
  idEntite: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entite,
      idEntite,
    },
    orderBy: {
      dateAction: "desc",
    },
    take: limit,
    include: {
      utilisateur: {
        select: {
          nom: true,
          prenom: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Récupère les actions d'un utilisateur
 */
export async function getUserAuditHistory(
  idUtilisateur: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      idUtilisateur,
    },
    orderBy: {
      dateAction: "desc",
    },
    take: limit,
  });
}
