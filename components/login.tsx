'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(values)) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
      router.replace('/'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); setBusy(false); }
  }
  return <main className="login"><section className="login-story"><div className="brand"><span className="brand-icon">t.</span> turnero<span className="brand-tag">ADMIN</span></div><div><span className="eyebrow">TU OPERACIÓN, EN UN SOLO LUGAR</span><h1>Más juego.<br />Mejor gestión.</h1><p>Administrá tus sedes, organizá la disponibilidad y mantené cada detalle al día.</p><div className="court" aria-hidden="true"><div /><span /></div></div><small>Panel administrativo de polideportivos</small></section><section className="login-form"><form onSubmit={submit}><span className="eyebrow">BIENVENIDO AL BACKOFFICE</span><h2>Ingresá a tu espacio</h2><p>Usá tus credenciales de administrador para continuar.</p><label>Usuario<input name="username" autoComplete="username" required maxLength={80} autoFocus /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={512} /></label>{error && <div role="alert" className="notice error">{error}</div>}<button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al panel →'}</button><small>Acceso exclusivo para administradores autorizados.</small></form></section></main>;
}
