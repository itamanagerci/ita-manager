import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Enveloppe Label + champ + texte d'aide/erreur — remplace le pattern
 * `<div className="space-y-2"><Label/><Input/>{error && ...}</div>` dupliqué
 * dans tous les formulaires. Ne possède pas le champ lui-même (reste un
 * <Input>/<NativeSelect> passé en children) pour rester compatible avec
 * `register()` de react-hook-form sans wrapper de contrôle.
 */
export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="font-semibold">
        {label}
      </Label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-sm text-status-danger">{error}</p>}
    </div>
  );
}
