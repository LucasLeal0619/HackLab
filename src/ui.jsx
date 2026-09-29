import { useEffect, useState } from 'react'
import { navActive, navFor } from './model'
import { go, useHack } from './store'

const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',
  users: 'M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1a3 3 0 0 0-2.2-2.9M16 6.1a3 3 0 0 1 0 5.8',
  team: 'M8 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6M4 19c.5-2 2.2-3 4-3s3.5 1 4 3M12 19c.5-2 2.2-3 4-3s3.5 1 4 3',
  building: 'M4 20V6l8-3 8 3v14M9 20v-5h6v5M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  calendar: 'M5 6h14v14H5zM8 4v4M16 4v4M5 10h14',
  chart: 'M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6',
  bolt: 'M13 3 5 14h7l-1 7 8-11h-7z',
  star: 'm12 3 2.4 5.4L20 9.2l-4 4.1.9 5.7L12 16.4 7.1 19l.9-5.7-4-4.1 5.6-.8z',
  trophy: 'M8 4h8v4a4 4 0 0 1-8 0zM6 5H4a3 3 0 0 0 3 4M18 5h2a3 3 0 0 1-3 4M9 20h6M12 14v6',
  bell: 'M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15zM10 19a2 2 0 0 0 4 0',
  access: 'M12 3a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v8H5v-8a2 2 0 0 1 2-2h1V7a4 4 0 0 1 4-4z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  lock: 'M8 10V8a4 4 0 0 1 8 0v2M6 10h12v10H6z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  check: 'M5 12.5 9.2 17 19 7',
  logout: 'M10 7V5H5v14h5v-2M10 12h9M16 9l3 3-3 3',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  x: 'M6 6l12 12M18 6 6 18',
}

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.info} />
    </svg>
  )
}

