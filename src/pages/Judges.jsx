import { useState } from 'react'
import { companyOf, teamChallenge, teamName, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Drawer, Empty, Field, Icon, Logo, Modal, Page, Tabs, toneFor } from '../ui'

const VOTE_KEY = 'hacklab.vote.cast'

function teamLabel(state, team) {
  const challenge = teamChallenge(state, team.id)
  const company = challenge ? companyOf(state, challenge.companyId) : null
  return { challenge, company }
}

function dash(value) {
  return value ? value : '—'
}

function doneEvals(state, teamId) {
  return state.evaluations.filter((item) => item.teamId === teamId && item.status === 'concluida')
}

function teamStatus(state, teamId) {
  const items = state.evaluations.filter((item) => item.teamId === teamId)
  if (items.some((item) => item.status === 'revisao')) return 'Em revisão'
  const activeJudges = state.judges.filter((item) => item.status !== 'Inativo')
  const done = items.filter((item) => item.status === 'concluida')
  if (!items.length) return 'Não iniciada'
  if (activeJudges.length && done.length >= activeJudges.length) return 'Concluída'
  if (!activeJudges.length && done.length) return 'Concluída'
  return 'Em andamento'
}

function averageOf(state, teamId) {
  const scores = doneEvals(state, teamId).flatMap((item) => Object.values(item.scores || {}).map(Number).filter((value) => !Number.isNaN(value)))
  if (!scores.length) return null
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

function voteCount(state, teamId) {
  return state.voting.ballots.filter((item) => item.teamId === teamId).length
}

export function Judges({ params, part }) {
  const { state, update, flash } = useHack()
  const tab = part === 'votacao' || params.aba === 'publico' ? 'publico' : 'avaliacoes'
  const showAdmin = part ? part === 'jurados' || part === 'avaliacoes' : tab === 'avaliacoes'
  const showJudgesBlock = !part || part === 'jurados'
  const showEvalBlock = !part || part === 'avaliacoes'
  const showVote = part === 'votacao' || (!part && tab === 'publico')
  const showResults = part === 'resultados'
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [confirmVote, setConfirmVote] = useState(false)
  const [judgeDetail, setJudgeDetail] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [showVotes, setShowVotes] = useState(false)

  const activeJudges = state.judges.filter((item) => item.status !== 'Inativo')
  const finished = state.evaluations.filter((item) => item.status === 'concluida').length
  const pendingTeams = activeJudges.length
    ? state.teams.filter((team) => teamStatus(state, team.id) !== 'Concluída').length
    : 0
  const company = state.companies.find((item) => item.id === form.companyId)
  const reps = company?.reps || []
  const selectedRep = reps.find((item) => item.id === form.repId)

  function choose(id) {
    setShowVotes(false)
    go(id === 'publico' ? 'encerramento?aba=votacao' : 'encerramento?aba=jurados')
  }

  function saveJudge() {
    if (!selectedRep) return flash('Selecione um representante já associado à empresa.', 'err')
    const exists = state.judges.some((item) => item.id !== form.id && (item.repId === selectedRep.id || (item.name === selectedRep.name && item.companyId === company.id)))
    if (exists) return flash('Este representante já está definido como jurado.', 'err')
    const record = {
      repId: selectedRep.id,
      name: selectedRep.name,
      companyId: company.id,
      companyName: company.name,
      cargo: selectedRep.cargo || '—',
      email: selectedRep.email || '',
      phone: selectedRep.phone || '',
      status: form.status || 'Ativo',
    }
    update((draft) => {
      const index = form.id ? draft.judges.findIndex((item) => item.id === form.id) : -1
      if (index >= 0) draft.judges[index] = { ...draft.judges[index], ...record }
      else draft.judges.push({ id: uid('jur'), ...record })
    })
    setModal(null)
    flash(form.id ? 'Alterações salvas.' : 'Jurado adicionado.')
  }

  function saveCriterion() {
    if (!form.name?.trim()) return flash('Informe o nome do critério.', 'err')
    const record = {
      name: form.name.trim(),
      description: form.description || '',
      type: form.type || 'Nota numérica',
      min: form.min ?? '',
      max: form.max ?? '',
      weight: form.weight ?? '',
      active: form.status !== 'Inativo',
      status: form.status || 'Ativo',
      demo: /demonstrativo/i.test(form.name),
    }
    update((draft) => {
      const index = form.id ? draft.criteria.findIndex((item) => item.id === form.id) : -1
      if (index >= 0) draft.criteria[index] = { ...draft.criteria[index], ...record }
      else draft.criteria.push({ id: uid('cri'), ...record, order: draft.criteria.length + 1 })
    })
    setModal(null)
    flash(form.id ? 'Alterações salvas.' : 'Critério salvo.')
  }

  function openJudge() {
    setForm({ companyId: state.companies[0]?.id || '', repId: '', status: 'Ativo' })
    setModal('juiz')
  }

  function openCriterion(item) {
    if (item) {
      setForm({ ...item, status: item.active === false || item.status === 'Inativo' ? 'Inativo' : 'Ativo' })
    } else {
      setForm({ name: '', description: '', type: 'Nota numérica', min: '', max: '', weight: '', status: 'Ativo' })
    }
    setModal('criterio')
  }

  const totalVotes = state.voting.ballots.length

  return (
    <Page
      crumbs={tab === 'publico' ? 'HackLab / Evento / Jurados e Votação / Votação do Público' : 'HackLab / Evento / Jurados e Votação'}
      title="Jurados e Votação"
      subtitle="Acompanhe avaliações dos jurados e a votação do público no encerramento do Hackathon."
    >
      {part ? null : (
        <Tabs
          tabs={[
            { id: 'avaliacoes', label: 'Jurados e Avaliações' },
            { id: 'publico', label: 'Votação do Público' },
          ]}
          value={tab}
          onChange={choose}
        />
      )}

      {showAdmin ? (
        <>
          {showJudgesBlock ? (
            <>
          <div className="grid cols-4">
            <article className="card"><h3>Jurados</h3><div className="stat-value">{dash(state.judges.length)}</div></article>
            <article className="card"><h3>Equipes</h3><div className="stat-value">{state.teams.length || '—'}</div></article>
            <article className="card"><h3>Avaliações concluídas</h3><div className="stat-value">{dash(finished)}</div></article>
            <article className="card"><h3>Pendentes</h3><div className="stat-value">{activeJudges.length ? pendingTeams : '—'}</div></article>
          </div>

          <div className="row-between mt">
            <h3 className="ops-title">Jurados</h3>
            <button className="btn" onClick={openJudge}>+ Adicionar jurado</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Jurado</th><th>Empresa</th><th>Avaliações</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {state.judges.length === 0 ? (
                  <tr><td colSpan={5}><Empty title="Nenhum jurado cadastrado." text="O jurado reutiliza um representante já associado à empresa." /></td></tr>
                ) : state.judges.map((judge) => {
                  const count = state.evaluations.filter((item) => item.judgeName === judge.name && item.status === 'concluida').length
                  return (
                    <tr key={judge.id}>
                      <td>{judge.name}</td>
                      <td>{judge.companyName}</td>
                      <td>{dash(count)}</td>
                      <td><Badge tone={toneFor(judge.status)}>{judge.status}</Badge></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn ghost small" onClick={() => setJudgeDetail(judge)}>Visualizar</button>
                          <button className="btn ghost small" onClick={() => { const owner = state.companies.find((item) => item.id === judge.companyId); const rep = owner?.reps?.find((item) => item.id === judge.repId) || owner?.reps?.find((item) => item.name === judge.name); setForm({ id: judge.id, companyId: judge.companyId, repId: rep?.id || '', status: judge.status || 'Ativo' }); setModal('juiz') }}>Editar</button>
                          <button className="btn ghost small" onClick={() => setRemoving({ kind: 'jurado', id: judge.id, name: judge.name })}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="row-between mt">
            <div>
              <h3 className="ops-title">Critérios de Avaliação</h3>
              <p className="stat-hint">Os critérios oficiais ainda não foram definidos. Eles são configuráveis.</p>
            </div>
            <button className="btn ghost" onClick={openCriterion}>+ Adicionar critério</button>
          </div>
          {state.criteria.length === 0 ? <Empty title="Nenhum critério configurado." text="Adicione um critério quando a organização definir a avaliação. Um exemplo pode usar o nome Critério demonstrativo 01." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Critério</th><th>Tipo</th><th>Escala</th><th>Peso</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {state.criteria.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.demo || /demonstrativo/i.test(item.name) ? <div><Badge>Dado demonstrativo</Badge></div> : null}
                        {item.description ? <div><small>{item.description}</small></div> : null}
                      </td>
                      <td>{item.type}</td>
                      <td>{item.min !== '' && item.max !== '' && item.min != null && item.max != null ? `${item.min}–${item.max}` : '—'}</td>
                      <td>{item.weight === '' || item.weight == null ? '—' : item.weight}</td>
                      <td><Badge tone={toneFor(item.active === false || item.status === 'Inativo' ? 'Inativo' : 'Ativo')}>{item.active === false || item.status === 'Inativo' ? 'Inativo' : 'Ativo'}</Badge></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn ghost small" onClick={() => openCriterion(item)}>Editar</button>
                          <button className="btn ghost small" onClick={() => update((draft) => {
                            const current = draft.criteria.find((criterion) => criterion.id === item.id)
                            current.active = !current.active
                            current.status = current.active ? 'Ativo' : 'Inativo'
                          })}>{item.active === false || item.status === 'Inativo' ? 'Ativar' : 'Inativar'}</button>
                          <button className="btn ghost small" onClick={() => setRemoving({ kind: 'criterio', id: item.id, name: item.name })}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

            </>
          ) : null}
          {showEvalBlock ? (
            <>
          <div className="page-actions">
            <button className="btn" type="button" onClick={() => go('area-jurado')}>Abrir Área do Jurado</button>
          </div>
          <h3 className="ops-title">Avaliações</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipe</th><th>Desafio</th><th>Jurados</th><th>Avaliações</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {state.teams.map((team) => {
                  const { challenge } = teamLabel(state, team)
                  const status = teamStatus(state, team.id)
                  const done = doneEvals(state, team.id).length
                  return (
                    <tr key={team.id}>
                      <td>{teamName(team.id)}</td>
                      <td>{challenge?.title || '—'}</td>
                      <td>{dash(activeJudges.length)}</td>
                      <td>{done ? `${done}` : '—'}</td>
                      <td><Badge tone={toneFor(status)}>{status}</Badge></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn ghost small" onClick={() => go(`avaliar?id=${team.id}`)}>Editar</button>
                          <button className="btn ghost small" onClick={() => setRemoving({ kind: 'avaliacao', id: team.id, name: teamName(team.id) })}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {state.evaluations.length === 0 ? <p className="stat-hint">Nenhuma avaliação iniciada.</p> : null}
            </>
          ) : null}
        </>
      ) : null}
      {showVote ? (
        <section className="vote-admin">
          <div className="row-between">
            <div>
              <h2 className="ops-title">Votação do Público</h2>
              <p className="stat-hint">A votação popular é independente do resultado técnico dos jurados. Os dois resultados não são somados.</p>
            </div>
            <Badge tone={toneFor(state.voting.status)}>{state.voting.status}</Badge>
          </div>
          <div className="grid cols-4">
            <article className="card"><h3>Status</h3><div className="stat-value" style={{ fontSize: 22 }}>{state.voting.status}</div></article>
            <article className="card"><h3>Votos registrados</h3><div className="stat-value">{dash(totalVotes)}</div></article>
            <article className="card"><h3>Equipes</h3><div className="stat-value">{state.teams.length || '—'}</div></article>
            <article className="card"><h3>Participantes habilitados</h3><div className="stat-value">—</div></article>
          </div>
          <div className="page-actions mt">
            {state.voting.status === 'Não iniciada' ? <button className="btn" onClick={() => setConfirmVote('start')}>Iniciar votação</button> : null}
            {state.voting.status === 'Em andamento' ? <button className="btn" onClick={() => setConfirmVote('end')}>Encerrar votação</button> : null}
            {state.voting.status === 'Encerrada' ? <button className="btn" onClick={() => setShowVotes(true)}>Visualizar resultado</button> : null}
            <button className="btn ghost" onClick={() => go('votacao')}>Abrir Votação Pública</button>
          </div>
          {state.voting.status !== 'Encerrada' ? <p className="stat-hint">A tela pública não mostra votos, percentuais nem equipe mais votada enquanto a votação estiver aberta.</p> : null}
          <div className="vote-qr">
            <div className="qr" aria-hidden="true" />
            <p className="stat-hint">QR Code demonstrativo — representação visual, sem leitura real.</p>
          </div>
          {state.voting.status === 'Não iniciada' ? <p className="stat-hint">A votação ainda não foi iniciada.</p> : null}
          {showVotes && state.voting.status === 'Encerrada' ? (
            <div className="mt">
              <h3 className="ops-title">Resultado da votação</h3>
              {totalVotes === 0 ? <Empty title="Nenhum voto registrado." text="Não há dados suficientes para um resultado." /> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Equipe</th><th>Votos</th><th>Percentual</th></tr></thead>
                    <tbody>
                      {state.teams.map((team) => {
                        const votes = voteCount(state, team.id)
                        return <tr key={team.id}><td>{teamName(team.id)}</td><td>{votes}</td><td>{Math.round((votes / totalVotes) * 100)}%</td></tr>
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
      {showResults ? (
        <section className="card">
          <h2 className="ops-title">Resultados</h2>
          <p>{state.resultsReleased ? 'A divulgação já foi liberada.' : 'Verifique os resultados disponíveis e libere a divulgação quando estiver pronto.'}</p>
          <button className="btn" type="button" onClick={() => go('painel')}>Abrir Painel de Resultados</button>
        </section>
      ) : null}

      {modal === 'juiz' ? (
        <Modal title={form.id ? 'Editar jurado' : 'Adicionar jurado'} subtitle="Empresa, representante e, então, a função de jurado. O cadastro do representante não é duplicado." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveJudge}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          {state.companies.length === 0 ? <Empty title="Nenhuma empresa cadastrada." text="Associe um representante à empresa antes de definir um jurado." /> : (
            <>
              <Field label="Empresa" required>
                <select className="input" value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value, repId: '' })}>
                  {state.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Representante" required>
                <select className="input" value={form.repId || ''} onChange={(event) => setForm({ ...form, repId: event.target.value })}>
                  <option value="">Selecione</option>
                  {reps.map((rep) => <option key={rep.id || rep.name} value={rep.id}>{rep.name}</option>)}
                </select>
              </Field>
              {reps.length === 0 ? <p className="stat-hint">Nenhum representante associado a esta empresa.</p> : null}
              <Field label="Cargo / Função"><input className="input" value={selectedRep?.cargo || ''} readOnly placeholder="—" /></Field>
              <Field label="Status">
                <select className="input" value={form.status || 'Ativo'} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </Field>
            </>
          )}
        </Modal>
      ) : null}

      {modal === 'criterio' ? (
        <Modal title={form.id ? 'Editar critério' : 'Novo critério'} subtitle="Nenhum critério é oficial até a organização definir a avaliação." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={saveCriterion}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          <Field label="Nome" required hint="Para um exemplo, use Critério demonstrativo 01."><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Descrição"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <div className="field">
            <span>Tipo</span>
            <div className="chips">{['Nota numérica', 'Escala', 'Conceito'].map((item) => <button type="button" key={item} className={`chip ${form.type === item ? 'on' : ''}`} onClick={() => setForm({ ...form, type: item })}>{item}</button>)}</div>
          </div>
          <div className="form-grid">
            <Field label="Nota mínima"><input className="input" value={form.min} onChange={(event) => setForm({ ...form, min: event.target.value })} /></Field>
            <Field label="Nota máxima"><input className="input" value={form.max} onChange={(event) => setForm({ ...form, max: event.target.value })} /></Field>
          </div>
          <Field label="Peso" hint="Opcional. Não define a fórmula oficial."><input className="input" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </Field>
        </Modal>
      ) : null}

      {confirmVote ? (
        <Modal
          title={confirmVote === 'start' ? 'Iniciar votação do público?' : 'Encerrar votação?'}
          subtitle={confirmVote === 'end' ? 'Após o encerramento, novos votos não serão registrados neste protótipo.' : 'Os participantes poderão escolher uma equipe. A tela pública não mostra resultado parcial.'}
          onClose={() => setConfirmVote(false)}
          footer={<><button className="btn ghost" onClick={() => setConfirmVote(false)}>Cancelar</button><button className="btn" onClick={() => { update((draft) => { draft.voting.status = confirmVote === 'start' ? 'Em andamento' : 'Encerrada' }); setConfirmVote(false); setShowVotes(false); flash(confirmVote === 'start' ? 'Votação iniciada.' : 'Votação encerrada.') }}>{confirmVote === 'start' ? 'Iniciar votação' : 'Encerrar votação'}</button></>}
        >
          <p>{confirmVote === 'start' ? 'Um voto por navegador.' : 'O resultado da votação continua separado do resultado dos jurados.'}</p>
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          title={removing.kind === 'avaliacao' ? 'Excluir avaliação?' : 'Excluir registro?'}
          subtitle={removing.kind === 'avaliacao' ? 'As notas desta equipe saem deste navegador.' : 'O registro será removido deste navegador.'}
          onClose={() => setRemoving(null)}
          footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={() => { update((draft) => { if (removing.kind === 'jurado') draft.judges = draft.judges.filter((item) => item.id !== removing.id); if (removing.kind === 'criterio') draft.criteria = draft.criteria.filter((item) => item.id !== removing.id); if (removing.kind === 'avaliacao') draft.evaluations = draft.evaluations.filter((item) => item.teamId !== removing.id) }); setRemoving(null); flash(removing.kind === 'avaliacao' ? 'Avaliação excluída.' : 'Registro excluído.') }}>Excluir</button></>}
        >
          <p>{removing.name}</p>
        </Modal>
      ) : null}

      {judgeDetail ? (
        <Drawer title={judgeDetail.name} subtitle={judgeDetail.companyName} onClose={() => setJudgeDetail(null)}>
          <p><b>Cargo / Função</b><br />{judgeDetail.cargo || '—'}</p>
          <p><b>Status</b><br />{judgeDetail.status}</p>
          <p><b>E-mail</b><br />{judgeDetail.email || '—'}</p>
          <p><b>Telefone</b><br />{judgeDetail.phone || '—'}</p>
          <p className="stat-hint">Estes dados vêm do representante da empresa e ficam fora da tabela principal.</p>
        </Drawer>
      ) : null}
    </Page>
  )
}

export function JudgeArea() {
  const { state } = useHack()
  return (
    <Page title="Equipes disponíveis" subtitle="Escolha a equipe que você vai avaliar.">
      <div className="grid cols-2">
        {state.teams.map((team) => {
          const { challenge, company } = teamLabel(state, team)
          const status = teamStatus(state, team.id)
          return (
            <article className="card" key={team.id}>
              <h3>{teamName(team.id)}</h3>
              <p>{company?.name || '—'} · {challenge?.title || '—'}</p>
              <Badge tone={toneFor(status)}>{status}</Badge>
              <div><button className="btn small" onClick={() => go(`avaliar?id=${team.id}`)}>Avaliar equipe</button></div>
            </article>
          )
        })}
      </div>
    </Page>
  )
}

export function Evaluate({ params }) {
  const { state, update, flash } = useHack()
  const team = state.teams.find((item) => item.id === Number(params.id || 1)) || state.teams[0]
  const { challenge, company } = teamLabel(state, team)
  const criteria = state.criteria.filter((item) => item.active !== false && item.status !== 'Inativo')
  const judgeName = state.session?.name || 'Jurado'
  const existing = state.evaluations.find((item) => item.teamId === team.id && item.judgeName === judgeName)
  const [scores, setScores] = useState(existing?.scores || {})
  const [notes, setNotes] = useState(existing?.notes || '')
  const [ask, setAsk] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [reason, setReason] = useState('')
  const locked = existing?.status === 'concluida'
  const filled = criteria.filter((item) => scores[item.id] !== undefined && scores[item.id] !== '').length

  function persist(status) {
    if (status === 'concluida' && criteria.length && criteria.some((item) => scores[item.id] === undefined || scores[item.id] === '')) {
      flash('Preencha os critérios antes de finalizar.', 'err')
      setAsk(false)
      return
    }
    update((draft) => {
      const current = draft.evaluations.find((item) => item.teamId === team.id && item.judgeName === judgeName)
      const payload = { id: current?.id || uid('av'), teamId: team.id, judgeName, scores, notes, status, at: new Date().toLocaleString('pt-BR') }
      if (current) Object.assign(current, payload)
      else draft.evaluations.push(payload)
      if (status === 'concluida') draft.audit.unshift({ id: uid('aud'), action: 'Avaliação finalizada', at: payload.at, detail: `${judgeName} · ${teamName(team.id)}` })
    })
    setAsk(false)
    flash(status === 'concluida' ? 'Avaliação registrada.' : 'Rascunho salvo.')
  }

  function applyCorrection() {
    if (!reason.trim()) return flash('Informe o motivo da correção.', 'err')
    update((draft) => {
      const current = draft.evaluations.find((item) => item.teamId === team.id && item.judgeName === judgeName)
      if (current) {
        current.status = 'revisao'
        current.correction = reason.trim()
      }
      draft.audit.unshift({ id: uid('aud'), action: 'Correção administrativa', at: new Date().toLocaleString('pt-BR'), detail: `${teamName(team.id)} · ${reason.trim()}` })
    })
    setCorrect(false)
    setReason('')
    flash('Correção registrada.')
  }

  return (
    <Page crumbs={`Área do Jurado / ${teamName(team.id)}`} title={`Avaliar ${teamName(team.id)}`} subtitle="Preencha os critérios e finalize a avaliação." actions={<button className="btn ghost" onClick={() => go('area-jurado')}>Voltar às equipes</button>}>
      <div className="eval-head">
        <div>
          <p><b>Equipe</b> {teamName(team.id)}</p>
          <p><b>Empresa</b> {company?.name || '—'}</p>
          <p><b>Desafio</b> {challenge?.title || '—'}</p>
        </div>
        <div>
          {locked ? <Badge tone="ok">Concluída</Badge> : existing?.status === 'revisao' ? <Badge tone="warn">Em revisão</Badge> : existing ? <Badge tone="warn">Em andamento</Badge> : <Badge>Não iniciada</Badge>}
          {criteria.length ? <p className="eval-progress">{filled} de {criteria.length} critérios preenchidos</p> : null}
        </div>
      </div>
      <article className="card">
        <h3>Solução apresentada</h3>
        <p>{team.solution || 'Resumo ainda não informado pela equipe.'}</p>
      </article>
      <h3 className="ops-title">Critérios</h3>
      {criteria.length === 0 ? <Empty title="Nenhum critério configurado." text="Configure os critérios em Jurados e Votação antes de avaliar." /> : criteria.map((item) => (
        <div className="eval-row" key={item.id}>
          <div>
            <b>{item.name}</b>
            {item.demo || /demonstrativo/i.test(item.name) ? <Badge>Dado demonstrativo</Badge> : null}
            <p>{item.description || 'Sem descrição.'}</p>
          </div>
          <Field label={item.min !== '' && item.max !== '' ? `Avaliação (${item.min} a ${item.max})` : 'Avaliação'}>
            <input className="input" type="number" min={item.min === '' ? undefined : item.min} max={item.max === '' ? undefined : item.max} value={scores[item.id] ?? ''} disabled={locked} onChange={(event) => setScores({ ...scores, [item.id]: event.target.value })} />
          </Field>
          <span className="stat-hint">{scores[item.id] !== undefined && scores[item.id] !== '' ? 'Preenchido' : 'Pendente'}</span>
        </div>
      ))}
      <Field label="Observações"><textarea className="input" value={notes} disabled={locked} onChange={(event) => setNotes(event.target.value)} /></Field>
      {locked ? (
        <div className="page-actions">
          <button className="btn ghost" onClick={() => setCorrect(true)}>Corrigir avaliação</button>
        </div>
      ) : (
        <div className="page-actions">
          <button className="btn ghost" onClick={() => persist('rascunho')} disabled={!criteria.length}>Salvar rascunho</button>
          <button className="btn" onClick={() => setAsk(true)} disabled={!criteria.length}>Finalizar avaliação</button>
        </div>
      )}
      {ask ? (
        <Modal title="Finalizar avaliação?" subtitle="Revise as informações antes de finalizar a avaliação." onClose={() => setAsk(false)} footer={<><button className="btn ghost" onClick={() => setAsk(false)}>Continuar avaliando</button><button className="btn" onClick={() => persist('concluida')}>Finalizar</button></>}>
          <p>{teamName(team.id)} · {filled} de {criteria.length || '—'} critérios preenchidos</p>
        </Modal>
      ) : null}
      {correct ? (
        <Modal title="Corrigir avaliação" subtitle="A correção administrativa registra o motivo e reabre a avaliação em revisão." onClose={() => setCorrect(false)} footer={<><button className="btn ghost" onClick={() => setCorrect(false)}>Cancelar</button><button className="btn" onClick={applyCorrection}>Salvar</button></>}>
          <Field label="Motivo da correção" required><textarea className="input" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        </Modal>
      ) : null}
    </Page>
  )
}

export function PublicVote() {
  const { state, update, flash } = useHack()
  const [choice, setChoice] = useState(null)
  const [ask, setAsk] = useState(false)
  const voted = localStorage.getItem(VOTE_KEY) === '1'
  const open = state.voting.status === 'Em andamento'

  function confirm() {
    update((draft) => { draft.voting.ballots.push({ teamId: choice, at: new Date().toISOString() }) })
    localStorage.setItem(VOTE_KEY, '1')
    setAsk(false)
    flash('Voto registrado.')
  }

  return (
    <div className="vote-wrap">
        <h1>Escolha sua equipe</h1>
        <p>Selecione a equipe que deseja apoiar na votação do público.</p>
        {state.voting.status === 'Não iniciada' ? <div className="banner warn">A votação ainda não foi iniciada.</div> : null}
        {state.voting.status === 'Encerrada' ? <div className="banner warn">A votação está encerrada.</div> : null}
        {voted ? <div className="banner warn">Voto já registrado</div> : null}
        <div className="vote-board">
          {state.teams.map((team) => {
            const { challenge, company } = teamLabel(state, team)
            const solution = (team.solution || '').trim()
            return (
              <article className="card vote-card" key={team.id}>
                <h3>{teamName(team.id)}</h3>
                <p>Empresa {company?.name || '—'}</p>
                <p>Desafio {challenge?.title || '—'}</p>
                <p>{solution ? solution.slice(0, 110) : '—'}</p>
                <button className="btn" disabled={!open || voted} onClick={() => { setChoice(team.id); setAsk(true) }}>Votar nesta equipe</button>
              </article>
            )
          })}
        </div>
        {ask ? (
          <Modal title="Confirmar voto?" subtitle="O voto fica registrado neste navegador." onClose={() => setAsk(false)} footer={<><button className="btn ghost" onClick={() => setAsk(false)}>Voltar</button><button className="btn" onClick={confirm}>Confirmar voto</button></>}>
            <p><b>Equipe selecionada</b><br />{teamName(choice)}</p>
          </Modal>
        ) : null}
    </div>
  )
}

export function Awards() {
  const { state, update, flash } = useHack()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', team: '', criterion: 'Resultado dos Jurados' })
  const [removing, setRemoving] = useState(null)
  return (
    <Page crumbs="HackLab / Evento / Jurados e Votação / Premiação" title="Premiação" subtitle="Os prêmios oficiais ainda não foram definidos." actions={<button className="btn ghost" onClick={() => go('encerramento?aba=resultados')}>Voltar</button>}>
      {state.awards.length === 0 ? <Empty title="Nenhuma premiação configurada." text="A definir." /> : (
        <div className="grid cols-3">
          {state.awards.map((item) => (
            <article className="card" key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.description || '—'}</p>
              <p>Equipe {item.team || 'A definir'}</p>
              <div className="row-actions">
                <button className="btn ghost small" type="button" onClick={() => { setForm({ description: '', team: '', criterion: 'Resultado dos Jurados', ...item }); setModal(true) }}>Editar</button>
                <button className="btn ghost small" type="button" onClick={() => setRemoving(item)}>Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="page-actions mt"><button className="btn" onClick={() => { setForm({ name: '', description: '', team: '', criterion: 'Resultado dos Jurados' }); setModal(true) }}>Adicionar premiação</button></div>
      {removing ? (
        <Modal title="Excluir premiação?" subtitle="O registro será removido deste navegador." onClose={() => setRemoving(null)} footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={() => { update((draft) => { draft.awards = draft.awards.filter((item) => item.id !== removing.id) }); setRemoving(null); flash('Premiação excluída.') }}>Excluir</button></>}>
          <p>{removing.name}</p>
        </Modal>
      ) : null}
      {modal ? (
        <Modal title={form.id ? 'Editar premiação' : 'Adicionar premiação'} onClose={() => setModal(false)} footer={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn" onClick={() => { if (!form.name.trim()) return flash('Informe o nome.', 'err'); update((draft) => { const index = form.id ? draft.awards.findIndex((item) => item.id === form.id) : -1; if (index >= 0) draft.awards[index] = { ...draft.awards[index], ...form }; else draft.awards.push({ id: uid('pre'), ...form }) }); setModal(false); flash(form.id ? 'Alterações salvas.' : 'Premiação salva.') }}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Descrição"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Relação"><select className="input" value={form.criterion} onChange={(event) => setForm({ ...form, criterion: event.target.value })}><option>Resultado dos Jurados</option><option>Votação do Público</option></select></Field>
          <Field label="Equipe"><select className="input" value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })}><option value="">A definir</option>{state.teams.map((team) => <option key={team.id}>{teamName(team.id)}</option>)}</select></Field>
        </Modal>
      ) : null}
    </Page>
  )
}

function resultCards(state) {
  return state.teams.map((team) => {
    const meta = teamLabel(state, team)
    return { team, ...meta, avg: averageOf(state, team.id), votes: voteCount(state, team.id) }
  })
}

export function Results() {
  const { state, update, flash } = useHack()
  const [ask, setAsk] = useState(false)
  const rows = resultCards(state)
  const technical = rows.filter((item) => item.avg != null)
  const totalVotes = state.voting.ballots.length
  const topVotes = Math.max(0, ...rows.map((item) => item.votes))
  const leaders = rows.filter((item) => item.votes === topVotes && topVotes > 0)
  const admin = state.session?.profile === 'Administrador'
  return (
    <Page
      crumbs="HackLab / Evento / Painel de Resultados"
      title="Painel de Resultados"
      subtitle="Visualize os resultados liberados do Hackathon."
      actions={<><button className="btn ghost" type="button" onClick={() => go('encerramento?aba=resultados')}>Voltar</button><button className={state.resultsReleased ? 'btn' : 'btn ghost'} onClick={() => go('apresentacao')}>Modo Apresentação</button></>}
    >
      <div className="results-stage">
        {!state.resultsReleased ? (
          <div className="results-wait">
            <div className="results-mark" aria-hidden="true"><Icon name="trophy" size={32} /></div>
            <h2>Resultados ainda não divulgados</h2>
            <p>Aguarde a liberação oficial dos resultados.</p>
            {admin ? <button className="btn" onClick={() => setAsk(true)}>Liberar resultados</button> : null}
          </div>
        ) : (
          <>
            <section className="results-block">
              <h2>Resultado dos Jurados</h2>
              <p className="stat-hint">Resultado técnico. Não inclui a votação do público e não aplica uma fórmula final.</p>
              {technical.length === 0 ? <p>Ainda não há resultado técnico registrado.</p> : (
                <div className="grid cols-2">
                  {technical.map((item) => (
                    <article className="card" key={item.team.id}>
                      <h3>{teamName(item.team.id)}</h3>
                      <p>{item.company?.name || '—'} · {item.challenge?.title || '—'}</p>
                      <p>Resultado técnico {item.avg.toFixed(1)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="results-block">
              <h2>Votação do Público</h2>
              {totalVotes === 0 ? <p>Nenhum voto registrado.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Equipe</th><th>Votos</th><th>Percentual</th></tr></thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.team.id}>
                          <td>{teamName(item.team.id)} {leaders.length === 1 && leaders[0].team.id === item.team.id ? <Badge tone="orange">Mais votos</Badge> : null}</td>
                          <td>{item.votes}</td>
                          <td>{Math.round((item.votes / totalVotes) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {ask ? (
        <Modal title="Liberar resultados?" subtitle="O resultado dos jurados e a votação do público serão exibidos em blocos separados, sem soma automática." onClose={() => setAsk(false)} footer={<><button className="btn ghost" onClick={() => setAsk(false)}>Cancelar</button><button className="btn" onClick={() => { update((draft) => { draft.resultsReleased = true }); setAsk(false); flash('Resultados liberados.') }}>Liberar resultados</button></>}>
          <p>O painel público não mostra notas individuais, contatos, ocorrências nem documentos.</p>
        </Modal>
      ) : null}
    </Page>
  )
}

const PRESENT_STEPS = ['abertura', 'jurados', 'publico', 'premiacao', 'fim']

export function Presentation() {
  const { state } = useHack()
  const [step, setStep] = useState(0)
  const rows = resultCards(state)
  const technical = rows.filter((item) => item.avg != null)
  const totalVotes = state.voting.ballots.length
  const current = PRESENT_STEPS[step]

  function goStep(next) {
    setStep(Math.min(PRESENT_STEPS.length - 1, Math.max(0, next)))
  }

  return (
    <div className="present">
      <div className="present-top">
        <Logo />
        <button className="btn ghost present-exit" onClick={() => go('painel')}>Sair do modo apresentação</button>
      </div>
      <div className="present-stage">
        {current === 'abertura' ? (
          <div>
            <h1>Resultados HackLab</h1>
            <p>Apresentação dos resultados do Hackathon.</p>
          </div>
        ) : null}
        {current === 'jurados' ? (
          <div className="present-block">
            <h1>Resultado dos Jurados</h1>
            {!state.resultsReleased ? <p>Resultados ainda não divulgados</p> : technical.length === 0 ? <p>Ainda não há resultado técnico registrado.</p> : (
              <div className="present-cards">
                {technical.map((item) => (
                  <article className="present-card" key={item.team.id}>
                    <h3>{teamName(item.team.id)}</h3>
                    <p>{item.company?.name || '—'} · {item.challenge?.title || '—'}</p>
                    <p>Resultado técnico {item.avg.toFixed(1)}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {current === 'publico' ? (
          <div className="present-block">
            <h1>Resultado da Votação do Público</h1>
            {!state.resultsReleased ? <p>Resultados ainda não divulgados</p> : totalVotes === 0 ? <p>Nenhum voto registrado.</p> : (
              <div className="present-cards">
                {rows.filter((item) => item.votes > 0).map((item) => (
                  <article className="present-card" key={item.team.id}>
                    <h3>{teamName(item.team.id)}</h3>
                    <p>{item.votes} voto(s)</p>
                    <p>{Math.round((item.votes / totalVotes) * 100)}%</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {current === 'premiacao' ? (
          <div className="present-block">
            <h1>Premiação</h1>
            {state.awards.length === 0 ? <p>A definir</p> : (
              <div className="present-cards">
                {state.awards.map((item) => (
                  <article className="present-card" key={item.id}>
                    <h3>{item.name}</h3>
                    <p>{item.team || 'A definir'}</p>
                    <p>{item.description || '—'}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {current === 'fim' ? (
          <div>
            <h1>HackLab</h1>
            <p>Obrigado pela participação!</p>
          </div>
        ) : null}
      </div>
      <div className="present-nav">
        <button className="btn ghost" onClick={() => goStep(step - 1)} disabled={step === 0}>Anterior</button>
        <span>{step + 1} de {PRESENT_STEPS.length}</span>
        <button className="btn" onClick={() => goStep(step + 1)} disabled={step === PRESENT_STEPS.length - 1}>Próximo</button>
      </div>
    </div>
  )
}
