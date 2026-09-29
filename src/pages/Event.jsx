import { useState } from 'react'
import { companyOf, isAvailable, pausedMembers, teamChallenge, teamName, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Drawer, Empty, Field, Modal, NextStep, Page, Tabs, toneFor } from '../ui'

const DAY1_FLOW = ['Credenciamento', 'Abertura', 'Empresas e desafios', 'Formação das equipes', 'Distribuição dos desafios']
const DAY3_FLOW = ['Preparação', 'Apresentações', 'Avaliações', 'Votação do público', 'Resultados', 'Premiação', 'Encerramento']
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']

function scrollToId(id) {
  const reduce = document.documentElement.classList.contains('reduce-motion')
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function dash(value) {
  return value ? value : '—'
}

function roomLabel(id) {
  return `Sala ${String(id).padStart(2, '0')}`
}

function teamOf(state, studentId) {
  return state.teams.find((team) => team.members.includes(studentId))
}

function presentOn(state, personId, day) {
  return state.checkins.find((item) => item.personId === personId && item.day === day && item.status === 'Presente')
}

function DaySwitch({ day }) {
  return (
    <Tabs tabs={[{ id: '1', label: 'Dia 1' }, { id: '2', label: 'Dia 2' }, { id: '3', label: 'Dia 3' }]} value={String(day)} onChange={(value) => go(`evento?dia=${value}`)} />
  )
}

function DayHead({ title, text }) {
  return (
    <div className="day-strip">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Badge>08:00 às 12:00</Badge>
    </div>
  )
}

function Kpis({ items }) {
  return (
    <div className="grid cols-4">
      {items.map((item) => (
        <article className="card" key={item.label}>
          <h3>{item.label}</h3>
          <div className="stat-value">{item.value}</div>
        </article>
      ))}
    </div>
  )
}

function Quick({ actions }) {
  return (
    <>
      <h3 className="ops-title">Ações rápidas</h3>
      <div className="quick ops">
        {actions.map((item) => <button key={item.label} type="button" onClick={item.onClick}>{item.label}</button>)}
      </div>
    </>
  )
}

function Flow({ items }) {
  return <ol className="day-flow">{items.map((item) => <li key={item}>{item}</li>)}</ol>
}

function PriorityChips({ value, onChange }) {
  return (
    <div className="field">
      <span>Prioridade</span>
      <div className="chips">{PRIORITIES.map((item) => <button type="button" key={item} className={`chip ${value === item ? 'on' : ''}`} onClick={() => onChange(item)}>{item}</button>)}</div>
    </div>
  )
}

export function EventMode({ params }) {
  const { state } = useHack()
  const day = [1, 2, 3].includes(Number(params.dia)) ? Number(params.dia) : 1
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const hits = term ? [
    ...state.students.filter((item) => item.name.toLowerCase().includes(term)).slice(0, 4).map((item) => {
      const team = teamOf(state, item.id)
      const presence = presentOn(state, item.id, day)
      return { id: item.id, title: item.name, text: `Turma ${item.turma} · ${team ? teamName(team.id) : 'Sem equipe'} · ${presence ? 'Presente' : 'Não registrado'}` }
    }),
    ...state.teams.filter((item) => teamName(item.id).toLowerCase().includes(term) || roomLabel(item.id).toLowerCase().includes(term)).slice(0, 4).map((item) => ({
      id: `team-${item.id}`,
      title: teamName(item.id),
      text: `${roomLabel(item.id)} · ${item.status === 'confirmada' ? 'Em atividade' : 'Aguardando início'}`,
    })),
  ] : []

  return (
    <Page title="Modo Evento" subtitle="Acompanhe o que está acontecendo e o que precisa ser feito em cada dia.">
      <DaySwitch day={day} />
      <div className="filters">
        <input className="input event-search" placeholder="Buscar participante, equipe ou sala" aria-label="Buscar participante, equipe ou sala" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {term ? (
        <div className="search-hits">
          {hits.length === 0 ? <p className="stat-hint">Nenhum resultado para esta busca.</p> : hits.map((item) => (
            <article className="card search-hit" key={item.id}><b>{item.title}</b><p>{item.text}</p></article>
          ))}
        </div>
      ) : null}
      {day === 1 ? <DayOne state={state} /> : null}
      {day === 2 ? <DayTwo state={state} /> : null}
      {day === 3 ? <DayThree state={state} /> : null}
    </Page>
  )
}

function DayOne({ state }) {
  const { update, flash } = useHack()
  const [modal, setModal] = useState(null)
  const [scan, setScan] = useState(null)
  const [form, setForm] = useState({ personId: '', time: '08:10', reason: 'QR Code indisponível', note: '' })
  const [presenceQuery, setPresenceQuery] = useState('')
  const rows = state.checkins.filter((item) => item.day === 1 && item.status === 'Presente')
  const presentIds = new Set(rows.map((item) => item.personId))
  const manual = rows.filter((item) => item.method === 'Manual').length
  const expected = state.students.filter(isAvailable)
  const missing = expected.filter((item) => !presentIds.has(item.id)).length
  const confirmed = state.teams.filter((item) => item.status === 'confirmada').length
  const forming = state.teams.filter((item) => item.status === 'em-montagem').length
  const without = expected.filter((item) => !state.teams.some((team) => team.members.includes(item.id) && isAvailable(item))).length
  const openTasks = state.tasks.filter((item) => item.status !== 'Concluído').length
  const people = expected.filter((item) => `${item.name} ${item.turma}`.toLowerCase().includes(presenceQuery.trim().toLowerCase()))

  function simulate(kind) {
    if (kind === 'invalid' || state.students.length === 0) {
      setScan({ kind: 'invalid' })
      return
    }
    const pending = expected.find((item) => !presentIds.has(item.id))
    if (kind === 'used' || !pending) {
      setScan({ kind: 'used', student: state.students.find((item) => presentIds.has(item.id)) || state.students[0] })
      return
    }
    setScan({ kind: 'valid', student: pending })
  }

  function confirmScan() {
    const student = scan?.student
    if (!student) return
    update((draft) => {
      draft.checkins.push({
        id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
        day: 1, method: 'QR Code', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        responsible: state.session?.name, status: 'Presente', note: 'Leitura demonstrativa',
      })
    })
    setModal(null)
    setScan(null)
    flash('Presença registrada.')
  }

  function saveManual() {
    const student = state.students.find((item) => item.id === form.personId)
    if (!student) {
      flash('Selecione um participante.', 'err')
      return
    }
    if (presentOn(state, student.id, 1)) {
      flash('Já registrado neste dia.', 'err')
      return
    }
    update((draft) => {
      draft.checkins.push({
        id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
        day: 1, method: 'Manual', time: form.time, responsible: state.session?.name, status: 'Presente', note: `${form.reason}. ${form.note}`.trim(),
      })
    })
    setModal(null)
    flash('Presença registrada.')
  }

  return (
    <>
      <DayHead title="Dia 1 — Abertura e Formação" text="Credenciamento, abertura, formação das equipes e distribuição dos desafios." />
      <section className="now-block">
        <p className="kicker">Agora</p>
        <h2>Credenciamento</h2>
        <p>Registre a presença dos participantes antes da abertura.</p>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => { setScan(null); setModal('scan') }}>Validar ingresso</button>
          <button className="btn ghost" type="button" onClick={() => setModal('manual')}>Registrar manualmente</button>
        </div>
      </section>
      <ol className="day-track">
        <li className="now"><span>→</span> Credenciamento</li>
        <li><span>○</span> Abertura</li>
        <li><span>○</span> Empresas e desafios</li>
        <li><span>○</span> Formação das equipes</li>
        <li><span>○</span> Distribuição dos desafios</li>
      </ol>
      <h3 className="ops-title">Resumo</h3>
      <Kpis items={[
        { label: 'Presentes', value: dash(rows.length) },
        { label: 'Equipes', value: dash(confirmed) },
        { label: 'Ocorrências', value: dash(state.occurrences.filter((item) => item.status !== 'Resolvida').length) },
        { label: 'Pendências', value: dash(openTasks) },
      ]} />

      <h3 className="ops-title">Credenciamento</h3>
      <div className="grid cols-3">
        <article className="card"><h3>Presentes</h3><div className="stat-value">{dash(rows.length)}</div></article>
        <article className="card"><h3>Não registrados</h3><div className="stat-value">{expected.length ? missing : '—'}</div></article>
        <article className="card"><h3>Registros manuais</h3><div className="stat-value">{dash(manual)}</div></article>
      </div>

      <details className="more-block">
        <summary>Ver detalhes da presença</summary>
      <h3 className="ops-title">Controle de presença</h3>
      <div className="filters">
        <input className="input" placeholder="Buscar" aria-label="Buscar na presença" value={presenceQuery} onChange={(event) => setPresenceQuery(event.target.value)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th><th>Presença</th><th>Método</th><th></th></tr></thead>
          <tbody>
            {people.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhum participante disponível para este dia." text="Quem está indisponível continua no cadastro, mas não entra na operação da equipe." /></td></tr> : people.map((student) => {
              const mark = presentOn(state, student.id, 1)
              const team = teamOf(state, student.id)
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.turma}</td>
                  <td>{team ? teamName(team.id) : '—'}</td>
                  <td><Badge tone={mark ? 'ok' : ''}>{mark ? 'Presente' : 'Não registrado'}</Badge></td>
                  <td>{mark?.method || '—'}</td>
                  <td><div className="row-actions"><button className="btn ghost small" type="button" onClick={() => { update((draft) => { const current = draft.students.find((item) => item.id === student.id); if (current) current.availability = 'Indisponível' }); flash(`${student.name} foi marcado como indisponível. A equipe não foi reorganizada.`) }}>Não participará</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </details>

      <details className="more-block">
        <summary>Mais informações</summary>
      <h3 className="ops-title">Cronograma</h3>
      <Flow items={DAY1_FLOW} />

      <h3 className="ops-title">Formação das equipes</h3>
      <Kpis items={[
        { label: 'Equipes confirmadas', value: dash(confirmed) },
        { label: 'Em formação', value: dash(forming) },
        { label: 'Participantes sem equipe', value: state.students.length ? without : '—' },
      ]} />
      <div className="page-actions"><button className="btn ghost" onClick={() => go('preparacao?aba=equipes')}>Abrir Equipes</button></div>

      <h3 className="ops-title">Empresas e desafios</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Equipe</th><th>Empresa</th><th>Desafio</th><th>Status</th></tr></thead>
          <tbody>
            {state.challenges.filter((item) => item.teamId).length === 0 ? <tr><td colSpan={4}><Empty title="Nenhum desafio distribuído." /></td></tr> : state.challenges.filter((item) => item.teamId).map((item) => (
              <tr key={item.id}>
                <td>{teamName(item.teamId)}</td>
                <td>{companyOf(state, item.companyId)?.name || '—'}</td>
                <td>{item.title}</td>
                <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>

      {modal === 'scan' ? (
        <Modal title="Validar ingresso" subtitle="QR Code demonstrativo — sem câmera e sem leitura real." onClose={() => setModal(null)} footer={<button className="btn ghost" onClick={() => setModal(null)}>Fechar</button>}>
          <div className="qr" style={{ margin: '0 auto 12px' }} />
          <p className="stat-hint">Dia 1 · leitura simulada neste navegador.</p>
          {!scan ? <button className="btn" onClick={() => simulate('ok')}>Simular leitura</button> : null}
          {scan?.kind === 'valid' ? (
            <div className="banner ok">
              <div>
                <b>Ingresso válido</b>
                <p>Participante: {scan.student.name}</p>
                <p>Categoria: Participante · Turma: {scan.student.turma}</p>
                <p>Equipe: {teamOf(state, scan.student.id) ? teamName(teamOf(state, scan.student.id).id) : '—'} · Dia 1</p>
                <button className="btn small" onClick={confirmScan}>Confirmar presença</button>
              </div>
            </div>
          ) : null}
          {scan?.kind === 'invalid' ? <div className="banner err"><b>Ingresso inválido</b><p>Não foi possível localizar este ingresso.</p></div> : null}
          {scan?.kind === 'used' ? <div className="banner warn"><b>Já registrado</b><p>{scan.student?.name || 'Participante'} já possui presença no Dia 1.</p></div> : null}
          <div className="page-actions">
            <button className="btn ghost small" onClick={() => simulate('invalid')}>Simular inválido</button>
            <button className="btn ghost small" onClick={() => simulate('used')}>Simular já registrado</button>
          </div>
        </Modal>
      ) : null}

      {modal === 'manual' ? (
        <Modal title="Registrar presença manualmente" subtitle="Mesma lista de presença do credenciamento." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveManual}>Salvar</button></>}>
          <Field label="Participante" required><select className="input" value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })}><option value="">Selecione</option>{expected.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.turma}</option>)}</select></Field>
          <Field label="Dia"><input className="input" value="Dia 1" readOnly /></Field>
          <Field label="Horário"><input className="input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field>
          <Field label="Motivo"><select className="input" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>{['QR Code indisponível', 'Problema de conexão', 'Ingresso não localizado', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Observação"><input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
        </Modal>
      ) : null}
    </>
  )
}

