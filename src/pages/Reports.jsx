import { useState } from 'react'
import { activeMembers, companyOf, teamChallenge, teamName, TURMAS } from '../model'
import { go, useHack } from '../store'
import { Badge, Empty, Page, toneFor } from '../ui'

const REPORTS = [
  ['visao', 'Visão geral', 'Participantes, equipes, presença, avaliações e votação.'],
  ['participantes', 'Participantes', 'Cadastrados por turma e situação de disponibilidade.'],
  ['presenca', 'Presença', 'Registro nos três dias.'],
  ['equipes', 'Equipes', 'Composição, empresa e desafio.'],
  ['empresas', 'Empresas e desafios', 'Empresa, desafio, equipe e status.'],
  ['avaliacoes', 'Avaliações', 'Andamento do resultado técnico.'],
  ['votacao', 'Votação', 'Votos registrados, quando existirem.'],
  ['ocorrencias', 'Ocorrências', 'Abertas, resolvidas, prioridade e local.'],
  ['financeiro', 'Financeiro', 'Orçamento, receitas, despesas e saldo.'],
  ['reunioes', 'Reuniões', 'Reuniões, atas, manifestações, decisões e pendências.'],
]

function money(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function brl(value) {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function knownAmount(item, kind) {
  if (kind === 'receita') return money(item.value)
  if (item.actual !== '' && item.actual != null) return money(item.actual)
  if (item.planned !== '' && item.planned != null) return money(item.planned)
  return null
}

function presentOn(state, personId, day) {
  return state.checkins.some((item) => item.personId === personId && Number(item.day) === day && item.status === 'Presente')
}

function teamEvalStatus(state, teamId) {
  const items = state.evaluations.filter((item) => item.teamId === teamId)
  if (items.some((item) => item.status === 'revisao')) return 'Em revisão'
  const done = items.filter((item) => item.status === 'concluida')
  const judges = state.judges.filter((item) => item.status !== 'Inativo')
  if (!items.length) return 'Não iniciada'
  if (judges.length && done.length >= judges.length) return 'Concluída'
  if (!judges.length && done.length) return 'Concluída'
  return 'Em andamento'
}

function averageOf(state, teamId) {
  const scores = state.evaluations
    .filter((item) => item.teamId === teamId && item.status === 'concluida')
    .flatMap((item) => Object.values(item.scores || {}).map(Number).filter((value) => !Number.isNaN(value)))
  if (!scores.length) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

export function Reports({ params = {} }) {
  const { state, flash } = useHack()
  const selected = REPORTS.some((item) => item[0] === params.tipo) ? params.tipo : ''
  const [filters, setFilters] = useState({ type: '', status: '', category: '' })
  if (filters.type !== selected) setFilters({ type: selected, status: '', category: '' })

  function choose(id) {
    go(id ? `relatorios?tipo=${id}` : 'relatorios')
  }

  return (
    <Page title="Relatórios" subtitle="Consulte o que aconteceu na organização e no evento.">
      <p className="stat-hint">Escolha o que deseja analisar.</p>
      <div className="report-picks">
        {REPORTS.map(([id, title, text]) => (
          <button type="button" key={id} className={`card report-pick ${selected === id ? 'on' : ''}`} aria-pressed={selected === id} onClick={() => choose(id)}>
            <b>{title}</b>
            <span>{text}</span>
          </button>
        ))}
      </div>
      {selected ? (
        <ReportBody state={state} type={selected} status={filters.status} category={filters.category} onStatus={(status) => setFilters({ ...filters, status })} onCategory={(category) => setFilters({ ...filters, category })} flash={flash} />
      ) : null}
    </Page>
  )
}

function Toolbar({ status, category, statuses, categories, onStatus, onCategory }) {
  return (
    <div className="filters">
      <label className="field">Período
        <select className="input" defaultValue="todo" aria-label="Período"><option value="todo">Todo o evento</option></select>
      </label>
      {statuses ? (
        <label className="field">Status
          <select className="input" value={status} aria-label="Status" onChange={(event) => onStatus(event.target.value)}>
            <option value="">Todos</option>
            {statuses.map((item) => {
              const value = Array.isArray(item) ? item[0] : item
              const label = Array.isArray(item) ? item[1] : item
              return <option key={value} value={value}>{label}</option>
            })}
          </select>
        </label>
      ) : null}
      {categories ? (
        <label className="field">Categoria
          <select className="input" value={category} aria-label="Categoria" onChange={(event) => onCategory(event.target.value)}>
            <option value="">Todas</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  )
}

function Actions({ flash }) {
  return (
    <div className="page-actions">
      <button className="btn ghost" onClick={() => flash('Exportação demonstrativa. Nenhum arquivo foi gerado.')}>Exportar PDF</button>
      <button className="btn ghost" onClick={() => flash('Exportação demonstrativa. Nenhum arquivo foi gerado.')}>Exportar planilha</button>
      <button className="btn ghost" onClick={() => window.print()}>Imprimir</button>
    </div>
  )
}

function Bars({ items }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="bars" aria-label="Distribuição">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div className="bar-track"><div style={{ width: `${(item.value / max) * 100}%` }} /></div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  )
}

function Table({ head, rows, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={head.length}>{empty}</td></tr> : rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportBody({ state, type, status, category, onStatus, onCategory, flash }) {
  const meta = REPORTS.find((item) => item[0] === type)
  const openOccurrences = state.occurrences.filter((item) => item.status !== 'Resolvida')
  const resolved = state.occurrences.filter((item) => item.status === 'Resolvida')
  const incomes = state.incomes.map((item) => knownAmount(item, 'receita')).filter((value) => value != null)
  const expenses = state.expenses.map((item) => knownAmount(item, 'despesa')).filter((value) => value != null)
  const incomeTotal = incomes.reduce((sum, value) => sum + value, 0)
  const expenseTotal = expenses.reduce((sum, value) => sum + value, 0)

  let statuses = null
  let categories = null
  if (type === 'equipes') statuses = [['nao-formada', 'Não formada'], ['em-montagem', 'Em formação'], ['confirmada', 'Confirmada']]
  if (type === 'avaliacoes') statuses = ['Não iniciada', 'Em andamento', 'Concluída', 'Em revisão']
  if (type === 'ocorrencias') {
    statuses = [...new Set(state.occurrences.map((item) => item.status).filter(Boolean))]
    categories = [...new Set(state.occurrences.map((item) => item.category).filter(Boolean))]
  }
  if (type === 'financeiro') categories = ['Receita', 'Despesa']
  if (type === 'reunioes') statuses = [...new Set(state.meetings.map((item) => item.status).filter(Boolean))]

  return (
    <section className="report-body">
      <div className="row-between">
        <h2 className="ops-title">{meta[1]}</h2>
        <Actions flash={flash} />
      </div>
      <Toolbar status={status} category={category} statuses={statuses} categories={categories} onStatus={onStatus} onCategory={onCategory} />
      {type === 'visao' ? <Overview state={state} openOccurrences={openOccurrences.length} /> : null}
      {type === 'participantes' ? <PeopleReport state={state} /> : null}
      {type === 'presenca' ? <PresenceReport state={state} /> : null}
      {type === 'equipes' ? <TeamsReport state={state} status={status} /> : null}
      {type === 'empresas' ? <CompaniesReport state={state} /> : null}
      {type === 'avaliacoes' ? <EvalReport state={state} status={status} /> : null}
      {type === 'votacao' ? <VoteReport state={state} /> : null}
      {type === 'ocorrencias' ? <OccurrenceReport state={state} status={status} category={category} openCount={openOccurrences.length} resolvedCount={resolved.length} /> : null}
      {type === 'financeiro' ? <FinanceReport state={state} category={category} incomeTotal={incomes.length ? incomeTotal : null} expenseTotal={expenses.length ? expenseTotal : null} /> : null}
      {type === 'reunioes' ? <MeetingsReport state={state} status={status} /> : null}
    </section>
  )
}

function Overview({ state, openOccurrences }) {
  const present = state.students.filter((item) => [1, 2, 3].some((day) => presentOn(state, item.id, day))).length
  const items = [
    ['Participantes cadastrados', state.students.length || '—'],
    ['Participantes disponíveis', state.students.filter((item) => (item.availability || 'Disponível') === 'Disponível').length || '—'],
    ['Equipes', state.teams.length || '—'],
    ['Empresas', state.companies.length || '—'],
    ['Desafios', state.challenges.length || '—'],
    ['Presença', present || '—'],
    ['Ocorrências abertas', openOccurrences || '—'],
    ['Avaliações concluídas', state.evaluations.filter((item) => item.status === 'concluida').length || '—'],
    ['Votação', state.voting.ballots.length ? `${state.voting.ballots.length} votos · ${state.voting.status}` : state.voting.status],
  ]
  return (
    <div className="grid cols-3">
      {items.map(([label, value]) => <article className="card" key={label}><h3>{label}</h3><div className="stat-value" style={{ fontSize: 28 }}>{value}</div></article>)}
    </div>
  )
}

function PeopleReport({ state }) {
  return (
    <>
      <Bars items={TURMAS.map((turma) => ({ label: turma.id, value: state.students.filter((item) => item.turma === turma.id).length }))} />
      <p className="stat-hint">Cadastrados neste protótipo: {state.students.length || '—'}.</p>
      <Table
        head={['Participante', 'Turma', 'Equipe']}
        empty="Nenhum participante cadastrado."
        rows={state.students.map((item) => {
          const team = state.teams.find((entry) => entry.members.includes(item.id))
          return [item.name, item.turma, team ? teamName(team.id) : 'Sem equipe']
        })}
      />
    </>
  )
}

function PresenceReport({ state }) {
  if (state.students.length === 0) return <Empty title="Nenhum registro de presença." text="Não há participantes cadastrados para consultar." />
  return (
    <Table
      head={['Participante', 'Dia 1', 'Dia 2', 'Dia 3', 'Frequência']}
      empty="Nenhum registro de presença."
      rows={state.students.map((item) => {
        const marks = [1, 2, 3].map((day) => (presentOn(state, item.id, day) ? 'Presente' : '—'))
        const count = marks.filter((mark) => mark === 'Presente').length
        return [item.name, ...marks, count ? `${count} de 3` : '—']
      })}
    />
  )
}

function TeamsReport({ state, status }) {
  const rows = state.teams.filter((team) => !status || team.status === status)
  return (
    <Table
      head={['Equipe', 'Participantes', 'Empresa', 'Desafio', 'Status']}
      empty="Nenhuma equipe encontrada para este filtro."
      rows={rows.map((team) => {
        const challenge = teamChallenge(state, team.id)
        const company = challenge ? companyOf(state, challenge.companyId) : null
        return [teamName(team.id), activeMembers(team, state.students).length || '—', company?.name || '—', challenge?.title || '—', { 'nao-formada': 'Não formada', 'em-montagem': 'Em formação', confirmada: 'Confirmada' }[team.status] || team.status]
      })}
    />
  )
}

function CompaniesReport({ state }) {
  if (state.companies.length === 0 && state.challenges.length === 0) return <Empty title="Não há dados suficientes para esta visualização." />
  return (
    <Table
      head={['Empresa', 'Desafio', 'Equipe', 'Status']}
      empty="Nenhum desafio distribuído."
      rows={state.challenges.map((item) => [
        companyOf(state, item.companyId)?.name || '—',
        item.title,
        item.teamId ? teamName(item.teamId) : '—',
        item.status || '—',
      ])}
    />
  )
}

function EvalReport({ state, status }) {
  const rows = state.teams.map((team) => {
    const count = state.evaluations.filter((item) => item.teamId === team.id && item.status === 'concluida').length
    const avg = averageOf(state, team.id)
    const label = teamEvalStatus(state, team.id)
    return { team, count, avg, label }
  }).filter((item) => !status || item.label === status)
  if (state.evaluations.length === 0 && !status) return <Empty title="Nenhuma avaliação registrada." />
  return (
    <Table
      head={['Equipe', 'Avaliações', 'Resultado', 'Status']}
      empty="Nenhuma avaliação para este filtro."
      rows={rows.map((item) => [teamName(item.team.id), item.count || '—', item.avg == null ? '—' : item.avg.toFixed(1), item.label])}
    />
  )
}

function VoteReport({ state }) {
  const total = state.voting.ballots.length
  return (
    <>
      <p>Status <Badge tone={toneFor(state.voting.status)}>{state.voting.status}</Badge></p>
      <p>Total de votos: {total || '—'}</p>
      {total === 0 ? <Empty title="Não há dados suficientes para esta visualização." text="A votação ainda não registrou votos." /> : (
        <Table
          head={['Equipe', 'Votos', 'Percentual']}
          empty="Nenhum voto registrado."
          rows={state.teams.map((team) => {
            const votes = state.voting.ballots.filter((item) => item.teamId === team.id).length
            return [teamName(team.id), votes, `${Math.round((votes / total) * 100)}%`]
          })}
        />
      )}
    </>
  )
}

function OccurrenceReport({ state, status, category, openCount, resolvedCount }) {
  const rows = state.occurrences.filter((item) => (!status || item.status === status) && (!category || item.category === category))
  const groups = [...new Set(state.occurrences.map((item) => item.category).filter(Boolean))]
  return (
    <>
      <div className="grid cols-3">
        <article className="card"><h3>Abertas</h3><div className="stat-value">{openCount || '—'}</div></article>
        <article className="card"><h3>Resolvidas</h3><div className="stat-value">{resolvedCount || '—'}</div></article>
        <article className="card"><h3>Total</h3><div className="stat-value">{state.occurrences.length || '—'}</div></article>
      </div>
      {groups.length === 0 ? <p className="stat-hint">Não há dados suficientes para gerar esta visualização.</p> : (
        <Bars items={groups.map((item) => ({ label: item, value: state.occurrences.filter((entry) => entry.category === item).length }))} />
      )}
      {rows.length === 0 ? <Empty title="Nenhuma ocorrência registrada." /> : (
        <Table
          head={['Ocorrência', 'Categoria', 'Local', 'Prioridade', 'Status']}
          empty="Nenhuma ocorrência para este filtro."
          rows={rows.map((item) => [item.title, item.category || '—', item.place || '—', item.priority || '—', item.status || '—'])}
        />
      )}
    </>
  )
}

function FinanceReport({ state, category, incomeTotal, expenseTotal }) {
  const movements = [
    ...state.incomes.map((item) => ({ tipo: 'Receita', description: item.description, value: knownAmount(item, 'receita'), status: item.status })),
    ...state.expenses.map((item) => ({ tipo: 'Despesa', description: item.description, value: knownAmount(item, 'despesa'), status: item.status })),
  ].filter((item) => !category || item.tipo === category)
  const balance = incomeTotal != null || expenseTotal != null ? (incomeTotal || 0) - (expenseTotal || 0) : null
  return (
    <>
      <div className="grid cols-4">
        <article className="card"><h3>Orçamento</h3><div className="stat-value">—</div></article>
        <article className="card"><h3>Receitas</h3><div className="stat-value">{brl(incomeTotal)}</div></article>
        <article className="card"><h3>Despesas</h3><div className="stat-value">{brl(expenseTotal)}</div></article>
        <article className="card"><h3>Saldo</h3><div className="stat-value">{brl(balance)}</div></article>
      </div>
      {movements.length === 0 ? <p className="stat-hint">Não há dados suficientes para gerar esta visualização.</p> : (
        <Table
          head={['Descrição', 'Tipo', 'Valor', 'Status']}
          empty="Sem movimentações."
          rows={movements.map((item) => [item.description || '—', item.tipo, item.value == null ? '—' : brl(item.value), item.status || '—'])}
        />
      )}
    </>
  )
}

function MeetingsReport({ state, status }) {
  const meetings = state.meetings.filter((item) => !status || item.status === status)
  const manifestations = state.meetings.reduce((sum, item) => sum + (item.ata?.manifestations?.length || 0), 0)
  const atas = state.meetings.filter((item) => item.ata).length
  return (
    <>
      <div className="grid cols-4">
        <article className="card"><h3>Reuniões</h3><div className="stat-value">{state.meetings.length || '—'}</div></article>
        <article className="card"><h3>Atas</h3><div className="stat-value">{atas || '—'}</div></article>
        <article className="card"><h3>Manifestações</h3><div className="stat-value">{manifestations || '—'}</div></article>
        <article className="card"><h3>Decisões</h3><div className="stat-value">{state.decisions.length || '—'}</div></article>
      </div>
      <p className="stat-hint">Pendências: {state.tasks.length || '—'}.</p>
      {meetings.length === 0 ? <Empty title="Não há dados suficientes para esta visualização." /> : (
        <Table
          head={['Reunião', 'Status', 'Ata', 'Manifestações']}
          empty="Nenhuma reunião para este filtro."
          rows={meetings.map((item) => [item.title, item.status || '—', item.ata ? (item.ata.status || 'Registrada') : '—', item.ata?.manifestations?.length || '—'])}
        />
      )}
    </>
  )
}