export function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? 'on-light' : ''}`}>
      <img className="logo-img" src={light ? '/senac-logo-color.png?v=3' : '/senac-logo-white.png?v=3'} alt="Senac" />
      <div className="logo-name"><span className="hack">Hack</span><span className="lab">Lab</span></div>
    </div>
  )
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function toneFor(status = '') {
  const value = status.toLowerCase()
  if (/(urg|problem|alta|inativ|ausente|inválid)/.test(value)) return 'danger'
  if (/(aprov|conclu|confirm|presente|ativo|funcion|liberad|resolvid)/.test(value)) return 'ok'
  if (/(andamento|análise|pendent|breve|montag|aguard|revis)/.test(value)) return 'warn'
  if (/(planej|distrib|recebid|consulta)/.test(value)) return 'info'
  if (/(não inici|nao inici|rascunh|sem )/.test(value)) return ''
  return 'orange'
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button type="button" key={tab.id} role="tab" aria-selected={value === tab.id} className={value === tab.id ? 'on' : ''} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, required, error, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span>{label}{required ? <em>*</em> : null}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function Modal({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar" title="Fechar"><Icon name="x" size={16} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  )
}

export function Drawer({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-back" onMouseDown={onClose}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar" title="Fechar"><Icon name="x" size={16} /></button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </aside>
    </div>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true"><Icon name="info" size={18} /></div>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  )
}

export function Next({ label, to }) {
  if (!label) return null
  return (
    <div className="nextbar">
      <button className="btn ghost" onClick={() => go(to)}>Próxima etapa: {label}</button>
    </div>
  )
}

export function NextStep({ title, text, action, to }) {
  if (!action) return null
  return (
    <section className="next-step">
      <div>
        <p className="kicker">Próxima etapa</p>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <button className="btn" type="button" onClick={() => go(to)}>{action}</button>
    </section>
  )
}

export function FocusFrame({ title, exitTo = 'inicio', children }) {
  return (
    <div className="focus-app">
      <header className="focus-bar">
        <Logo light />
        <strong>{title}</strong>
        <button className="btn ghost" type="button" onClick={() => go(exitTo)}>Voltar</button>
      </header>
      <main>{children}</main>
    </div>
  )
}

function Crumbs({ crumbs }) {
  const parts = String(crumbs).split(/\s*\/\s*/).filter(Boolean)
  return (
    <nav className="crumbs" aria-label="Localização">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="crumb">
          {index > 0 ? <span className="crumb-sep" aria-hidden="true">/</span> : null}
          {index === parts.length - 1 ? <b>{part}</b> : part}
        </span>
      ))}
    </nav>
  )
}

export function Page({ crumbs, title, subtitle, actions, children, next }) {
  return (
    <div className="page">
      {crumbs ? <Crumbs crumbs={crumbs} /> : null}
      <div className="page-head">
        <div className="page-title">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {children}
      {next ? <Next {...next} /> : null}
    </div>
  )
}

export function Search({ value, onChange, placeholder }) {
  return (
    <div className="input-icon">
      <Icon name="search" size={16} />
      <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

export function Stat({ icon, label, value, hint }) {
  return (
    <article className="card stat">
      <div className="stat-label">
        {icon ? <span className="stat-icon"><Icon name={icon} size={16} /></span> : null}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  )
}

function A11yPanel({ onClose }) {
  const { state, setA11y, resetA11y } = useHack()
  const { a11y } = state
  return (
    <div className="popover" role="dialog" aria-label="Acessibilidade">
      <div className="row-between"><h3>Acessibilidade</h3><button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar" title="Fechar"><Icon name="x" size={16} /></button></div>
      <Field label="Tamanho da fonte" hint="Aumentar ou diminuir o texto">
        <div className="row-between">
          <button className="btn ghost small" onClick={() => setA11y({ scale: Math.max(90, a11y.scale - 10) })}>A−</button>
          <strong>{a11y.scale}%</strong>
          <button className="btn ghost small" onClick={() => setA11y({ scale: Math.min(140, a11y.scale + 10) })}>A+</button>
        </div>
      </Field>
      <label className="check"><input type="checkbox" checked={a11y.contrast} onChange={(event) => setA11y({ contrast: event.target.checked })} /> Alto contraste</label>
      <label className="check"><input type="checkbox" checked={a11y.focus} onChange={(event) => setA11y({ focus: event.target.checked })} /> Destacar foco</label>
      <label className="check"><input type="checkbox" checked={a11y.motion} onChange={(event) => setA11y({ motion: event.target.checked })} /> Reduzir animações</label>
      <Field label="Ajustar espaçamento">
        <div className="chips">
          {[['padrao', 'Padrão'], ['confortavel', 'Confortável'], ['amplo', 'Amplo']].map(([id, label]) => (
            <button key={id} className={`chip ${a11y.spacing === id ? 'on' : ''}`} onClick={() => setA11y({ spacing: id })}>{label}</button>
          ))}
        </div>
      </Field>
      <button className="btn ghost small" onClick={resetA11y}>Restaurar padrão</button>
    </div>
  )
}

function Alerts({ onClose }) {
  const { state } = useHack()
  const items = [
    ...state.equipment.filter((item) => item.status === 'Com problema').map((item) => `Equipamento com problema · ${item.name} · ${item.place}`),
    ...state.occurrences.filter((item) => item.priority === 'Urgente' && item.status !== 'Resolvida').map((item) => `Ocorrência urgente · ${item.title} · ${item.place}`),
    ...state.occurrences.filter((item) => item.status !== 'Resolvida' && /sala|estrutura|material/i.test(`${item.category} ${item.place}`) && item.priority !== 'Urgente').map((item) => `Sala com problema · ${item.title} · ${item.place || '—'}`),
    ...(state.students.length && state.students.some((student) => !state.checkins.some((item) => item.personId === student.id && item.status === 'Presente'))
      ? [`Presença pendente · ${state.students.filter((student) => !state.checkins.some((item) => item.personId === student.id && item.status === 'Presente')).length} participante(s) sem registro`]
      : []),
    ...state.tasks.filter((item) => item.status !== 'Concluído').map((item) => `Pendência · ${item.title}`),
  ]
  return (
    <div className="popover" role="dialog" aria-label="Alertas">
      <div className="row-between"><h3>Alertas</h3><button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar" title="Fechar"><Icon name="x" size={16} /></button></div>
      {items.length === 0 ? <p className="stat-hint">Tudo certo! Nenhum alerta no momento.</p> : (
        <div className="menu-list">
          {items.map((item) => <p key={item}>{item}</p>)}
        </div>
      )}
      <button className="btn ghost small" onClick={() => { onClose(); go('gestao?aba=pendencias') }}>Ver pendências</button>
    </div>
  )
}

export function Shell({ path, children }) {
  const { state, logout, setProfile, loadDemo, resetAll, update } = useHack()
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState('')
  const session = state.session
  const alertCount = state.tasks.filter((item) => item.status !== 'Concluído').length
    + state.occurrences.filter((item) => item.status !== 'Resolvida').length

  useEffect(() => {
    setPanel('')
    setOpen(false)
  }, [path])

  useEffect(() => {
    if (!panel) return undefined
    function onPointer(event) {
      if (event.target.closest('.top-tools')) return
      setPanel('')
    }
    function onKey(event) {
      if (event.key === 'Escape') setPanel('')
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])

  return (
    <div className="shell">
      <a className="skip" href="#conteudo">Ir para o conteúdo</a>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-brand"><Logo /></div>
        {navFor(session?.profile).map((group) => (
          <div className="nav-group" key={group.group}>
            <p className="nav-label">{group.group}</p>
            {group.items.map((item) => {
              const active = navActive(item.id, path)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => { go(item.id); setOpen(false); setPanel('') }}
                >
                  <Icon name={item.icon} /> {item.label}
                </button>
              )
            })}
          </div>
        ))}
        <div className="side-foot">Protótipo local · dados neste navegador</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-btn menu-btn" type="button" aria-label="Abrir menu" title="Abrir menu" onClick={() => setOpen((value) => !value)}><Icon name="grid" /></button>
          <div className="top-tools">
            {state.demo ? <span className="demo-badge">Modo demonstração</span> : null}
            <div className="tool">
              <button className="icon-btn" type="button" aria-label="Alertas" title="Alertas" onClick={() => setPanel(panel === 'alerts' ? '' : 'alerts')}>
                <Icon name="bell" />
                {alertCount > 0 ? <span className="dot" /> : null}
              </button>
              {panel === 'alerts' ? <Alerts onClose={() => setPanel('')} /> : null}
            </div>
            <div className="tool">
              <button className="a11y-btn" type="button" onClick={() => setPanel(panel === 'a11y' ? '' : 'a11y')}><Icon name="access" size={16} /> Acessibilidade</button>
              {panel === 'a11y' ? <A11yPanel onClose={() => setPanel('')} /> : null}
            </div>
            <div className="tool">
              <button className="user-btn" type="button" onClick={() => setPanel(panel === 'user' ? '' : 'user')}>
                <span className="avatar"><Icon name="users" size={16} /></span>
                <span className="user-meta">
                  <b>{session?.name || 'Usuário'}</b>
                  <span><span className="status-dot" /> {session?.profile}</span>
                </span>
              </button>
              {panel === 'user' ? (
                <div className="popover" role="menu">
                  <div className="row-between"><h3>Meu perfil</h3><button className="icon-btn" type="button" onClick={() => setPanel('')} aria-label="Fechar" title="Fechar"><Icon name="x" size={16} /></button></div>
                  <p className="stat-hint">{session?.email}<br />{session?.sector} · {session?.role}</p>
                  <p className="stat-hint">Protótipo: clique em um perfil de acesso para ver a regra visual.</p>
                  <div className="chips">
                    {['Administrador', 'Consultor', 'Editor'].map((profile) => (
                      <button key={profile} type="button" className={`chip ${session?.profile === profile ? 'on' : ''}`} onClick={() => setProfile(profile)}>{profile}</button>
                    ))}
                  </div>
                  <div className="menu-list">
                    {session?.profile !== 'Editor' ? <button type="button" onClick={() => { setPanel(''); go('preparacao?aba=evento') }}>Configuração do evento</button> : null}
                    <button type="button" onClick={loadDemo}>Dados demonstrativos</button>
                    <button type="button" onClick={resetAll}>Limpar dados do protótipo</button>
                    <button type="button" onClick={logout}><Icon name="logout" size={16} /> Sair</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="content" id="conteudo">{children}</main>
      </div>
      {state.session && !state.welcome ? (
        <Modal
          title="Como deseja explorar o HackLab?"
          subtitle="Você pode carregar um cenário demonstrativo para conhecer todas as áreas do protótipo ou começar com os dados vazios."
          onClose={() => update((draft) => { draft.welcome = 'vazio' })}
          footer={(
            <>
              <button className="btn ghost" type="button" onClick={() => update((draft) => { draft.welcome = 'vazio' })}>Começar vazio</button>
              <button className="btn" type="button" onClick={loadDemo}>Explorar com dados demonstrativos</button>
            </>
          )}
        >
          <p>O cenário demonstrativo fica neste navegador e pode ser carregado de novo em Perfil, Dados demonstrativos.</p>
        </Modal>
      ) : null}
    </div>
  )
}

export function useModal() {
  const [modal, setModal] = useState(null)
  return { modal, open: setModal, close: () => setModal(null) }
}
