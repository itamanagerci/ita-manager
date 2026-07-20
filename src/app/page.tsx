import { redirect } from "next/navigation";

// Filet de sécurité : le middleware gère déjà la redirection principale
// session oui/non, cette page ne devrait normalement jamais être rendue.
export default function RootPage() {
  redirect("/login");
}
