import { useState } from 'react'
import { SETORES, uid } from '../model'
import { useHack } from '../store'
import { Badge, Empty, Field, Icon, Modal, Page, Tabs, toneFor } from '../ui'

const MATRIX = [
  ['Dashboard', 'Permitido', 'Permitido', 'Permitido'],
  ['Configuração', 'Permitido', 'Consulta', 'Sem acesso'],
  ['Pessoas', 'Permitido', 'Permitido', 'Permitido'],
  ['Equipes', 'Permitido', 'Permitido', 'Permitido'],
  ['Empresas', 'Permitido', 'Permitido', 'Permitido'],
  ['Desafios', 'Permitido', 'Permitido', 'Permitido'],
  ['Setores', 'Todos', 'Consulta', 'Autorizados'],
  ['Modo Evento', 'Permitido', 'Permitido', 'Permitido'],
  ['Painel de Resultados', 'Permitido', 'Permitido', 'Consulta'],
  ['Reuniões e Atas', 'Permitido', 'Permitido', 'Permitido'],
  ['Documentos', 'Permitido', 'Permitido', 'Permitido'],
  ['Relatórios', 'Permitido', 'Permitido', 'Consulta'],
  ['Usuários e Permissões', 'Permitido', 'Sem acesso', 'Sem acesso'],
  ['Auditoria', 'Permitido', 'Sem acesso', 'Sem acesso'],
]

const emptyUser = { name: '', email: '', profile: 'Editor', status: 'Ativo', sector: '', sectors: [], role: '', password: '' }

