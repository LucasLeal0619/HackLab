import { useMemo, useState } from 'react'
import { activeMembers, AVAILABILITY, balanceLabel, isAvailable, memberCounts, pausedMembers, reservedIds, suggestTeams, teamName, TURMAS } from '../model'
import { go, useHack } from '../store'
import { Badge, Empty, Modal, Page, Tabs, toneFor } from '../ui'

function countText(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

export function Teams() {
  const { state, update, flash } = useHack()
  const [open, setOpen] = useState(false)
  const [replace, setReplace] = useState(false)
  const available = state.students.filter(isAvailable)
  const placed = new Set(state.teams.flatMap((team) => activeMembers(team, state.students).map((student) => student.id)))
  const free = available.filter((student) => !placed.has(student.id)).length
  const allocated = available.filter((student) => placed.has(student.id)).length
  const changed = state.teams.some((team) => pausedMembers(team, state.students).length)
  const size = state.teamSize || 6

  function applySuggestion() {
    const next = suggestTeams(state.students, size, { vary: true })
    if (!next.length) {
      flash('Nenhum participante disponível para formar equipes.', 'err')
      return
    }
    update((draft) => { draft.teams = next })
    setOpen(false)
    setReplace(false)
    flash('Nova sugestão criada. A divisão das turmas mudou e todo mundo disponível entrou.')
  }

  function askGenerate() {
    if (state.teams.some((team) => (team.members || []).length)) setReplace(true)
    else applySuggestion()
  }

  function mountManual() {
    if (state.teams.length) {
      setOpen(false)
      go(`montar?id=${state.teams[0].id}`)
      return
    }
    const numbers = state.teams.map((team) => Number(team.id)).filter((value) => Number.isFinite(value))
    const id = (numbers.length ? Math.max(...numbers) : 0) + 1
    update((draft) => {
      draft.teams.push({ id, status: 'em-montagem', members: [], solution: '' })
    })
    setOpen(false)
    go(`montar?id=${id}`)
  }

  return (
    <Page
      title="Equipes"
      subtitle="As equipes são sugeridas com base nos participantes disponíveis, buscando uma distribuição equilibrada entre as turmas."
      actions={<button className="btn" type="button" onClick={() => setOpen(true)}>Formar equipes</button>}
    >
      <div className="grid cols-4">
        <article className="card stat"><div className="stat-label">Disponíveis</div><div className="stat-value">{available.length}</div></article>
        <article className="card stat"><div className="stat-label">Equipes formadas</div><div className="stat-value">{state.teams.length}</div></article>
        <article className="card stat"><div className="stat-label">Alocados</div><div className="stat-value">{allocated}</div></article>
        <article className="card stat"><div className="stat-label">Sem equipe</div><div className="stat-value">{free}</div></article>
      </div>

      <p className="stat-hint mt">O HackLab distribui os participantes disponíveis buscando equilibrar o tamanho das equipes e as turmas. A sugestão é um ponto de partida.</p>

      {changed ? (
        <div className="banner warn mt">
          <div>
            <b>A composição das equipes foi alterada porque um participante ficou indisponível.</b>
            <p>Nenhuma equipe foi reorganizada automaticamente.</p>
            <div className="page-actions">
              <button className="btn ghost small" type="button" onClick={() => state.teams[0] && go(`montar?id=${state.teams[0].id}`)}>Ajustar manualmente</button>
              <button className="btn small" type="button" onClick={() => setReplace(true)}>Gerar nova sugestão</button>
            </div>
          </div>
        </div>
      ) : null}

      {state.teams.length === 0 ? (
        <div className="mt">
          <Empty
            title="Nenhuma equipe formada"
            text="Cadastre os participantes disponíveis e gere uma sugestão de formação das equipes."
            action={<button className="btn" type="button" onClick={() => setOpen(true)}>Formar equipes</button>}
          />
        </div>
      ) : (
        <div className="team-grid mt">
          {state.teams.map((team) => {
            const active = activeMembers(team, state.students)
            const paused = pausedMembers(team, state.students)
            const counts = memberCounts(team, state.students, { onlyAvailable: true })
            const label = balanceLabel(team, state.students, state.teams)
            return (
              <article className="card" key={team.id}>
                <div className="row-between">
                  <strong>{teamName(team.id)}</strong>
                  <Badge tone={label === 'Equilibrada' ? 'ok' : 'warn'}>{label}</Badge>
                </div>
                <p>{countText(active.length, 'participante', 'participantes')}</p>
                <ul className="team-mix">
                  {TURMAS.map((turma) => <li key={turma.id}><span>{turma.id}</span><b>{counts[turma.id]}</b></li>)}
                </ul>
                {paused.length ? (
                  <p className="stat-hint">Atenção. A composição desta equipe mudou.</p>
                ) : null}
                <div className="page-actions">
                  <button className="btn ghost small" type="button" onClick={() => go(`montar?id=${team.id}`)}>Ver equipe</button>
                  {paused.length ? <button className="btn ghost small" type="button" onClick={() => go(`montar?id=${team.id}`)}>Adicionar participante</button> : null}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {open ? (
        <Modal
          title="Formar equipes"
          subtitle="A sugestão usa somente quem está disponível. O tamanho desejado é um objetivo, não uma regra."
          onClose={() => setOpen(false)}
          footer={<><button className="btn ghost" type="button" onClick={mountManual}>Montar manualmente</button><button className="btn" type="button" onClick={askGenerate}>Gerar sugestão</button></>}
        >
          <p>Participantes disponíveis: {available.length}</p>
          {TURMAS.map((turma) => <p key={turma.id}>{turma.id}: {available.filter((student) => student.turma === turma.id).length}</p>)}
          <label className="field">
            <span>Tamanho desejado por equipe</span>
            <input className="input" type="number" min="1" value={size} onChange={(event) => update((draft) => { draft.teamSize = Math.max(1, Number(event.target.value) || 1) })} />
          </label>
          <p className="stat-hint">Cada sugestão muda a divisão das turmas. As equipes ficam com tamanhos próximos e ninguém disponível fica de fora.</p>
        </Modal>
      ) : null}

      {replace ? (
        <Modal
          title="Gerar nova sugestão?"
          subtitle="A formação atual será substituída. Essa ação só acontece porque você pediu."
          onClose={() => setReplace(false)}
          footer={<><button className="btn ghost" type="button" onClick={() => setReplace(false)}>Cancelar</button><button className="btn" type="button" onClick={applySuggestion}>Gerar sugestão</button></>}
        >
          <p>A divisão entre as turmas muda nesta sugestão. Os tamanhos das equipes continuam próximos.</p>
        </Modal>
      ) : null}
    </Page>
  )
}

export function TeamBuild({ params }) {
  const { state, update, flash } = useHack()
  const team = state.teams.find((item) => String(item.id) === String(params.id)) || state.teams[0]
  const [query, setQuery] = useState('')
  const [turma, setTurma] = useState('Todas')
  const [blocked, setBlocked] = useState(null)
  const taken = useMemo(() => reservedIds(state.teams, team?.id), [state.teams, team?.id])

  if (!team) {
    return (
      <Page title="Equipe" actions={<button className="btn ghost" type="button" onClick={() => go('preparacao?aba=equipes')}>Voltar</button>}>
        <Empty title="Nenhuma equipe formada" text="Gere uma sugestão ou comece uma equipe manualmente." action={<button className="btn" type="button" onClick={() => go('preparacao?aba=equipes')}>Ir para Equipes</button>} />
      </Page>
    )
  }

  const active = activeMembers(team, state.students)
  const paused = pausedMembers(team, state.students)
  const counts = memberCounts(team, state.students, { onlyAvailable: true })

  function add(student) {
    if (!isAvailable(student)) {
      flash('Somente participantes disponíveis entram na formação.', 'err')
      return
    }
    if (taken.has(student.id)) {
      const owner = state.teams.find((item) => item.id !== team.id && item.members.includes(student.id))
      setBlocked({ student, owner })
      return
    }
    if (team.members.includes(student.id)) return
    update((draft) => {
      const current = draft.teams.find((item) => item.id === team.id)
      current.members.push(student.id)
      if (current.status === 'nao-formada') current.status = 'em-montagem'
    })
  }

  function remove(studentId) {
    update((draft) => {
      const current = draft.teams.find((item) => item.id === team.id)
      current.members = current.members.filter((item) => item !== studentId)
    })
  }

  function transfer() {
    if (!blocked?.owner) return
    update((draft) => {
      const from = draft.teams.find((item) => item.id === blocked.owner.id)
      const to = draft.teams.find((item) => item.id === team.id)
      if (from) from.members = from.members.filter((item) => item !== blocked.student.id)
      if (to && !to.members.includes(blocked.student.id)) to.members.push(blocked.student.id)
    })
    setBlocked(null)
    flash(`${blocked.student.name} foi transferido para a ${teamName(team.id)}.`)
  }

  const pool = state.students.filter((student) => {
    const matches = student.name.toLowerCase().includes(query.toLowerCase())
    const turmaOk = turma === 'Todas' || student.turma === turma
    return matches && turmaOk && isAvailable(student) && !team.members.includes(student.id) && !taken.has(student.id)
  })

  return (
    <Page
      crumbs={`Equipes / ${teamName(team.id)}`}
      title={teamName(team.id)}
      subtitle="Ajuste a equipe manualmente. A sugestão automática não impede essas alterações."
      actions={<button className="btn ghost" type="button" onClick={() => go('preparacao?aba=equipes')}>Voltar</button>}
    >
      <div className="card">
        <div className="row-between">
          <h3>{countText(active.length, 'participante disponível', 'participantes disponíveis')}</h3>
          <Badge tone={balanceLabel(team, state.students, state.teams) === 'Equilibrada' ? 'ok' : 'warn'}>{balanceLabel(team, state.students, state.teams)}</Badge>
        </div>
        <p className="stat-hint">Breno {counts.Breno} · Rafael {counts.Rafael} · Clara {counts.Clara}</p>
        <p className="stat-hint">Tamanho desejado: {state.teamSize || 6}. Esse número é uma referência.</p>
        {paused.length ? <p>Atenção. A composição desta equipe mudou.</p> : null}
      </div>
      <div className="split mt">
        <section className="card">
          <h3>Participantes disponíveis</h3>
          <Tabs tabs={[{ id: 'Todas', label: 'Todos' }, ...TURMAS.map((item) => ({ id: item.id, label: item.id }))]} value={turma} onChange={setTurma} />
          <input className="input" placeholder="Buscar participante" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar participante" />
          {pool.length === 0 ? <p className="stat-hint">Nenhum participante disponível nesta visão.</p> : pool.map((student) => (
            <div className="person" key={student.id}>
              <span>{student.name}<br /><small>{student.turma}</small></span>
              <button className="btn ghost small" type="button" onClick={() => add(student)}>Adicionar</button>
            </div>
          ))}
        </section>
        <aside className="card">
          <h3>Nesta equipe</h3>
          {active.length === 0 ? <p>Nenhum participante disponível nesta equipe.</p> : active.map((student) => (
            <div className="person" key={student.id}>
              <span>{student.name}<br /><small>{student.turma}</small></span>
              <button className="btn ghost small" type="button" onClick={() => remove(student.id)}>Remover</button>
            </div>
          ))}
          {paused.length ? (
            <>
              <h3>Fora da formação</h3>
              {paused.map((student) => (
                <div className="person" key={student.id}>
                  <span>{student.name}<br /><small>{availabilityOfSafe(student)}</small></span>
                  <button className="btn ghost small" type="button" onClick={() => remove(student.id)}>Remover</button>
                </div>
              ))}
            </>
          ) : null}
        </aside>
      </div>
      {blocked ? (
        <Modal
          title="Participante já está em outra equipe"
          subtitle="Remova ou transfira antes de colocá-lo nesta equipe."
          onClose={() => setBlocked(null)}
          footer={<><button className="btn ghost" type="button" onClick={() => setBlocked(null)}>Escolher outro</button>{blocked.owner ? <button className="btn" type="button" onClick={transfer}>Transferir para esta equipe</button> : null}</>}
        >
          <p><b>{blocked.student.name}</b> já pertence à {blocked.owner ? teamName(blocked.owner.id) : 'outra equipe'}.</p>
        </Modal>
      ) : null}
    </Page>
  )
}

function availabilityOfSafe(student) {
  return AVAILABILITY.includes(student.availability) ? student.availability : 'Disponível'
}

export function Roulette({ params }) {
  const { state } = useHack()
  const team = state.teams.find((item) => String(item.id) === String(params.id)) || state.teams[0]
  return (
    <Page title="Formação de equipes" actions={<button className="btn ghost" type="button" onClick={() => go('preparacao?aba=equipes')}>Voltar</button>}>
      <Empty title="A formação agora é uma sugestão equilibrada" text={team ? 'Use Formar equipes para gerar ou ajustar a distribuição. O sorteio por modelo fixo não faz mais parte da formação.' : 'Ainda não há equipes formadas.'} action={<button className="btn" type="button" onClick={() => go('preparacao?aba=equipes')}>Ir para Equipes</button>} />
    </Page>
  )
}
