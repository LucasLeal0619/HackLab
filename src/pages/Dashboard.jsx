import { journeySteps } from '../model'
import { go, useHack } from '../store'
import { Badge, Page, toneFor } from '../ui'

function count(value) {
  return value ? String(value) : '—'
}

function statusLabel(status) {
  if (status === 'concluida') return 'Concluída'
  if (status === 'andamento') return 'Em andamento'
  return 'Pendente'
}

export default function Dashboard() {
  const { state } = useHack()
  const profile = state.session?.profile
  if (profile === 'Editor') return <EditorHome state={state} />
  return <OrganizerHome state={state} consultor={profile === 'Consultor'} />
}

function OrganizerHome({ state, consultor }) {
  const steps = journeySteps(state)
  const done = steps.filter((step) => step.status === 'concluida').length
  const current = steps.find((step) => step.status === 'andamento') || steps[steps.length - 1]
  const actions = steps.filter((step) => step.status !== 'concluida').slice(0, 3)
  const openTasks = state.tasks.filter((task) => task.status !== 'Concluído').length
  const openOcc = state.occurrences.filter((item) => item.status !== 'Resolvida').length
  const { event } = state

  return (
    <Page
      title="Início"
      subtitle={consultor
        ? 'Acompanhe a preparação, as equipes e o que precisa de atenção.'
        : 'Acompanhe a preparação do Hackathon e continue de onde parou.'}
    >
      <section className="card journey-card">
        <div className="row-between">
          <div>
            <p className="kicker">Preparação do Hackathon</p>
            <h2>{done} de 7 etapas concluídas</h2>
          </div>
          <button className="btn" type="button" onClick={() => go(current.to)}>Continuar organização</button>
        </div>
        <ol className="journey-steps">
          {steps.map((step, index) => (
            <li key={step.label} className={step.status}>
              <span>{index + 1}</span>
              <b>{step.label}</b>
              <small>{statusLabel(step.status)}</small>
            </li>
          ))}
        </ol>
      </section>

      <article className="card event-mini">
        <div>
          <p className="kicker">Hackathon</p>
          <h3>{event.name || 'Hackathon'}</h3>
        </div>
        <p>Data: {event.date || 'A definir'}</p>
        <p>{event.days || 3} dias</p>
        <p>{event.start || '08:00'} às {event.end || '12:00'}</p>
        <p>Local: {event.location || 'A cadastrar'}</p>
      </article>

      <div className="grid cols-3">
        <article className="card stat"><div className="stat-label">Participantes</div><div className="stat-value">{count(state.students.length)}</div></article>
        <article className="card stat"><div className="stat-label">Equipes</div><div className="stat-value">{count(state.teams.length)}</div></article>
        <article className="card stat"><div className="stat-label">Empresas</div><div className="stat-value">{count(state.companies.length)}</div></article>
        <article className="card stat"><div className="stat-label">Desafios</div><div className="stat-value">{count(state.challenges.length)}</div></article>
        <article className="card stat"><div className="stat-label">Pendências</div><div className="stat-value">{count(openTasks)}</div></article>
        <article className="card stat"><div className="stat-label">Ocorrências</div><div className="stat-value">{count(openOcc)}</div></article>
      </div>

      <section className="mt">
        <h3 className="ops-title">Próximas ações</h3>
        {actions.length === 0 ? <p className="stat-hint">A organização já passou pelas etapas principais.</p> : (
          <div className="grid cols-3">
            {actions.map((step) => (
              <article className="card" key={step.label}>
                <h3>{step.label}</h3>
                <p className="stat-hint">{statusLabel(step.status)}</p>
                <button className="btn ghost small" type="button" onClick={() => go(step.to)}>Abrir</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </Page>
  )
}

function EditorHome({ state }) {
  const sectors = state.session?.sectors?.length ? state.session.sectors : [state.session?.sector || 'Tecnologia']
  const tasks = state.tasks.filter((task) => sectors.includes(task.sector) && task.status !== 'Concluído')
  const calls = state.occurrences.filter((item) => item.category === 'Suporte' && item.status !== 'Resolvida')
  return (
    <Page title="Início" subtitle="Suas pendências, seu setor e o que acontece no evento.">
      <div className="page-actions">
        <button className="btn" type="button" onClick={() => go(`gestao?aba=setores&setor=${encodeURIComponent(sectors[0])}`)}>Abrir meu setor</button>
        <button className="btn ghost" type="button" onClick={() => go('evento')}>Modo Evento</button>
      </div>
      <div className="grid cols-2 mt">
        <article className="card">
          <h3>Minhas pendências</h3>
          {tasks.length === 0 ? <p>Nenhuma pendência encontrada.</p> : tasks.slice(0, 3).map((task) => (
            <p key={task.id}>{task.title} · <Badge tone={toneFor(task.status)}>{task.status}</Badge></p>
          ))}
          <button className="btn ghost small" type="button" onClick={() => go('gestao?aba=pendencias')}>Ver pendências</button>
        </article>
        <article className="card">
          <h3>Meu setor</h3>
          {sectors.map((name) => <p key={name}>{name}</p>)}
          <button className="btn small" type="button" onClick={() => go(`gestao?aba=setores&setor=${encodeURIComponent(sectors[0])}`)}>Abrir setor</button>
        </article>
        <article className="card">
          <h3>Atividades do evento</h3>
          <p>Credenciamento, salas e o andamento dos três dias.</p>
          <button className="btn ghost small" type="button" onClick={() => go('evento')}>Abrir Modo Evento</button>
        </article>
        <article className="card">
          <h3>Ocorrências relacionadas</h3>
          {calls.length === 0 ? <p>Nenhuma ocorrência aberta. Tudo certo por aqui.</p> : calls.slice(0, 3).map((item) => (
            <p key={item.id}>{item.title}</p>
          ))}
        </article>
      </div>
    </Page>
  )
}
