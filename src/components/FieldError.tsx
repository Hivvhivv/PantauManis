import type { ApiError } from "@/lib/api-client";

export function FieldError({ error, name }: { error: ApiError | null; name: string }) {
  const msg = error?.fields[name];
  if (!msg) return null;
  return (
    <p className="field-error" role="alert">
      {msg}
    </p>
  );
}