function DayTwo({ state }) {
  const { update, flash } = useHack()
  const [roomId, setRoomId] = useState(null)
  const [modal, setModal] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'Sala', description: '', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: '', equipmentId: '', problem: '', note: '', solution: '' })
  const [removing, setRemoving] = useState(null)
  const active = state.teams.filter((item) => item.status === 'confirmada').length
  const broken = state.equipment.filter((item) => item.status === 'Com problema').length
  const open = state.occurrences.filter((item) => item.status !== 'Resolvida')
  const room = state.teams.find((item) => item.id === roomId)
  const occ = state.occurrences.find((item) => item.id === detailId)

  function openProblem(place = 'Sala 01', equipmentId = '') {
    setForm({ ...form, place, equipmentId, problem: '', note: '', priority: 'Média', responsible: state.session?.name || '' })
    setModal('problem')
  }

  function saveProblem() {
    const equip = state.equipment.find((item) => item.id === form.equipmentId)
    if (!form.problem.trim() && !equip) {
      flash('Informe o problema.', 'err')
      return
    }
    update((draft) => {
      const current = draft.equipment.find((item) => item.id === form.equipmentId)
      if (current) {
        current.status = 'Com problema'
        current.notes = form.problem || form.note
      }
      draft.occurrences.unshift({
        id: uid('oc'),
        title: form.problem || `Problema em ${current?.name || 'equipamento'}`,
        category: 'Tecnologia',
        description: form.note,
        place: form.place,
        priority: form.priority,
        responsible: form.responsible,
        status: 'Aberta',
        solution: '',
        day: 2,
        at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
    })
    setModal(null)
    flash('Problema registrado.')
  }

  function saveOccurrence() {
    if (!form.title.trim()) {
      flash('Informe o título.', 'err')
      return
    }
    update((draft) => {
      const record = {
        title: form.title.trim(),
        category: form.category,
        description: form.description,
        place: form.place,
        priority: form.priority,
        responsible: form.responsible,
        status: form.status || 'Aberta',
      }
      const index = form.id ? draft.occurrences.findIndex((item) => item.id === form.id) : -1
      if (index >= 0) draft.occurrences[index] = { ...draft.occurrences[index], ...record }
      else draft.occurrences.unshift({ id: uid('oc'), ...record, solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
    })
    setModal(null)
    flash(form.id ? 'Alterações salvas.' : 'Ocorrência criada.')
  }

  function saveSolution() {
    update((draft) => {
      const current = draft.occurrences.find((item) => item.id === detailId)
      if (!current) return
      current.status = 'Resolvida'
      current.solution = form.solution
      if (form.responsible) current.responsible = form.responsible
    })
    setModal(null)
    flash('Ocorrência resolvida.')
  }

  return (
    <>
      <DayHead title="Dia 2 — Desenvolvimento" text="Acompanhe as equipes durante o desenvolvimento das soluções." />
      <section className="now-block">
        <p className="kicker">Agora</p>
        <h2>Equipes trabalhando</h2>
        <p>Veja salas, suporte e o que precisa de atenção.</p>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => { setForm({ ...form, title: '', description: '', category: 'Sala', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: state.session?.name || '' }); setModal('occ') }}>Registrar ocorrência</button>
        </div>
      </section>
      <ol className="day-track">
        <li className="now"><span>→</span> Equipes trabalhando</li>
        <li><span>○</span> Salas</li>
        <li><span>○</span> Suporte</li>
        <li><span>○</span> Equipamentos</li>
        <li><span>○</span> Ocorrências</li>
      </ol>
      <Kpis items={[
        { label: 'Equipes em atividade', value: dash(active) },
        { label: 'Salas em uso', value: dash(active) },
        { label: 'Ocorrências abertas', value: dash(open.length) },
        { label: 'Equipamentos com problema', value: dash(broken) },
      ]} />
      <h3 className="ops-title" id="salas">Andamento do dia</h3>
      <div className="grid cols-4">
        {state.teams.map((team) => {
          const challenge = teamChallenge(state, team.id)
          const company = challenge ? companyOf(state, challenge.companyId) : null
          const problems = state.occurrences.some((item) => item.place === roomLabel(team.id) && item.status !== 'Resolvida')
          const status = problems ? 'Com ocorrência' : team.status === 'confirmada' ? 'Em atividade' : 'Aguardando início'
          return (
            <article className="card room-card" key={team.id}>
              <div className="row-between"><h3>{roomLabel(team.id)}</h3><Badge tone={toneFor(status)}>{status}</Badge></div>
              <p>{teamName(team.id)}</p>
              <p>Empresa {company?.name || '—'}</p>
              <p>Desafio {challenge?.title || '—'}</p>
              {pausedMembers(team, state.students).length ? <p className="stat-hint">Atenção. A composição desta equipe mudou.</p> : null}
              <button className="btn ghost small" onClick={() => setRoomId(team.id)}>Ver detalhes</button>
            </article>
          )
        })}
      </div>

      <div className="row-between">
        <h3 className="ops-title">Ocorrências</h3>
        <button className="btn" onClick={() => { setForm({ title: '', description: '', category: 'Sala', place: 'Sala 01', priority: 'Média', status: 'Aberta', responsible: state.session?.name || '', equipmentId: '', problem: '', note: '', solution: '' }); setModal('occ') }}>+ Nova ocorrência</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ocorrência</th><th>Local</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {open.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhuma ocorrência aberta no momento." /></td></tr> : open.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.place || '—'}</td>
                <td><Badge tone={toneFor(item.priority)}>{item.priority}</Badge></td>
                <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                <td>
                  <div className="row-actions">
                    <button className="btn ghost small" onClick={() => setDetailId(item.id)}>Visualizar</button>
                    <button className="btn ghost small" onClick={() => { setForm({ description: '', responsible: '', ...item }); setModal('occ') }}>Editar</button>
                    <button className="btn ghost small" onClick={() => setRemoving(item)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {room ? <RoomDrawer team={room} onClose={() => setRoomId(null)} onProblem={(place, equipmentId) => openProblem(place, equipmentId)} /> : null}
      {occ ? (
        <Drawer title={occ.title} subtitle={occ.place || 'Local a definir'} onClose={() => setDetailId(null)} footer={occ.status !== 'Resolvida' ? <button className="btn" onClick={() => { setForm({ ...form, solution: '', responsible: occ.responsible || '' }); setModal('solve') }}>Registrar solução</button> : <button className="btn ghost" onClick={() => setDetailId(null)}>Fechar</button>}>
          <dl className="kv">
            <dt>Problema</dt><dd>{occ.description || occ.title}</dd>
            <dt>Local</dt><dd>{occ.place || '—'}</dd>
            <dt>Prioridade</dt><dd><Badge tone={toneFor(occ.priority)}>{occ.priority}</Badge></dd>
            <dt>Responsável</dt><dd>{occ.responsible || '—'}</dd>
            <dt>Status</dt><dd><Badge tone={toneFor(occ.status)}>{occ.status}</Badge></dd>
            <dt>Solução</dt><dd>{occ.solution || '—'}</dd>
          </dl>
        </Drawer>
      ) : null}

      {modal === 'occ' ? (
        <Modal title={form.id ? 'Editar ocorrência' : 'Nova ocorrência'} onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveOccurrence}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          <Field label="Título" required><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Tecnologia', 'Produção', 'Sala', 'Estrutura', 'Materiais', 'Participante', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Descrição"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Local / Sala"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
          <PriorityChips value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
          <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
          <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Aberta</option><option>Em atendimento</option></select></Field>
        </Modal>
      ) : null}
      {modal === 'problem' ? (
        <Modal title="Registrar problema" subtitle="O status segue o mesmo padrão de Tecnologia." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveProblem}>Salvar</button></>}>
          <Field label="Equipamento"><select className="input" value={form.equipmentId} onChange={(event) => setForm({ ...form, equipmentId: event.target.value })}><option value="">Selecione, se já estiver cadastrado</option>{state.equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.place || '—'}</option>)}</select></Field>
          <Field label="Sala"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
          <Field label="Problema" required><input className="input" value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} /></Field>
          <PriorityChips value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
          <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
          <Field label="Observação"><textarea className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
        </Modal>
      ) : null}
      {removing ? (
        <Modal title="Excluir ocorrência?" subtitle="O registro será removido deste navegador." onClose={() => setRemoving(null)} footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={() => { update((draft) => { draft.occurrences = draft.occurrences.filter((item) => item.id !== removing.id) }); setRemoving(null); flash('Ocorrência excluída.') }}>Excluir</button></>}>
          <p>{removing.title}</p>
        </Modal>
      ) : null}
      {modal === 'solve' ? (
        <Modal title="Registrar solução" onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveSolution}>Salvar</button></>}>
          <Field label="Solução adotada"><textarea className="input" value={form.solution} onChange={(event) => setForm({ ...form, solution: event.target.value })} /></Field>
          <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
          <Field label="Observação"><input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
        </Modal>
      ) : null}
    </>
  )
}