export default function Config({ params }) {
  const { state, update, flash } = useHack()
  const admin = state.session?.profile === 'Administrador'
  const [tab, setTab] = useState(params.aba || 'hackathon')
  const [dated, setDated] = useState(Boolean(state.event.date))
  const [form, setForm] = useState(state.event)
  const [modal, setModal] = useState(null)
  const [user, setUser] = useState(emptyUser)
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState('Todos')
  const [showPassword, setShowPassword] = useState(false)

  function saveEvent(event) {
    event.preventDefault()
    update((draft) => { draft.event = { ...draft.event, ...form, date: dated ? form.date : '', days: 3, start: '08:00', end: '12:00' } })
    flash('Alterações da configuração salvas neste navegador.')
  }

  function openCreate() {
    setUser(emptyUser)
    setShowPassword(false)
    setModal('user')
  }

  function openEdit(item) {
    setUser({ ...item, password: '' })
    setShowPassword(false)
    setModal('user')
  }

  function saveUser(event) {
    event.preventDefault()
    const password = (user.password || '').trim()
    if (!user.name.trim() || !user.email.trim() || !user.sector || !user.role.trim()) {
      flash('Preencha nome, e-mail, setor e função.', 'err')
      return
    }
    if (!user.id && password.length < 4) {
      flash('Cadastre uma senha com pelo menos 4 caracteres.', 'err')
      return
    }
    if (user.id && password && password.length < 4) {
      flash('A nova senha precisa ter pelo menos 4 caracteres.', 'err')
      return
    }
    update((draft) => {
      const sectors = user.profile === 'Editor'
        ? (user.sectors?.length ? user.sectors : [user.sector])
        : (user.sectors || [])
      if (user.id) {
        const index = draft.users.findIndex((item) => item.id === user.id)
        if (index >= 0) {
          const current = draft.users[index]
          draft.users[index] = { ...current, ...user, name: user.name.trim(), email: user.email.trim(), sectors, password: password || current.password || '' }
        }
      } else {
        draft.users.push({ ...user, id: uid('usr'), name: user.name.trim(), email: user.email.trim(), sectors, password })
      }
    })
    setModal(null)
    flash(user.id ? 'Alterações do usuário salvas.' : 'Usuário cadastrado.')
  }

  const visible = state.users.filter((item) => {
    const text = `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase())
    return text && (profile === 'Todos' || item.profile === profile)
  })

  return (
    <Page
      crumbs="HackLab / Organização / Configuração do Hackathon"
      title="Configuração do Hackathon"
      subtitle="Defina as principais informações utilizadas na organização do evento."
    >
      <Tabs tabs={[{ id: 'hackathon', label: 'Hackathon' }, { id: 'usuarios', label: 'Usuários e Permissões' }]} value={tab} onChange={setTab} />
      {tab === 'hackathon' ? (
        <form onSubmit={saveEvent}>
          <section className="card form-section">
            <h3>Informações gerais</h3>
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Tema" hint="Opcional."><input className="input" placeholder="Informe o tema" value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} /></Field>
              <Field label="Descrição" className="span-2"><textarea className="input" placeholder="Descreva brevemente o Hackathon." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="Local"><input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            </div>
          </section>
          <section className="card form-section">
            <h3>Data e horário</h3>
            <label className="check">
              <input type="checkbox" checked={!dated} onChange={(event) => { setDated(!event.target.checked); if (event.target.checked) setForm({ ...form, date: '' }) }} />
              Data ainda não definida
            </label>
            {dated ? (
              <Field label="Data"><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            ) : (
              <p className="banner">A definir</p>
            )}
            <div className="grid cols-3 mt">
              <div><span className="stat-hint">Duração</span><p><b>3 dias</b></p></div>
              <div><span className="stat-hint">Início</span><p><b>08:00</b></p></div>
              <div><span className="stat-hint">Término</span><p><b>12:00</b></p></div>
            </div>
          </section>
          <section className="card form-section">
            <h3>Estrutura do evento</h3>
            <div className="day-cards">
              <div className="day-card"><b>Dia 1</b>Abertura e formação.</div>
              <div className="day-card"><b>Dia 2</b>Desenvolvimento.</div>
              <div className="day-card"><b>Dia 3</b>Apresentações e resultados.</div>
            </div>
          </section>
          <div className="page-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" onClick={() => { setForm(state.event); setDated(Boolean(state.event.date)) }}>Cancelar</button>
            <button className="btn" type="submit" disabled={!admin}>Salvar alterações</button>
          </div>
          {!admin ? <p className="stat-hint">Este perfil consulta a configuração. Só o Administrador salva alterações.</p> : null}
        </form>
      ) : (
        <div>
          <div className="page-actions" style={{ marginBottom: 12 }}>
            <button className="btn ghost" onClick={() => setModal('matriz')}>Ver matriz de acesso</button>
            {admin ? <button className="btn" onClick={openCreate}>Novo usuário</button> : <Badge>Consulta</Badge>}
          </div>
          <div className="filters">
            <input className="input" placeholder="Buscar usuário" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input" value={profile} onChange={(event) => setProfile(event.target.value)}>
              {['Todos', 'Administrador', 'Consultor', 'Editor'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Setor</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.profile}</td>
                    <td>{item.sector}</td>
                    <td>{item.role}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>
                      <button className="btn ghost small" onClick={() => { setUser(item); setModal('detalhe') }}>Ver</button>{' '}
                      {admin ? <button className="btn ghost small" onClick={() => openEdit(item)}>Editar</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="stat-hint">{visible.length} registros · dados salvos neste navegador</p>
        </div>
      )}

      {modal === 'matriz' ? (
        <Modal title="Matriz de acesso" subtitle="Representação visual da estrutura geral de acesso. As permissões detalhadas serão definidas nas specs de cada módulo." wide onClose={() => setModal(null)} footer={<button className="btn" onClick={() => setModal(null)}>Fechar</button>}>
          <div className="table-wrap">
            <table className="matrix">
              <thead><tr><th>Módulo</th><th>Administrador</th><th>Consultor</th><th>Editor</th></tr></thead>
              <tbody>{MATRIX.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Modal>
      ) : null}

      {modal === 'user' ? (
        <Modal title={user.id ? 'Editar usuário' : 'Novo usuário'} subtitle="Administrador, Consultor ou Editor." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveUser}>{user.id ? 'Salvar alterações' : 'Cadastrar usuário'}</button></>}>
          <div className="form-grid">
            <Field label="Nome completo" required><input className="input" value={user.name} onChange={(event) => setUser({ ...user, name: event.target.value })} /></Field>
            <Field label="E-mail" required><input className="input" value={user.email} onChange={(event) => setUser({ ...user, email: event.target.value })} /></Field>
            <Field label="Perfil de acesso" required>
              <select className="input" value={user.profile} onChange={(event) => setUser({ ...user, profile: event.target.value })}>
                {['Administrador', 'Consultor', 'Editor'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={user.status} onChange={(event) => setUser({ ...user, status: event.target.value })}>
                <option>Ativo</option><option>Inativo</option>
              </select>
            </Field>
            <Field label="Setor" required hint="Setor principal de atuação.">
              <select className="input" value={user.sector} onChange={(event) => setUser({ ...user, sector: event.target.value })}>
                <option value="">Selecione</option>
                {['Gestão Geral', 'Acompanhamento', ...SETORES].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Função" required hint="Função exercida no Hackathon (independente do perfil)."><input className="input" placeholder="Ex.: Apoio técnico" value={user.role} onChange={(event) => setUser({ ...user, role: event.target.value })} /></Field>
            <Field label={user.id ? 'Nova senha' : 'Senha'} required={!user.id} className="span-2" hint={user.id ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 4 caracteres. Fica salva só neste navegador.'}>
              <div className="input-icon">
                <Icon name="lock" size={16} />
                <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={user.password || ''} onChange={(event) => setUser({ ...user, password: event.target.value })} />
                <button type="button" className="eye" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><Icon name="eye" size={16} /></button>
              </div>
            </Field>
            {user.profile === 'Editor' ? (
              <Field label="Setores permitidos" className="span-2" hint="Selecione um ou mais setores em que este Editor poderá trabalhar.">
                <div className="chips">
                  {SETORES.map((item) => {
                    const on = user.sectors?.includes(item)
                    return <button type="button" key={item} className={`chip ${on ? 'on' : ''}`} onClick={() => setUser({ ...user, sectors: on ? user.sectors.filter((sector) => sector !== item) : [...(user.sectors || []), item] })}>{item}</button>
                  })}
                </div>
              </Field>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {modal === 'detalhe' ? (
        <Modal title="Detalhes do usuário" subtitle={user.email} onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Fechar</button>{admin ? <button className="btn" onClick={() => openEdit(user)}>Editar usuário</button> : null}</>}>
          <p><b>Nome</b> {user.name}<br /><b>Perfil</b> {user.profile}<br /><b>Setor</b> {user.sector}<br /><b>Função</b> {user.role}<br /><b>Status</b> <Badge tone={toneFor(user.status)}>{user.status}</Badge></p>
          {user.status === 'Inativo' ? <p>Este usuário não tem acesso ao HackLab enquanto estiver inativo.</p> : null}
          {admin && user.status === 'Ativo' ? <button className="btn danger small" onClick={() => setModal('off')}>Desativar usuário</button> : null}
          {admin && user.status === 'Inativo' ? <button className="btn small" onClick={() => { update((draft) => { const found = draft.users.find((item) => item.id === user.id); if (found) found.status = 'Ativo' }); setUser({ ...user, status: 'Ativo' }); flash('Usuário ativado.'); setModal('detalhe') }}>Ativar usuário</button> : null}
        </Modal>
      ) : null}

      {modal === 'off' ? (
        <Modal title="Desativar usuário?" subtitle="Este usuário deixará de ter acesso ao HackLab, mas suas informações permanecerão registradas." onClose={() => setModal('detalhe')} footer={<><button className="btn ghost" onClick={() => setModal('detalhe')}>Cancelar</button><button className="btn danger" onClick={() => { update((draft) => { const found = draft.users.find((item) => item.id === user.id); if (found) found.status = 'Inativo' }); setUser({ ...user, status: 'Inativo' }); flash('Usuário desativado.'); setModal(null) }}>Desativar</button></>}>
          <p>{user.name} fica inativo e não consegue entrar no HackLab. O cadastro continua na lista.</p>
        </Modal>
      ) : null}
    </Page>
  )
}
