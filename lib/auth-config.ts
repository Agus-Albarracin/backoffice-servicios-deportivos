// Return configuration field names only; never include secret values in errors.
export function configurationIssues(env: Record<string, string | undefined> = process.env): string[] {
  const issues: string[] = [];
  if (!env.ADMIN_USERNAME?.trim()) issues.push('ADMIN_USERNAME (faltante)');
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH ?? ''))
    issues.push('ADMIN_PASSWORD_HASH (debe ser el hash completo, no la contraseña)');
  if ((env.SESSION_SECRET?.trim().length ?? 0) < 32)
    issues.push('SESSION_SECRET (mínimo 32 caracteres)');
  if (!env.MANAGEMENT_API_KEY?.trim()) issues.push('MANAGEMENT_API_KEY (faltante)');
  return issues;
}
