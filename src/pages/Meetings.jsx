import { useState } from 'react'
import { SETORES, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Drawer, Empty, Field, Modal, Page, Tabs, toneFor } from '../ui'

const DOC_CATS = ['Atas', 'Contratos', 'Empresas', 'Desafios', 'Finanças', 'Marketing', 'Relatórios', 'Outros']

function docCat(doc) {
  if (!doc?.category || doc.category === 'Documentos gerais') return 'Outros'
  return doc.category
}

function dueInfo(task) {
  if (task.status === 'Concluído' || task.status === 'Concluída') return { label: 'Concluído', tone: 'done' }
  if (!task.due) return { label: 'Sem prazo', tone: '' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${task.due}T00:00:00`)
  if (Number.isNaN(due.getTime())) return { label: 'Sem prazo', tone: '' }
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { label: 'Atrasado', tone: 'late' }
  if (diff === 0) return { label: 'Vence hoje', tone: 'today' }
  if (diff <= 2) return { label: 'Próximo do prazo', tone: 'soon' }
  return { label: 'Dentro do prazo', tone: 'ok' }
}

function outsideHours(value) {
  if (!value) return false
  return value < '08:00' || value > '12:00'
}

export function Meetings({ params, embedded = false }) {
  const { state, update, flash } = useHack()
  const tab = ['reunioes', 'atas', 'decisoes', 'pendencias', 'documentos'].includes(params.aba) ? params.aba : 'reunioes'
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sector, setSector] = useState('')
  const [priority, setPriority] = useState('')
  const [docCatFilter, setDocCatFilter] = useState('Todos')
  const [prazo, setPrazo] = useState('')
  const [detail, setDetail] = useState(null)
  const [removing, setRemoving] = useState(null)

  function choose(id) {
    setQuery('')
    setStatus('')
    setSector('')
    setPriority('')
    setPrazo('')
    const destination = id === 'pendencias' ? 'pendencias' : id === 'documentos' ? 'documentos' : 'reunioes'
    const extra = id === 'atas' ? '&lista=atas' : id === 'decisoes' ? '&lista=decisoes' : ''
    go(`gestao?aba=${destination}${extra}`)
  }

  function openPendencia(seed) {
    setDetail(null)
    setForm({
      title: '',
      description: '',
      sector: '',
      due: '',
      responsible: '',
      status: 'Pendente',
      priority: 'Média',
      origin: '',
      decisionId: '',
      ...seed,
    })
    setModal('pendencia')
  }

  function save() {
    if ((modal === 'reuniao' && !form.title?.trim()) || (modal === 'decisao' && !form.title?.trim()) || (modal === 'pendencia' && !form.title?.trim()) || (modal === 'doc' && !form.name?.trim())) {
      flash('Informe o título para salvar.', 'err')
      return
    }
    const fromDecision = modal === 'pendencia' && form.decisionId
    update((draft) => {
      if (modal === 'reuniao') {
        const record = { ...form, title: form.title.trim(), participantIds: form.participantIds || [] }
        const index = form.id ? draft.meetings.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.meetings[index] = { ...draft.meetings[index], ...record }
        else draft.meetings.unshift({ id: uid('reu'), ...record, presence: {}, status: 'Agendada', ata: null })
      }
      if (modal === 'decisao') {
        const record = { ...form, title: form.title.trim(), forwards: form.forwards || [] }
        const index = form.id ? draft.decisions.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.decisions[index] = { ...draft.decisions[index], ...record }
        else draft.decisions.unshift({ id: uid('dec'), ...record })
      }
      if (modal === 'pendencia') {
        const record = {
          title: form.title.trim(),
          description: form.description,
          sector: form.sector,
          due: form.due,
          responsible: form.responsible,
          status: form.status || 'Pendente',
          priority: form.priority,
          origin: form.origin || '',
          decisionId: form.decisionId || '',
          notes: form.notes || '',
        }
        const index = form.id ? draft.tasks.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.tasks[index] = { ...draft.tasks[index], ...record }
        else draft.tasks.unshift({ id: uid('pen'), createdAt: new Date().toLocaleString('pt-BR'), ...record })
      }
      if (modal === 'doc') {
        const record = { ...form, name: form.name.trim() }
        const index = form.id ? draft.documents.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.documents[index] = { ...draft.documents[index], ...record }
        else draft.documents.unshift({
          id: uid('doc'),
          ...record,
          date: new Date().toLocaleDateString('pt-BR'),
          history: [{ version: form.version || '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: form.responsible || '—', note: form.note || 'Versão inicial' }],
        })
      }
    })
    flash(form.id ? 'Alterações salvas.' : 'Registro salvo. A lista foi atualizada.')
    setModal(null)
    if (fromDecision) choose('pendencias')
  }

  function confirmRemove() {
    if (!removing) return
    update((draft) => {
      if (removing.kind === 'reuniao') {
        draft.meetings = draft.meetings.filter((item) => item.id !== removing.id)
        draft.decisions.forEach((item) => { if (item.meetingId === removing.id) item.meetingId = '' })
      }
      if (removing.kind === 'ata') {
        const meeting = draft.meetings.find((item) => item.id === removing.id)
        if (meeting) {
          meeting.ata = null
          if (meeting.status === 'Aguardando manifestações') meeting.status = 'Agendada'
        }
      }
      if (removing.kind === 'decisao') draft.decisions = draft.decisions.filter((item) => item.id !== removing.id)
      if (removing.kind === 'pendencia') draft.tasks = draft.tasks.filter((item) => item.id !== removing.id)
      if (removing.kind === 'doc') draft.documents = draft.documents.filter((item) => item.id !== removing.id)
    })
    const labels = { reuniao: 'Reunião excluída.', ata: 'Ata excluída.', decisao: 'Decisão excluída.', pendencia: 'Pendência excluída.', doc: 'Documento excluído.' }
    setRemoving(null)
    flash(labels[removing.kind])
  }

  const crumb = tab === 'reunioes' ? 'HackLab / Gestão / Reuniões e Pendências' : `HackLab / Gestão / Reuniões e Pendências / ${{ atas: 'Atas', decisoes: 'Decisões', pendencias: 'Pendências', documentos: 'Documentos' }[tab]}`
  const meetings = state.meetings.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (!status || item.status === status))
  const atas = state.meetings.filter((item) => item.ata && item.title.toLowerCase().includes(query.toLowerCase()) && (!status || item.ata.status === status))
  const decisions = state.decisions.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (!status || item.status === status))
  const tasks = state.tasks.filter((item) => {
    const due = dueInfo(item).label
    return item.title.toLowerCase().includes(query.toLowerCase())
      && (!status || item.status === status)
      && (!sector || item.sector === sector)
      && (!priority || item.priority === priority)
      && (!prazo || prazo === due)
  })
  const docs = state.documents.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (docCatFilter === 'Todos' || docCat(item) === docCatFilter))
  const upcoming = state.meetings.filter((item) => item.status === 'Agendada').length
  const atasPendentes = state.meetings.filter((item) => item.ata?.status === 'Aguardando manifestações' || (!item.ata && item.status !== 'Realizada')).length

  const primary = {
    reunioes: <button className="btn" onClick={() => { setForm({ title: '', type: 'Geral', responsible: state.users[0]?.name || '', date: '', start: '08:00', end: '12:00', place: 'A cadastrar', agenda: '', notes: '', participantIds: [] }); setModal('reuniao') }}>+ Nova reunião</button>,
    decisoes: <button className="btn" onClick={() => { setForm({ title: '', description: '', meetingId: state.meetings[0]?.id || '', responsible: '', status: 'Registrada', sector: 'Tecnologia', date: '', notes: '' }); setModal('decisao') }}>+ Nova decisão</button>,
    pendencias: <button className="btn" onClick={() => openPendencia()}>+ Nova pendência</button>,
    documentos: <button className="btn" onClick={() => { setForm({ name: '', category: 'Outros', responsible: '', sector: '', description: '', version: '1.0', note: '', fileName: '' }); setModal('doc') }}>+ Adicionar documento</button>,
  }[tab] || null

  return (
    <Page crumbs={embedded ? '' : crumb} title={embedded ? '' : 'Reuniões e Pendências'} subtitle={embedded ? '' : 'Organize reuniões, atas, decisões, tarefas e documentos da gestão do Hackathon.'} actions={primary}>
      {embedded ? (
        tab === 'reunioes' ? (
          <p className="inline-links">
            <button className="linkish" type="button" onClick={() => go('gestao?aba=reunioes&lista=atas')}>Ver todas as atas</button>
            <button className="linkish" type="button" onClick={() => go('gestao?aba=reunioes&lista=decisoes')}>Ver decisões</button>
          </p>
        ) : tab === 'atas' || tab === 'decisoes' ? (
          <p><button className="linkish" type="button" onClick={() => go('gestao?aba=reunioes')}>Voltar às reuniões</button></p>
        ) : null
      ) : (
        <Tabs tabs={[{ id: 'reunioes', label: 'Reuniões' }, { id: 'atas', label: 'Atas' }, { id: 'decisoes', label: 'Decisões' }, { id: 'pendencias', label: 'Pendências' }, { id: 'documentos', label: 'Documentos' }]} value={tab} onChange={choose} />
      )}

      {tab === 'reunioes' ? (
        <div className="grid cols-3">
          <article className="card"><h3>Reuniões</h3><div className="stat-value">{state.meetings.length || '—'}</div></article>
          <article className="card"><h3>Próximas</h3><div className="stat-value">{upcoming || '—'}</div></article>
          <article className="card"><h3>Atas pendentes</h3><div className="stat-value">{atasPendentes || '—'}</div></article>
        </div>
      ) : null}
      {tab === 'pendencias' ? (
        <div className="grid cols-4">
          <article className="card"><h3>Pendentes</h3><div className="stat-value">{state.tasks.filter((item) => item.status === 'Pendente').length || '—'}</div></article>
          <article className="card"><h3>Em andamento</h3><div className="stat-value">{state.tasks.filter((item) => item.status === 'Em andamento').length || '—'}</div></article>
          <article className="card"><h3>Atrasadas</h3><div className="stat-value">{state.tasks.filter((item) => dueInfo(item).label === 'Atrasado').length || '—'}</div></article>
          <article className="card"><h3>Concluídas</h3><div className="stat-value">{state.tasks.filter((item) => item.status === 'Concluído').length || '—'}</div></article>
        </div>
      ) : null}
      {tab === 'documentos' ? (
        <div className="grid cols-3">
          <article className="card"><h3>Documentos</h3><div className="stat-value">{state.documents.length || '—'}</div></article>
          <article className="card"><h3>Atualizados recentemente</h3><div className="stat-value">{state.documents.filter((item) => item.date && item.date !== 'Data demonstrativa').length || '—'}</div></article>
          <article className="card"><h3>Pendentes</h3><div className="stat-value">{state.documents.filter((item) => !item.fileName).length || '—'}</div></article>
        </div>
      ) : null}

      {tab !== 'documentos' ? (
        <div className="filters mt">
          <input className="input" placeholder="Buscar" aria-label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
          {tab === 'reunioes' ? (
            <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              <option>Agendada</option>
              <option>Aguardando manifestações</option>
              <option>Realizada</option>
            </select>
          ) : null}
          {tab === 'atas' ? (
            <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              <option>Rascunho</option>
              <option>Em revisão</option>
              <option>Aguardando manifestações</option>
              <option>Finalizada</option>
            </select>
          ) : null}
          {tab === 'decisoes' ? (
            <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              <option>Registrada</option>
              <option>Em andamento</option>
              <option>Concluída</option>
            </select>
          ) : null}
          {tab === 'pendencias' ? (
            <>
              <select className="input" aria-label="Setor" value={sector} onChange={(event) => setSector(event.target.value)}>
                <option value="">Setor</option>
                {SETORES.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Status</option>
                <option>Pendente</option>
                <option>Em andamento</option>
                <option>Concluído</option>
              </select>
              <select className="input" aria-label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="">Prioridade</option>
                {['Baixa', 'Média', 'Alta', 'Urgente'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="input" aria-label="Prazo" value={prazo} onChange={(event) => setPrazo(event.target.value)}>
                <option value="">Prazo</option>
                {['Dentro do prazo', 'Próximo do prazo', 'Vence hoje', 'Atrasado', 'Concluído', 'Sem prazo'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </>
          ) : null}
        </div>
      ) : (
        <div className="filters mt">
          <input className="input" placeholder="Buscar" aria-label="Buscar documento" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="chips">
            {['Todos', ...DOC_CATS].map((item) => (
              <button type="button" key={item} className={`chip ${docCatFilter === item ? 'on' : ''}`} onClick={() => setDocCatFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
      )}

      {tab === 'reunioes' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reunião</th><th>Data</th><th>Tipo</th><th>Ata</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {meetings.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma reunião cadastrada ainda." text="Agende a primeira reunião da organização." /></td></tr> : meetings.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.date || 'A definir'}{item.start ? ` · ${item.start}` : ''}</td>
                  <td>{item.type}</td>
                  <td>{item.ata ? `ATA Nº ${item.ata.number}` : '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost small" onClick={() => setDetail({ type: 'reuniao', id: item.id })}>Visualizar</button>
                      <button className="btn ghost small" onClick={() => { setForm({ ...item, participantIds: item.participantIds || [], agenda: item.agenda || '', notes: item.notes || '' }); setModal('reuniao') }}>Editar</button>
                      <button className="btn ghost small" onClick={() => setRemoving({ kind: 'reuniao', id: item.id, name: item.title })}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'atas' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ata</th><th>Reunião</th><th>Status</th><th>Manifestações</th><th>Ações</th></tr></thead>
            <tbody>
              {atas.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhuma ata disponível." /></td></tr> : atas.map((item) => {
                const done = item.ata.manifestations?.length || 0
                const total = item.participantIds?.length || 0
                return (
                  <tr key={item.id}>
                    <td>ATA Nº {item.ata.number}</td>
                    <td>{item.title}</td>
                    <td><Badge tone={toneFor(item.ata.status)}>{item.ata.status}</Badge></td>
                    <td>{total ? `${done} de ${total} manifestaram` : done || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn ghost small" onClick={() => setDetail({ type: 'reuniao', id: item.id, focus: 'ata' })}>Visualizar</button>
                        <button className="btn ghost small" onClick={() => { setForm({ ...item, participantIds: item.participantIds || [], agenda: item.agenda || '', notes: item.notes || '' }); setModal('reuniao') }}>Editar</button>
                        <button className="btn ghost small" onClick={() => setRemoving({ kind: 'ata', id: item.id, name: `ATA Nº ${item.ata.number}` })}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'decisoes' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Decisão</th><th>Reunião</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {decisions.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhuma decisão registrada." /></td></tr> : decisions.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{state.meetings.find((meeting) => meeting.id === item.meetingId)?.title || '—'}</td>
                  <td>{item.responsible || '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost small" onClick={() => setDetail({ type: 'decisao', id: item.id })}>Visualizar</button>
                      <button className="btn ghost small" onClick={() => { setForm({ description: '', notes: '', sector: 'Tecnologia', status: 'Registrada', meetingId: '', ...item }); setModal('decisao') }}>Editar</button>
                      <button className="btn ghost small" onClick={() => setRemoving({ kind: 'decisao', id: item.id, name: item.title })}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'pendencias' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Pendência</th><th>Setor</th><th>Responsável</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {tasks.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma pendência encontrada." text="Pendências de reuniões e setores aparecem aqui." /></td></tr> : tasks.map((item) => {
                const due = dueInfo(item)
                return (
                  <tr key={item.id}>
                    <td>{item.title} {item.priority ? <Badge tone={toneFor(item.priority)}>{item.priority}</Badge> : null}</td>
                    <td>{item.sector || '—'}</td>
                    <td>{item.responsible || 'Não definido'}</td>
                    <td><span className={`due ${due.tone}`}>{due.label}</span>{item.due ? <><br /><small>{item.due}</small></> : null}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn ghost small" onClick={() => setDetail({ type: 'pendencia', id: item.id })}>Visualizar</button>
                        <button className="btn ghost small" onClick={() => openPendencia(item)}>Editar</button>
                        <button className="btn ghost small" onClick={() => setRemoving({ kind: 'pendencia', id: item.id, name: item.title })}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'documentos' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Documento</th><th>Categoria</th><th>Setor</th><th>Versão</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {docs.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhum documento armazenado." /></td></tr> : docs.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{docCat(item)}</td>
                  <td>{item.sector || '—'}</td>
                  <td>{item.version || '—'}</td>
                  <td>{item.date || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost small" onClick={() => setDetail({ type: 'doc', id: item.id })}>Visualizar</button>
                      <button className="btn ghost small" onClick={() => { setForm({ category: docCat(item), sector: '', description: '', version: item.version || '1.0', note: '', ...item }); setModal('doc') }}>Editar</button>
                      <button className="btn ghost small" onClick={() => setRemoving({ kind: 'doc', id: item.id, name: item.name })}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {detail?.type === 'reuniao' ? <MeetingDrawer id={detail.id} focus={detail.focus} onClose={() => setDetail(null)} /> : null}
      {detail?.type === 'decisao' ? (
        <DecisionDrawer
          id={detail.id}
          onClose={() => setDetail(null)}
          onTask={(decision) => openPendencia({
            title: decision.title,
            description: decision.description || '',
            sector: decision.sector || '',
            responsible: decision.responsible || '',
            origin: `Decisão · ${decision.title}`,
            decisionId: decision.id,
          })}
        />
      ) : null}
      {detail?.type === 'pendencia' ? <TaskDrawer id={detail.id} onClose={() => setDetail(null)} /> : null}
      {detail?.type === 'doc' ? <DocDrawer id={detail.id} onClose={() => setDetail(null)} /> : null}

      {modal ? (
        <Modal wide={modal === 'reuniao'} title={modal === 'reuniao' ? (form.id ? 'Editar reunião' : 'Nova reunião') : modal === 'decisao' ? (form.id ? 'Editar decisão' : 'Nova decisão') : modal === 'pendencia' ? (form.id ? 'Editar pendência' : 'Nova pendência') : (form.id ? 'Editar documento' : 'Adicionar documento')} onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={save}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          {modal === 'reuniao' ? (
            <div className="form-grid">
              <Field label="Título" required className="span-2"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Tipo"><select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{['Geral', 'Setor', 'Consultores', 'Empresa', 'Administrativa', 'Extraordinária'].map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
              <Field label="Data"><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
              <Field label="Horário"><input className="input" type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></Field>
              <Field label="Local" className="span-2"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
              {outsideHours(form.start) ? <p className="stat-hint span-2">Horário fora de 08:00 às 12:00 — aviso demonstrativo. O evento permanece nesse intervalo.</p> : null}
              <Field label="Pauta" className="span-2"><textarea className="input" value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} /></Field>
              <Field label="Descrição / observação" className="span-2"><textarea className="input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
              <div className="field span-2">
                <span>Participantes</span>
                <div className="chips">
                  {state.users.filter((user) => user.status === 'Ativo').map((user) => {
                    const on = form.participantIds?.includes(user.id)
                    return <button type="button" key={user.id} className={`chip ${on ? 'on' : ''}`} onClick={() => setForm({ ...form, participantIds: on ? form.participantIds.filter((id) => id !== user.id) : [...(form.participantIds || []), user.id] })}>{user.name} · {user.profile}</button>
                  })}
                </div>
              </div>
            </div>
          ) : null}
          {modal === 'decisao' ? (
            <div className="form-grid">
              <Field label="Decisão" required className="span-2"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Descrição" className="span-2"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="Reunião"><select className="input" value={form.meetingId} onChange={(event) => setForm({ ...form, meetingId: event.target.value })}><option value="">Nenhuma</option>{state.meetings.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
              <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
              <Field label="Setor"><select className="input" value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}>{SETORES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Registrada</option><option>Em andamento</option><option>Concluída</option></select></Field>
            </div>
          ) : null}
          {modal === 'pendencia' ? <PendenciaFields form={form} setForm={setForm} /> : null}
          {modal === 'doc' ? (
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Categoria" required><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{DOC_CATS.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Setor"><select className="input" value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}><option value="">Opcional</option>{SETORES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Versão"><input className="input" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} /></Field>
              <Field label="Descrição" className="span-2"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="Observação" className="span-2"><input className="input" value={form.note || ''} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
              <Field label="Arquivo demonstrativo" className="span-2" hint="Upload visual — nenhum arquivo é enviado."><input className="input" type="file" onChange={(event) => setForm({ ...form, fileName: event.target.files?.[0]?.name || '' })} /></Field>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          title={removing.kind === 'ata' ? 'Excluir ata?' : 'Excluir registro?'}
          subtitle={removing.kind === 'ata' ? 'A ata sai desta reunião. A reunião continua cadastrada.' : 'O registro será removido deste navegador.'}
          onClose={() => setRemoving(null)}
          footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={confirmRemove}>Excluir</button></>}
        >
          <p>{removing.name}</p>
        </Modal>
      ) : null}
    </Page>
  )
}

function PendenciaFields({ form, setForm }) {
  const { state } = useHack()
  return (
    <div className="form-grid">
      <Field label="Título" required className="span-2"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
      <Field label="Descrição" className="span-2"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
      <Field label="Setor"><select className="input" value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })}><option value="">Selecione o setor</option>{SETORES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Responsável"><select className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })}><option value="">Selecione</option>{state.users.map((user) => <option key={user.id}>{user.name}</option>)}</select></Field>
      <Field label="Prazo"><input className="input" type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} /></Field>
      <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></Field>
      <div className="field span-2">
        <span>Prioridade</span>
        <div className="chips">{['Baixa', 'Média', 'Alta', 'Urgente'].map((item) => <button type="button" key={item} className={`chip ${form.priority === item ? 'on' : ''}`} onClick={() => setForm({ ...form, priority: item })}>{item}</button>)}</div>
      </div>
      {form.origin ? <p className="stat-hint span-2">Origem: {form.origin}</p> : null}
    </div>
  )
}

function MeetingDrawer({ id, focus, onClose }) {
  const { state, update, flash } = useHack()
  const meeting = state.meetings.find((item) => item.id === id)
  const [ataForm, setAtaForm] = useState(meeting?.ata || { number: String(state.meetings.length).padStart(2, '0'), discussed: '', decisions: '', forwards: '', observations: '', status: 'Rascunho' })
  if (!meeting) return null
  const people = state.users.filter((user) => meeting.participantIds?.includes(user.id))
  const linkedDecisions = state.decisions.filter((item) => item.meetingId === meeting.id)
  const linkedDocs = state.documents.filter((item) => docCat(item) === 'Atas' && (item.description || '').includes(meeting.title))
  const done = meeting.ata?.manifestations?.length || 0

  function publish() {
    update((draft) => {
      const current = draft.meetings.find((item) => item.id === meeting.id)
      current.ata = { ...ataForm, status: 'Aguardando manifestações', manifestations: current.ata?.manifestations || [], versions: [{ version: '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: state.session?.name, change: 'Versão disponibilizada' }] }
      current.status = 'Aguardando manifestações'
    })
    flash('Ata disponibilizada para manifestação.')
  }

  return (
    <Drawer title={meeting.title} subtitle={`${meeting.type} · ${meeting.date || 'Data a definir'}`} onClose={onClose} footer={<><button className="btn ghost" onClick={onClose}>Fechar</button><button className="btn" onClick={publish}>Finalizar ata</button></>}>
      <p><Badge tone={toneFor(meeting.status)}>{meeting.status}</Badge> · {meeting.place}</p>
      <section>
        <h3>Informações</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{meeting.agenda || 'Sem pauta.'}</p>
        {meeting.notes ? <p>{meeting.notes}</p> : null}
      </section>
      <section>
        <h3>Participantes</h3>
        {people.length === 0 ? <p>Nenhum participante vinculado.</p> : people.map((user) => <p key={user.id}>{user.name} · {user.profile} · {meeting.presence?.[user.id] || 'Não informado'}</p>)}
        <p className="stat-hint">{people.length || '—'} participante(s). A presença desta reunião não se mistura com o evento.</p>
      </section>
      <section id={focus === 'ata' ? 'ata' : undefined}>
        <h3>Ata</h3>
        {meeting.ata ? <p><Badge tone={toneFor(meeting.ata.status)}>{meeting.ata.status || 'Rascunho'}</Badge></p> : <p className="stat-hint">Ata ainda não finalizada.</p>}
        <Field label="Número"><input className="input" value={ataForm.number || ''} onChange={(event) => setAtaForm({ ...ataForm, number: event.target.value })} /></Field>
        <Field label="Assuntos discutidos"><textarea className="input" value={ataForm.discussed || ''} onChange={(event) => setAtaForm({ ...ataForm, discussed: event.target.value })} /></Field>
        <Field label="Decisões"><textarea className="input" value={ataForm.decisions || ''} onChange={(event) => setAtaForm({ ...ataForm, decisions: event.target.value })} /></Field>
        <Field label="Encaminhamentos"><textarea className="input" value={ataForm.forwards || ''} onChange={(event) => setAtaForm({ ...ataForm, forwards: event.target.value })} /></Field>
        <Field label="Observações"><textarea className="input" value={ataForm.observations || ''} onChange={(event) => setAtaForm({ ...ataForm, observations: event.target.value })} /></Field>
        {meeting.ata ? <p className="stat-hint">{people.length ? `${done} de ${people.length} manifestaram` : `${done} manifestação(ões)`}</p> : null}
        {meeting.ata ? <p><button className="linkish" type="button" onClick={() => go(`manifestacao?id=${meeting.id}`)}>Registrar manifestação</button></p> : null}
      </section>
      <section>
        <h3>Decisões e encaminhamentos</h3>
        {linkedDecisions.length === 0 ? <p>Nenhuma decisão ligada a esta reunião.</p> : linkedDecisions.map((item) => <p key={item.id}>{item.title} · {item.status}</p>)}
      </section>
      <section>
        <h3>Documentos</h3>
        {linkedDocs.length === 0 ? <p>Nenhum documento ligado a esta reunião.</p> : linkedDocs.map((item) => <p key={item.id}>{item.name} · {item.version}</p>)}
      </section>
    </Drawer>
  )
}

function DecisionDrawer({ id, onClose, onTask }) {
  const { state } = useHack()
  const decision = state.decisions.find((item) => item.id === id)
  if (!decision) return null
  const meeting = state.meetings.find((item) => item.id === decision.meetingId)
  return (
    <Drawer title={decision.title} subtitle={meeting?.title || 'Sem reunião vinculada'} onClose={onClose} footer={<><button className="btn ghost" onClick={onClose}>Fechar</button><button className="btn" onClick={() => onTask(decision)}>Criar pendência</button></>}>
      <dl className="kv">
        <dt>Status</dt><dd><Badge tone={toneFor(decision.status)}>{decision.status}</Badge></dd>
        <dt>Responsável</dt><dd>{decision.responsible || '—'}</dd>
        <dt>Setor</dt><dd>{decision.sector || '—'}</dd>
        <dt>Descrição</dt><dd>{decision.description || '—'}</dd>
      </dl>
    </Drawer>
  )
}

function TaskDrawer({ id, onClose }) {
  const { state, update, flash } = useHack()
  const task = state.tasks.find((item) => item.id === id)
  if (!task) return null
  const due = dueInfo(task)
  return (
    <Drawer
      title={task.title}
      onClose={onClose}
      footer={task.status !== 'Concluído' ? <button className="btn" onClick={() => { update((draft) => { const found = draft.tasks.find((item) => item.id === task.id); if (found) found.status = 'Concluído' }); flash('Pendência marcada como concluída.') }}>Marcar como concluída</button> : <button className="btn ghost" onClick={onClose}>Fechar</button>}
    >
      <dl className="kv">
        <dt>Descrição</dt><dd>{task.description || '—'}</dd>
        <dt>Responsável</dt><dd>{task.responsible || 'Não definido'}</dd>
        <dt>Prazo</dt><dd><span className={`due ${due.tone}`}>{due.label}</span>{task.due ? ` · ${task.due}` : ''}</dd>
        <dt>Prioridade</dt><dd><Badge tone={toneFor(task.priority)}>{task.priority || '—'}</Badge></dd>
        <dt>Origem</dt><dd>{task.origin || 'Cadastro direto'}</dd>
        <dt>Status</dt><dd><Badge tone={toneFor(task.status)}>{task.status}</Badge></dd>
        <dt>Observação</dt><dd>{task.notes || '—'}</dd>
      </dl>
    </Drawer>
  )
}

function DocDrawer({ id, onClose }) {
  const { state } = useHack()
  const doc = state.documents.find((item) => item.id === id)
  if (!doc) return null
  return (
    <Drawer title={doc.name} subtitle={docCat(doc)} onClose={onClose}>
      <dl className="kv">
        <dt>Setor</dt><dd>{doc.sector || '—'}</dd>
        <dt>Versão atual</dt><dd>{doc.version || '—'}</dd>
        <dt>Data</dt><dd>{doc.date || '—'}</dd>
        <dt>Responsável</dt><dd>{doc.responsible || '—'}</dd>
        <dt>Descrição</dt><dd>{doc.description || '—'}</dd>
        <dt>Arquivo</dt><dd>{doc.fileName || 'Upload demonstrativo'}</dd>
      </dl>
      <h3>Histórico</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Versão</th><th>Data</th><th>Responsável</th><th>Observação</th></tr></thead>
          <tbody>
            {(doc.history || []).length === 0 ? <tr><td colSpan={4}>Sem histórico.</td></tr> : doc.history.map((item, index) => (
              <tr key={index}><td>{item.version}</td><td>{item.date}</td><td>{item.responsible || '—'}</td><td>{item.note || item.change || '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  )
}

export function MeetingDetail({ params }) {
  const { state, update, flash } = useHack()
  const meeting = state.meetings.find((item) => item.id === params.id) || state.meetings[0]
  const [ataForm, setAtaForm] = useState(meeting?.ata || { number: String(state.meetings.length).padStart(2, '0'), discussed: '', decisions: '', forwards: '', observations: '' })
  const [presence, setPresence] = useState(false)
  if (!meeting) return <Page title="Reunião"><Empty title="Nenhuma reunião cadastrada." /></Page>
  const people = state.users.filter((user) => meeting.participantIds?.includes(user.id))

  function publish() {
    update((draft) => {
      const current = draft.meetings.find((item) => item.id === meeting.id)
      current.ata = { ...ataForm, status: 'Aguardando manifestações', manifestations: current.ata?.manifestations || [], versions: [{ version: '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: state.session?.name, change: 'Versão disponibilizada' }] }
      current.status = 'Aguardando manifestações'
    })
    flash('Ata disponibilizada para manifestação.')
  }

  return (
    <Page crumbs={`Reuniões / ${meeting.title}`} title={meeting.title} subtitle={meeting.type} actions={<button className="btn ghost" onClick={() => go('gestao?aba=reunioes')}>Voltar</button>}>
      <p><Badge tone={toneFor(meeting.status)}>{meeting.status}</Badge> · {meeting.date || 'Data a definir'} · {meeting.place}</p>
      <section className="card">
        <h3>Informações</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{meeting.agenda || 'Sem pauta.'}</p>
        <p>{meeting.notes}</p>
      </section>
      <section className="card">
        <h3>Participantes</h3>
        {people.length === 0 ? <p>Nenhum participante vinculado.</p> : people.map((user) => <p key={user.id}>{user.name} · {user.profile} · {meeting.presence?.[user.id] || 'Não informado'}</p>)}
        <button className="btn ghost small" type="button" onClick={() => setPresence(true)}>Registrar presença</button>
        <p className="stat-hint">Presença manual desta reunião — não ligada ao QR Code do evento.</p>
      </section>
      <section className="card">
        <h3>Ata</h3>
        {meeting.ata ? <p><Badge tone={toneFor(meeting.ata.status)}>{meeting.ata.status || 'Rascunho'}</Badge></p> : <p className="stat-hint">Ata ainda não finalizada.</p>}
        <Field label="Número"><input className="input" value={ataForm.number || ''} onChange={(event) => setAtaForm({ ...ataForm, number: event.target.value })} /></Field>
        <Field label="Assuntos discutidos"><textarea className="input" value={ataForm.discussed || ''} onChange={(event) => setAtaForm({ ...ataForm, discussed: event.target.value })} /></Field>
        <Field label="Decisões tomadas"><textarea className="input" value={ataForm.decisions || ''} onChange={(event) => setAtaForm({ ...ataForm, decisions: event.target.value })} /></Field>
        <Field label="Encaminhamentos"><textarea className="input" value={ataForm.forwards || ''} onChange={(event) => setAtaForm({ ...ataForm, forwards: event.target.value })} /></Field>
        <Field label="Observações"><textarea className="input" value={ataForm.observations || ''} onChange={(event) => setAtaForm({ ...ataForm, observations: event.target.value })} /></Field>
        <button className="btn" type="button" onClick={publish}>Finalizar ata</button>
        {meeting.ata ? <p><button className="linkish" type="button" onClick={() => go(`manifestacao?id=${meeting.id}`)}>Registrar manifestação</button></p> : null}
      </section>
      <section className="card">
        <h3>Decisões e encaminhamentos</h3>
        {state.decisions.filter((item) => item.meetingId === meeting.id).map((item) => <p key={item.id}>{item.title} · {item.status}</p>)}
        {state.decisions.every((item) => item.meetingId !== meeting.id) ? <p>Nenhuma decisão ligada a esta reunião.</p> : null}
      </section>
      <section className="card">
        <h3>Documentos</h3>
        <p className="stat-hint">Os documentos do Hackathon ficam na central de documentos. Aqui aparecem só os ligados a esta reunião.</p>
        <button className="btn ghost small" type="button" onClick={() => go('gestao?aba=documentos')}>Ver documentos</button>
      </section>
      {presence ? (
        <Modal title="Registrar presença" subtitle="Presença manual desta reunião." onClose={() => setPresence(false)} footer={<button className="btn" onClick={() => setPresence(false)}>Fechar</button>}>
          {people.map((user) => (
            <div className="person" key={user.id}>
              <span>{user.name}<br /><small>{user.profile}</small></span>
              <div className="chips">
                {['Presente', 'Ausente', 'Não informado'].map((option) => (
                  <button key={option} className={`chip ${meeting.presence?.[user.id] === option ? 'on' : ''}`} onClick={() => update((draft) => { const current = draft.meetings.find((item) => item.id === meeting.id); current.presence[user.id] = option })}>{option}</button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      ) : null}
    </Page>
  )
}

export function Manifest({ params }) {
  const { state, update, flash } = useHack()
  const meeting = state.meetings.find((item) => item.id === params.id)
  const [type, setType] = useState('')
  const [note, setNote] = useState('')
  const [ask, setAsk] = useState(false)
  if (!meeting?.ata) return <Page title="Reuniões e Pendências" actions={<button className="btn ghost" type="button" onClick={() => go('gestao?aba=reunioes')}>Voltar</button>}><Empty title="Nenhuma ata disponível." text="Finalize a ata antes de registrar a manifestação." /></Page>
  const total = meeting.participantIds?.length || 0
  const done = meeting.ata.manifestations?.length || 0
  const options = [
    ['De acordo', 'acordo', 'Li e estou de acordo com o conteúdo desta ata.'],
    ['Com observação', 'obs', 'Com observação ou discordância. O campo de observação aparece nesta mesma tela.'],
    ['Ciente', 'ciente', 'Li e estou ciente do conteúdo, sem manifestação de concordância ou discordância.'],
  ]
  return (
    <Page crumbs="HackLab / Gestão / Reuniões e Pendências / Manifestação sobre a Ata" title="Reuniões e Pendências" subtitle={`Manifestação sobre a ata · ${meeting.title}`} actions={<button className="btn ghost" type="button" onClick={() => go('gestao?aba=reunioes')}>Voltar</button>}>
      <div className="card">
        <h3>ATA Nº {meeting.ata.number}</h3>
        <p className="stat-hint">{total ? `${done} de ${total} manifestaram` : `${done} manifestação(ões)`} · Numeração deste protótipo.</p>
        <p><b>Assuntos</b><br />{meeting.ata.discussed}</p>
        <p><b>Decisões</b><br />{meeting.ata.decisions}</p>
        <p><b>Encaminhamentos</b><br />{meeting.ata.forwards}</p>
      </div>
      <div className="grid cols-3 mt">
        {options.map(([id, tone, text]) => (
          <button key={id} className={`choice ${tone} ${type === id ? 'on' : ''}`} onClick={() => setType(id)}>
            <b>{id === 'Com observação' ? 'Com observação ou discordância' : id}</b>
            <p>{text}</p>
          </button>
        ))}
      </div>
      {type === 'Com observação' ? <Field label="Observação"><textarea className="input" value={note} onChange={(event) => setNote(event.target.value)} /></Field> : null}
      {meeting.ata.manifestations?.length ? (
        <div className="table-wrap mt">
          <table>
            <thead><tr><th>Participante</th><th>Manifestação</th><th>Data</th></tr></thead>
            <tbody>{meeting.ata.manifestations.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.type === 'Com observação' ? 'Com observação ou discordância' : item.type}</td><td>{item.at || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
      <p className="stat-hint">Este registro não é assinatura digital qualificada, assinatura GOV.BR nem certificado digital.</p>
      <button className="btn" disabled={!type} onClick={() => setAsk(true)}>Registrar manifestação</button>
      {ask ? (
        <Modal title="Confirmar manifestação?" subtitle={`Tipo selecionado: ${type === 'Com observação' ? 'Com observação ou discordância' : type}.`} onClose={() => setAsk(false)} footer={<><button className="btn ghost" onClick={() => setAsk(false)}>Voltar</button><button className="btn" onClick={() => { update((draft) => { const current = draft.meetings.find((item) => item.id === meeting.id); current.ata.manifestations.push({ userId: 'session', name: state.session?.name || 'Usuário', type, note, at: new Date().toLocaleString('pt-BR') }) }); setAsk(false); setType(''); setNote(''); flash('Manifestação registrada.') }}>Confirmar</button></>}>
          {note ? <p>{note}</p> : <p>A manifestação será salva neste navegador.</p>}
        </Modal>
      ) : null}
    </Page>
  )
}
