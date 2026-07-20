import "server-only";
import { Resend } from "resend";

/**
 * Client Resend — câblé dans ce lot mais non branché à un envoi métier réel
 * (aucun module métier n'existe encore). Les futurs modules (RH, Achat...)
 * l'utiliseront pour leurs notifications par email.
 */
export const resend = new Resend(process.env.RESEND_API_KEY);
