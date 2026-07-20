import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        Connectez-vous avec votre email et votre code d&apos;accès.
      </p>
      <LoginForm />
    </>
  );
}