function RoomDrawer({ team, onClose, onProblem }) {
  const { state } = useHack()
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  const members = team.members.map((id) => state.students.find((student) => student.id === id)).filter((student) => student && isAvailable(student))
  const aside = team.members.map((id) => state.students.find((student) => student.id === id)).filter((student) => student && !isAvailable(student))
  const place = roomLabel(team.id)
  const gear = state.equipment.filter((item) => item.place === place)
  const occ = state.occurrences.filter((item) => item.place === place)
  return (
    <Drawer title={place} subtitle={teamName(team.id)} onClose={onClose}>
      <dl className="kv">
        <dt>Equipe</dt><dd>{teamName(team.id)}</dd>
        <dt>Empresa</dt><dd>{company?.name || '—'}</dd>
        <dt>Desafio</dt><dd>{challenge?.title || '—'}</dd>
      </dl>
      <h3>Participantes</h3>
      {members.length === 0 ? <p>Nenhum participante nesta equipe.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Participante</th><th>Turma</th><th>Presença</th></tr></thead>
            <tbody>{members.map((student) => <tr key={student.id}><td>{student.name}</td><td>{student.turma}</td><td>{presentOn(state, student.id, 2) ? 'Presente' : 'Não registrado'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {aside.length ? <p className="stat-hint">Fora da operação: {aside.map((student) => `${student.name} (${student.availability || 'Indisponível'})`).join(', ')}. O cadastro permanece no histórico.</p> : null}
      <h3>Equipamentos</h3>
      {gear.length === 0 ? <Empty title="Nenhum equipamento relacionado." /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Equipamento</th><th>Quantidade</th><th>Status</th></tr></thead>
            <tbody>{gear.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.qty}</td><td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <button className="btn ghost small" onClick={() => onProblem(place, gear[0]?.id || '')}>Registrar problema</button>
      <h3>Ocorrências</h3>
      {occ.length === 0 ? <p>Nenhuma ocorrência registrada.</p> : occ.map((item) => <p key={item.id}>{item.title} · <Badge tone={toneFor(item.status)}>{item.status}</Badge></p>)}
    </Drawer>
  )
}

function DayThree({ state }) {
  const ready = state.teams.filter((item) => item.status === 'confirmada')
  const evaluated = state.evaluations?.length || 0
  return (
    <>
      <DayHead title="Dia 3 — Apresentações e Resultados" text="Acompanhe apresentações, avaliações e o encerramento." />
      <section className="now-block">
        <p className="kicker">Agora</p>
        <h2>Apresentações</h2>
        <p>Acompanhe as equipes. Avaliações, votação e resultados ficam no encerramento.</p>
      </section>
      <ol className="day-track">
        <li className="now"><span>→</span> Apresentações</li>
        <li><span>○</span> Avaliações</li>
        <li><span>○</span> Votação</li>
        <li><span>○</span> Resultados</li>
        <li><span>○</span> Encerramento</li>
      </ol>
      <h3 className="ops-title">Resumo</h3>
      <Kpis items={[
        { label: 'Equipes prontas', value: dash(ready.length) },
        { label: 'Apresentações concluídas', value: '—' },
        { label: 'Avaliações concluídas', value: dash(evaluated) },
        { label: 'Ocorrências', value: dash(state.occurrences.filter((item) => item.status !== 'Resolvida').length) },
      ]} />
      <h3 className="ops-title" id="apresentacoes">Apresentações</h3>
      <p className="stat-hint">A ordem oficial ainda não está definida. Horário: A definir.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Equipe</th><th>Empresa / Desafio</th><th>Apresentação</th><th>Avaliação</th></tr></thead>
          <tbody>
            {state.teams.length === 0 ? <tr><td colSpan={4}><Empty title="Nenhuma equipe relacionada." /></td></tr> : state.teams.map((team) => {
              const challenge = teamChallenge(state, team.id)
              const company = challenge ? companyOf(state, challenge.companyId) : null
              const evaluatedTeam = (state.evaluations || []).some((item) => item.teamId === team.id)
              return (
                <tr key={team.id}>
                  <td>{teamName(team.id)}</td>
                  <td>{company?.name || '—'}{challenge ? ` · ${challenge.title}` : ''}</td>
                  <td>A definir</td>
                  <td><Badge>{evaluatedTeam ? 'Avaliada' : 'Aguardando'}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2 mt">
        <article className="card">
          <h3>Jurados</h3>
          <p>Jurados {dash(state.judges.length)}</p>
          <p>Avaliações pendentes —</p>
          <button className="btn ghost small" onClick={() => go('encerramento?aba=jurados')}>Abrir jurados</button>
        </article>
        <article className="card">
          <h3>Votação do Público</h3>
          <p><Badge tone={toneFor(state.voting.status)}>{state.voting.status}</Badge></p>
          <button className="btn ghost small" onClick={() => go('votacao')}>Abrir votação</button>
        </article>
        <article className="card">
          <h3>Painel de Resultados</h3>
          <p>{state.resultsReleased ? 'Resultados liberados' : 'Resultados ainda não liberados'}</p>
          <button className="btn ghost small" onClick={() => go('encerramento?aba=resultados')}>Abrir resultados</button>
        </article>
        <article className="card">
          <h3>Premiação</h3>
          <p><Badge>A definir</Badge></p>
        </article>
      </div>

      <h3 className="ops-title">Cronograma</h3>
      <Flow items={DAY3_FLOW} />
      <NextStep title="Dia 3 em andamento" text="Quando as apresentações avançarem, siga para o encerramento." action="Ir para Encerramento" to="encerramento?aba=jurados" />
    </>
  )
}

export function Ticket() {
  const { state } = useHack()
  const people = [
    ...state.students.map((student) => ({ id: student.id, name: student.name, category: 'Participante', turma: student.turma, team: state.teams.find((team) => team.status === 'confirmada' && team.members.includes(student.id)) })),
    ...state.users.filter((user) => user.status === 'Ativo').map((user) => ({ id: user.id, name: user.name, category: user.profile === 'Consultor' ? 'Consultor' : 'Organização', turma: '—', team: null })),
    ...state.judges.map((judge) => ({ id: judge.id, name: judge.name, category: 'Jurado', turma: '—', team: null })),
  ]
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const person = people.find((item) => item.id === personId) || { name: 'Participante demonstrativo', category: 'Participante', turma: 'Turma demonstrativa', team: null }
  return (
    <Page crumbs="HackLab / Evento / Modo Evento / Ingresso Digital" title="Ingresso Digital HackLab" subtitle="Modelo visual do ingresso — o mesmo ingresso pode ser usado nos três dias. QR Code apenas representativo." actions={<><button className="btn ghost" type="button" onClick={() => go('evento?dia=1')}>Voltar</button><button className="btn" onClick={() => go('validar?dia=1')}>Validar ingresso</button></>}>
      {people.length ? (
        <Field label="Pessoa">
          <select className="input" value={personId} onChange={(event) => setPersonId(event.target.value)}>
            {people.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}
          </select>
        </Field>
      ) : <div className="banner">Sem pessoas cadastradas. O modelo abaixo usa dados demonstrativos.</div>}
      <div className="ticket">
        <div className="ticket-top"><b>HackLab</b><p>Ingresso de Participação</p></div>
        <div className="ticket-body">
          <Badge>{person.category}</Badge>
          <p><b>{person.name}</b></p>
          <p>Turma {person.turma || '—'} · Equipe {person.team ? teamName(person.team.id) : 'A definir'}</p>
          <p>Evento {state.event.name} · {state.event.date || 'Data a definir'} · {state.event.start} às {state.event.end}</p>
          <div className="qr" />
          <p className="stat-hint">Ingresso nº DEMO-{String(person.id || '001').slice(-3).toUpperCase()} · representação visual, não é um QR Code real.</p>
        </div>
      </div>
      <div className="card mt">
        <p>Não são exibidos CPF, matrícula, telefone ou documentos. O mesmo ingresso é usado no Dia 1, Dia 2 e Dia 3. A entrada pode ser registrada por QR Code simulado ou manualmente.</p>
        <p>Tipos: Participante, Consultor, Jurado, Empresa, Organização e Público — diferenciados por texto e selo.</p>
      </div>
    </Page>
  )
}

export function Validate({ params }) {
  const { state, update, flash } = useHack()
  const [day, setDay] = useState(Number(params.dia || 1))
  const [result, setResult] = useState(null)

  function simulate(kind) {
    if (kind === 'invalid') {
      setResult({ ok: false, title: 'Ingresso inválido', text: 'Não foi possível localizar este ingresso.' })
      return
    }
    const student = state.students[0]
    if (!student) {
      setResult({ ok: false, title: 'Sem participantes', text: 'Cadastre alunos antes de simular a leitura.' })
      return
    }
    const used = state.checkins.some((item) => item.personId === student.id && item.day === day && item.status === 'Presente')
    if (kind === 'used' || used) {
      setResult({ ok: false, title: 'Ingresso já utilizado', text: `${student.name} já possui entrada registrada no Dia ${day}.` })
      return
    }
    setResult({ ok: true, title: 'Ingresso válido', text: 'Entrada liberada para o dia selecionado.', student })
  }

  function confirm() {
    if (!result?.student) return
    update((draft) => {
      draft.checkins.push({
        id: uid('ck'),
        personId: result.student.id,
        personName: result.student.name,
        category: 'Participante',
        turma: result.student.turma,
        day,
        method: 'QR Code',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        responsible: state.session?.name,
        status: 'Presente',
        note: '',
      })
    })
    flash('Check-in confirmado.')
    setResult(null)
  }

  return (
    <Page crumbs="HackLab / Evento / Modo Evento / Validar ingresso" title="Validar ingresso" subtitle="Simule a leitura do QR Code para confirmar a entrada do participante." actions={<button className="btn ghost" type="button" onClick={() => go('evento?dia=1')}>Voltar</button>}>
      <div className="filters">
        <span>Dia</span>
        {[1, 2, 3].map((item) => <button key={item} className={`chip ${day === item ? 'on' : ''}`} onClick={() => setDay(item)}>Dia {item}</button>)}
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="qr" style={{ margin: '0 auto 12px' }} />
        <p>Posicione o QR Code para leitura. Leitura simulada — sem câmera real.</p>
        <div className="page-actions" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => simulate('ok')}>Simular leitura</button>
          <button className="btn ghost" onClick={() => simulate('used')}>Simular ingresso já utilizado</button>
          <button className="btn ghost" onClick={() => simulate('invalid')}>Simular ingresso inválido</button>
        </div>
      </div>
      {result ? (
        <div className={`banner ${result.ok ? 'ok' : 'warn'}`}>
          <div>
            <b>{result.title}</b>
            <p>{result.text}</p>
            {result.ok ? <button className="btn small" onClick={confirm}>Confirmar check-in</button> : null}
          </div>
        </div>
      ) : null}
    </Page>
  )
}

export function Presence() {
  const { state, update, flash } = useHack()
  const [day, setDay] = useState(1)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ personId: '', time: '08:10', reason: 'QR Code indisponível', note: '' })
  const rows = state.checkins.filter((item) => item.day === day)
  const present = rows.filter((item) => item.status === 'Presente').length

  function save() {
    const student = state.students.find((item) => item.id === form.personId)
    if (!student) {
      flash('Selecione um participante.', 'err')
      return
    }
    update((draft) => {
      draft.checkins.push({
        id: uid('ck'), personId: student.id, personName: student.name, category: 'Participante', turma: student.turma,
        day, method: 'Manual', time: form.time, responsible: state.session?.name, status: 'Presente', note: `${form.reason}. ${form.note}`,
      })
    })
    setModal(false)
    flash('Presença registrada manualmente.')
  }

  return (
    <Page crumbs="HackLab / Evento / Modo Evento / Presença" title="Controle de Presença" subtitle="Acompanhe a presença dos participantes nos três dias do evento. Presença no evento é diferente da presença em reuniões." actions={<><button className="btn ghost" type="button" onClick={() => go('evento?dia=1')}>Voltar</button><button className="btn ghost" onClick={() => go('validar')}>Validar ingresso</button><button className="btn" onClick={() => setModal(true)}>Registrar presença manualmente</button></>}>
      <Tabs tabs={[{ id: '1', label: 'Dia 1' }, { id: '2', label: 'Dia 2' }, { id: '3', label: 'Dia 3' }]} value={String(day)} onChange={(value) => setDay(Number(value))} />
      <div className="grid cols-4">
        <article className="card"><h3>Inscritos</h3><div className="stat-value">{state.students.length || '—'}</div></article>
        <article className="card"><h3>Presentes</h3><div className="stat-value">{present || '—'}</div></article>
        <article className="card"><h3>QR Code</h3><div className="stat-value">{rows.filter((item) => item.method === 'QR Code').length || '—'}</div></article>
        <article className="card"><h3>Manuais</h3><div className="stat-value">{rows.filter((item) => item.method === 'Manual').length || '—'}</div></article>
      </div>
      <div className="table-wrap mt">
        <table>
          <thead><tr><th>Participante</th><th>Categoria</th><th>Dia</th><th>Entrada</th><th>Método</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma presença registrada." text="Os check-ins por QR Code e os registros manuais aparecerão aqui." /></td></tr> : rows.map((item) => (
              <tr key={item.id}><td>{item.personName}</td><td>{item.category}</td><td>Dia {item.day}</td><td>{item.time}</td><td>{item.method}</td><td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal ? (
        <Modal title="Registrar presença manualmente" subtitle="Dentro do horário oficial 08:00 às 12:00." onClose={() => setModal(false)} footer={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn" onClick={save}>Registrar presença</button></>}>
          <Field label="Participante"><select className="input" value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })}><option value="">Nome do participante</option>{state.students.filter(isAvailable).map((student) => <option key={student.id} value={student.id}>{student.name} · {student.turma}</option>)}</select></Field>
          <Field label="Horário de entrada"><input className="input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field>
          <Field label="Motivo do registro manual">
            <select className="input" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
              {['QR Code indisponível', 'Problema de conexão', 'Ingresso não localizado', 'Outro'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Observação"><input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
        </Modal>
      ) : null}
    </Page>
  )
}

export function Room({ params }) {
  const { state, update, flash } = useHack()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'Sala', description: '', priority: 'Média', equipment: '' })
  const id = Number(params.id || 1)
  const team = state.teams.find((item) => item.id === id) || state.teams[0]
  if (!team) {
    return (
      <Page title="Sala" actions={<button className="btn ghost" type="button" onClick={() => go('evento?dia=2')}>Voltar</button>}>
        <Empty title="Nenhuma equipe formada" text="A sala acompanha uma equipe já formada." />
      </Page>
    )
  }
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  const members = team.members.map((memberId) => state.students.find((student) => student.id === memberId)).filter((student) => student && isAvailable(student))
  const paused = team.members.map((memberId) => state.students.find((student) => student.id === memberId)).filter((student) => student && !isAvailable(student))
  const roomName = `Sala ${String(team.id).padStart(2, '0')}`
  const occ = state.occurrences.filter((item) => item.place === roomName)

  function save() {
    if (modal === 'occ' && !form.title.trim()) {
      flash('Informe o título da ocorrência.', 'err')
      return
    }
    update((draft) => {
      if (modal === 'occ') {
        draft.occurrences.unshift({ id: uid('oc'), title: form.title, category: form.category, description: form.description, place: roomName, priority: form.priority, responsible: state.session?.name, status: 'Aberta', solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
      } else {
        draft.equipment.push({ id: uid('eq'), name: form.equipment || 'Equipamento da sala', category: 'Outro', qty: 1, place: roomName, responsible: state.session?.name, status: 'Com problema', notes: form.description })
        draft.occurrences.unshift({ id: uid('oc'), title: `Problema em ${form.equipment || 'equipamento'}`, category: 'Equipamento', description: form.description, place: roomName, priority: form.priority, responsible: '', status: 'Aberta', solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
      }
    })
    setModal(null)
    flash(modal === 'occ' ? 'Ocorrência registrada.' : 'Problema de equipamento registrado para a Tecnologia.')
  }

  return (
    <Page crumbs={`HackLab / Evento / Modo Evento / ${roomName}`} title={roomName} subtitle={`${teamName(team.id)} · Dia 2 — Desenvolvimento das Soluções`} actions={<><button className="btn ghost" type="button" onClick={() => go('evento?dia=2')}>Voltar</button><button className="btn ghost" onClick={() => setModal('prob')}>Registrar problema</button><button className="btn" onClick={() => setModal('occ')}>Registrar ocorrência</button></>}>
      <div className="grid cols-3">
        <article className="card"><h3>Equipe</h3><p>{teamName(team.id)}</p></article>
        <article className="card"><h3>Empresa</h3><p>{company?.name || '—'}</p></article>
        <article className="card"><h3>Desafio</h3><p>{challenge?.title || '—'}</p></article>
      </div>
      <h3 className="section-title">Participantes da sala</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Participante</th><th>Turma</th><th>Presença</th></tr></thead>
          <tbody>
            {members.length === 0 ? <tr><td colSpan={3}>Equipe ainda sem participantes confirmados.</td></tr> : members.map((student) => {
              const present = state.checkins.some((item) => item.personId === student.id && item.day === 2 && item.status === 'Presente')
              return <tr key={student.id}><td>{student.name}</td><td>{student.turma}</td><td>{present ? 'Presente' : 'Não registrado'}</td></tr>
            })}
          </tbody>
        </table>
      </div>
      {paused.length ? <p className="stat-hint">Fora da operação: {paused.map((student) => `${student.name} (${student.availability || 'Indisponível'})`).join(', ')}. O cadastro permanece no histórico.</p> : null}
      <h3 className="section-title">Ocorrências da sala</h3>
      {occ.length === 0 ? <p>Nenhuma ocorrência registrada.</p> : occ.map((item) => <p key={item.id}>{item.title} · {item.priority} · {item.status}</p>)}
      {modal ? (
        <Modal title={modal === 'occ' ? 'Nova ocorrência' : 'Registrar problema de equipamento'} onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={save}>{modal === 'occ' ? 'Registrar ocorrência' : 'Registrar problema'}</button></>}>
          {modal === 'occ' ? <Field label="Título" required><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field> : <Field label="Equipamento"><input className="input" value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} /></Field>}
          <Field label="Descrição"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Prioridade"><div className="chips">{['Baixa', 'Média', 'Alta', 'Urgente'].map((item) => <button type="button" key={item} className={`chip ${form.priority === item ? 'on' : ''}`} onClick={() => setForm({ ...form, priority: item })}>{item}</button>)}</div></Field>
          {modal === 'occ' ? <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Tecnologia', 'Produção', 'Participante', 'Sala', 'Equipamento', 'Estrutura', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></Field> : <p className="stat-hint">O problema fica relacionado ao setor Tecnologia, sem automação de pendência.</p>}
        </Modal>
      ) : null}
    </Page>
  )
}

export function Occurrences() {
  const { state, update, flash } = useHack()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Sala', description: '', place: 'Sala 01', priority: 'Média', status: 'Aberta' })
  const [solve, setSolve] = useState(null)
  const [solution, setSolution] = useState('')

  function save() {
    if (!form.title.trim()) return flash('Informe o título.', 'err')
    update((draft) => { draft.occurrences.unshift({ id: uid('oc'), ...form, responsible: state.session?.name, solution: '', day: 2, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }) })
    setModal(false)
    flash('Ocorrência adicionada à lista.')
  }

  return (
    <Page crumbs="HackLab / Evento / Modo Evento / Ocorrências" title="Ocorrências do Evento" subtitle="Registre e acompanhe situações que precisam de atenção durante o Hackathon." actions={<><button className="btn ghost" type="button" onClick={() => go('evento?dia=2')}>Voltar</button><button className="btn" onClick={() => setModal(true)}>Nova ocorrência</button></>}>
      <p className="stat-hint">Equipamentos e tecnologia → setor Tecnologia · Sala, estrutura e materiais → setor Produção.</p>
      <div className="grid cols-4">
        {['Aberta', 'Em atendimento', 'Resolvida', 'Urgente'].map((label) => (
          <article className="card" key={label}><h3>{label}</h3><div className="stat-value">{(label === 'Urgente' ? state.occurrences.filter((item) => item.priority === 'Urgente' && item.status !== 'Resolvida') : state.occurrences.filter((item) => item.status === label)).length || '—'}</div></article>
        ))}
      </div>
      <div className="table-wrap mt">
        <table>
          <thead><tr><th>Ocorrência</th><th>Categoria</th><th>Local</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {state.occurrences.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma ocorrência registrada." text="As ocorrências abertas durante o evento aparecerão aqui." /></td></tr> : state.occurrences.map((item) => (
              <tr key={item.id}>
                <td>{item.title}<br /><small>{item.description}</small></td>
                <td>{item.category}</td><td>{item.place}</td>
                <td><Badge tone={toneFor(item.priority)}>{item.priority}</Badge></td>
                <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                <td>{item.status !== 'Resolvida' ? <button className="btn ghost small" onClick={() => setSolve(item)}>Resolver</button> : item.solution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal ? (
        <Modal title="Nova ocorrência" onClose={() => setModal(false)} footer={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn" onClick={save}>Registrar ocorrência</button></>}>
          <Field label="Título" required><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Tecnologia', 'Produção', 'Participante', 'Sala', 'Equipamento', 'Estrutura', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Local"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
          <Field label="Descrição"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Prioridade"><div className="chips">{['Baixa', 'Média', 'Alta', 'Urgente'].map((item) => <button type="button" key={item} className={`chip ${form.priority === item ? 'on' : ''}`} onClick={() => setForm({ ...form, priority: item })}>{item}</button>)}</div></Field>
        </Modal>
      ) : null}
      {solve ? (
        <Modal title="Registrar solução" onClose={() => setSolve(null)} footer={<><button className="btn ghost" onClick={() => setSolve(null)}>Cancelar</button><button className="btn" onClick={() => { update((draft) => { const current = draft.occurrences.find((item) => item.id === solve.id); current.status = 'Resolvida'; current.solution = solution }); setSolve(null); flash('Ocorrência marcada como resolvida.') }}>Marcar como resolvida</button></>}>
          <Field label="Solução adotada"><textarea className="input" value={solution} onChange={(event) => setSolution(event.target.value)} /></Field>
        </Modal>
      ) : null}
    </Page>
  )
}
