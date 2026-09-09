'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { definitions, display, emptyDataset, labels, recordLabel, requestApi, resourceNames, type Dataset, type RecordData, type Resource } from '@/lib/resources';
import { RequestFilters, emptyRequestFilters } from './request-filters';
import { Editor } from './editor';
import { SchedulingWorkspace } from './scheduling-workspace';
type Section = Resource | 'overview';
export function Admin({ username }: { username: string }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<Dataset>(emptyDataset);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [requestFilters, setRequestFilters] = useState(emptyRequestFilters);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ resource: Resource; record: RecordData | null } | null>(null);
  const [deleting, setDeleting] = useState<RecordData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const generation = useRef(0);
  const load = useCallback(() => {
    const version = ++generation.current;
    return Promise.allSettled(resourceNames.map(async resource => [resource, await requestApi(resource)] as const)).then(results => {
    if (version !== generation.current) return;
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'No se pudieron cargar los registros.');
    else { setData(Object.fromEntries(results.map(result => (result as PromiseFulfilledResult<readonly [Resource, RecordData[]]>).value)) as Dataset); setLoaded(true); setError(''); }
    setLoading(false);
    });
  }, []);
  const cancelLoad = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void load(); return cancelLoad; }, [load, cancelLoad]);
  function refresh() { setLoading(true); setError(''); void load(); }
  function navigate(next: Section) { setRequestFilters(emptyRequestFilters); setSection(next); setSearch(''); setStatus('all'); setPage(1); setNotice(''); setDeleting(null); }
  async function logout() {
    setBusy(true);
    try { const response = await fetch('/api/session', { method: 'DELETE' }); if (!response.ok) throw new Error(); router.replace('/login'); router.refresh(); }
    catch { setError('No se pudo cerrar sesión. Reintentá.'); setBusy(false); }
  }
  async function confirmBooking(row: RecordData) {
    if (busy || loading) return;
    if (!window.confirm('¿Confirmar el turno de ' + recordLabel(data, 'booking-drafts', row) + ' para el ' + display(data, 'date', row.date) + ' a las ' + row.bookingTime + '? El horario quedará reservado.')) return;
    setBusy(true); setError('');
    try { await requestApi('booking-drafts', 'POST', {}, row.id + '/confirm'); await load(); setNotice('Solicitud confirmada. El horario quedó reservado.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo confirmar.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || section === 'overview' || busy) return;
    setBusy(true); setError('');
    try { await requestApi(section, 'DELETE', undefined, deleting.id); setData(previous => ({ ...previous, [section]: previous[section].filter(row => row.id !== deleting.id) })); setDeleting(null); setNotice('Registro eliminado.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    finally { setBusy(false); }
  }
  const requestRows: RecordData[] = data['booking-drafts'].map(row => {
    const slot = data.slots.find(slot => slot.id === row.slotId);
    const start = row.startsAt ?? slot?.startsAt;
    const end = row.endsAt ?? slot?.endsAt;
    const time = (value: RecordData[string]) => new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(String(value)));
    return { ...row, status: row.status ?? 'PENDING_CONFIRMATION', bookingTime: start && end ? time(start) + ' – ' + time(end) : 'Sin horario elegido' };
  });
  const hasFilters = Boolean(search || status !== 'all' || (section === 'booking-drafts' && Object.values(requestFilters).some(Boolean)));
  const definition = section === 'overview' ? null : definitions[section];
  const rows = section === 'overview' ? [] : (section === 'booking-drafts' ? requestRows : data[section]).filter(row => {
    const matchesSearch = definitions[section].columns.some(key => display(data, key, row[key]).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
    if (section === 'booking-drafts') {
      const date = String(row.date ?? '');
      const { state, venueId, sportId, from, to } = requestFilters;
      return matchesSearch && (!state || row.status === state) && (!venueId || row.venueId === venueId) && (!sportId || row.sportId === sportId)
        && (!(from || to) || Boolean(date)) && (!from || date >= from) && (!to || date <= to);
    }
    return matchesSearch && (status === 'all' || (status === 'active' ? row.isActive === true || row.status === 'AVAILABLE' : row.isActive === false || row.status === 'UNAVAILABLE'));
  });
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const currentPage = Math.min(page, pages);
  const title = definition?.title ?? 'Resumen general';
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/" aria-label="Turnero inicio"><Image className="brand-icon" src="/turnerop-backoffice-icon.svg" width={35} height={35} alt="" /> turnero<span className="brand-tag">ADMIN</span></Link><div className="workspace"><span className="workspace-symbol">▦</span><div><strong>Polideportivos</strong><small>Espacio de administración</small></div></div><span className="nav-label">PRINCIPAL</span><nav aria-label="Navegación principal"><button className={section === 'overview' ? 'selected' : ''} onClick={() => navigate('overview')}><span>◫</span>Resumen general</button><span className="nav-label">GESTIÓN</span>{resourceNames.map(resource => <button key={resource} className={section === resource ? 'selected' : ''} onClick={() => navigate(resource)}><span>{definitions[resource].icon}</span>{definitions[resource].title}{loaded && <small>{data[resource].length}</small>}</button>)}</nav><div className="sidebar-bottom"><span className="avatar">{username.slice(0, 2).toUpperCase()}</span><div><strong>{username}</strong><small>Administrador</small></div><button className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={busy} onClick={logout}>↪</button></div></aside><div className="main"><header className="topbar"><span>Administración <b>/</b> <strong>{title}</strong></span><span className="access"><i /> Acceso administrativo</span></header><main className="content"><div className="page-heading"><div><span className="eyebrow">PANEL DE CONTROL</span><h1>{title}</h1><p>{definition?.description ?? 'Una mirada a tus sedes, actividades y disponibilidad.'}</p></div><div className="heading-actions"><button className="secondary" disabled={loading || busy} onClick={refresh}>↻ {loading ? 'Actualizando…' : 'Actualizar'}</button>{definition && <button className="primary" disabled={!loaded || loading} onClick={() => setEditor({ resource: section as Resource, record: null })}>＋ Crear {definition.singular}</button>}</div></div>{error && <div role="alert" className="notice error">{error} <button disabled={loading} onClick={refresh}>Reintentar</button></div>}{notice && <div role="status" className="notice success">✓ {notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}{loaded && error && <p className="muted">Se muestran los últimos datos cargados. Actualizá antes de continuar.</p>}{loading && !loaded ? <div className="loading" role="status"><span className="spinner" />Cargando información de la API…</div> : !loaded ? <div className="empty"><span>⌁</span><h2>No pudimos cargar el panel</h2><p>Verificá la conexión y usá Reintentar.</p></div> : section === 'overview' ? <><div className="stats">{(['venues', 'sports', 'slots', 'booking-drafts'] as Resource[]).map(resource => <button className="stat" key={resource} onClick={() => navigate(resource)}><div><span>{definitions[resource].title}</span><span className="stat-icon">{definitions[resource].icon}</span></div><strong>{data[resource].length}</strong><small>{resource === 'slots' ? `${data.slots.filter(row => row.status === 'AVAILABLE' && Date.parse(String(row.startsAt)) > Date.now()).length} futuros disponibles` : resource === 'booking-drafts' ? `${data['booking-drafts'].filter(row => row.status === 'CONFIRMED').length} confirmadas` : `${data[resource].filter(row => row.isActive).length} en actividad`} <span>↗</span></small></button>)}</div><div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Tus sedes</h2><p>Los espacios que hacen posible el juego.</p></div><button className="text-button" onClick={() => navigate('venues')}>Ver todas →</button></div>{data.venues.length ? <div className="venue-list">{data.venues.slice(0, 5).map(venue => <button key={venue.id} onClick={() => { navigate('venues'); setEditor({ resource: 'venues', record: venue }); }}><span className="venue-icon">▦</span><div><strong>{String(venue.name)}</strong><small>{display(data, 'zoneId', venue.zoneId)} · {String(venue.address)}</small></div><span className={`badge ${venue.isActive ? 'green' : ''}`}>{venue.isActive ? 'Activa' : 'Inactiva'}</span><span>→</span></button>)}</div> : <div className="empty"><span>▦</span><h3>Tu primera sede empieza acá</h3><p>Cargá una zona y agregá los datos de tu espacio deportivo.</p><button className="primary" onClick={() => navigate(data.zones.length ? 'venues' : 'zones')}>{data.zones.length ? 'Crear una sede' : 'Configurar zonas'} →</button></div>}</section><section className="guide"><span className="eyebrow">TODO LISTO PARA JUGAR</span><h2>Tu operación,<br />paso a paso.</h2><p>Completá el catálogo para que las personas puedan encontrar su próximo turno.</p><ol>{(['sports', 'zones', 'venues', 'venue-sports', 'slots'] as Resource[]).map((resource, index) => <li key={resource}><button onClick={() => navigate(resource)}><span className={data[resource].length ? 'done' : ''}>{data[resource].length ? '✓' : index + 1}</span>{definitions[resource].title}<b>→</b></button></li>)}</ol></section></div><section className="notice info"><span>ⓘ</span><div><strong>Confirmá las solicitudes desde el panel</strong><p>Revisá los datos y usá Confirmar turno en Solicitudes. Hasta ese momento, el horario continúa disponible.</p></div></section></> : <SchedulingWorkspace enabled={section === 'slots'} data={data} changed={refresh}><section className="panel"><div className="table-toolbar"><label className="search"><span>⌕</span><input aria-label="Buscar registros" placeholder={`Buscar en ${definition!.title.toLowerCase()}…`} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>{['sports', 'venues', 'venue-sports', 'slots'].includes(section) && <select aria-label="Filtrar por estado" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">Todos los estados</option><option value="active">{section === 'slots' ? 'Disponibles' : 'Activos'}</option><option value="inactive">{section === 'slots' ? 'Bloqueados' : 'Inactivos'}</option></select>}<span className="count" aria-live="polite">{rows.length} registros</span></div>{section === 'booking-drafts' && <RequestFilters value={requestFilters} data={data} change={value => { setRequestFilters(value); setPage(1); setDeleting(null); }} clear={() => { setRequestFilters(emptyRequestFilters); setSearch(''); setPage(1); setDeleting(null); }} />}{deleting && <div className="delete-confirm" role="alert"><div><strong>¿Eliminar {recordLabel(data, section, deleting)}?</strong><p>La eliminación es permanente. Si tiene dependencias, la API impedirá el borrado.</p></div><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="danger" disabled={busy} onClick={remove}>{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button></div>}{rows.length ? <><div className="table-scroll"><table><thead><tr>{definition!.columns.map(key => <th key={key}>{labels[key]}</th>)}<th className="actions-column">Acciones</th></tr></thead><tbody>{rows.slice((currentPage - 1) * 12, currentPage * 12).map(row => <tr key={row.id}>{definition!.columns.map((key, index) => <td key={key}>{key === 'isActive' || key === 'status' ? <span className={`badge ${row[key] === true || row[key] === 'AVAILABLE' || row[key] === 'CONFIRMED' ? 'green' : row[key] === 'RESERVED' ? 'reserved' : ''}`}>{display(data, key, row[key])}</span> : index === 0 ? <strong>{display(data, key, row[key])}</strong> : display(data, key, row[key])}</td>)}<td className="row-actions">{section === 'booking-drafts' && row.status !== 'CONFIRMED' && <button className="text-button" disabled={busy || loading || !row.slotId || !row.renterFirstName || !row.renterLastName || !row.renterPhone} onClick={() => confirmBooking(row)}>Confirmar turno</button>}<button className="text-button" disabled={busy || loading || row.status === 'CONFIRMED' || row.status === 'RESERVED'} onClick={() => { setDeleting(null); setEditor({ resource: section, record: row }); }}>Editar</button><button className="text-button delete" disabled={busy || loading || row.status === 'CONFIRMED' || row.status === 'RESERVED'} onClick={() => { setError(''); setDeleting(row); }}>Eliminar</button></td></tr>)}</tbody></table></div><footer className="pagination"><span>Página {currentPage} de {pages}</span><div><button className="secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Anterior</button><button className="secondary" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Siguiente →</button></div></footer></> : <div className="empty"><span>{definition!.icon}</span><h2>{hasFilters ? 'No encontramos resultados' : `Todavía no hay ${definition!.title.toLowerCase()}`}</h2><p>{hasFilters ? 'Probá otra búsqueda o cambiá los filtros.' : `Creá tu primer registro para comenzar.`}</p>{!hasFilters && <button className="primary" onClick={() => setEditor({ resource: section, record: null })}>＋ Crear {definition!.singular}</button>}</div>}</section></SchedulingWorkspace>}<footer className="page-footer"><span>turnero · Administración</span><span>Horarios en Buenos Aires · UTC−3</span></footer></main></div>{editor && <Editor resource={editor.resource} record={editor.record} data={data} close={() => setEditor(null)} saved={row => { setData(previous => ({ ...previous, [editor.resource]: editor.record ? previous[editor.resource].map(item => item.id === row.id ? row : item) : [...previous[editor.resource], row] })); setEditor(null); setNotice('Cambios guardados correctamente.'); }} />}</div>;
}
