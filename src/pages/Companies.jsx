import { useState } from 'react'
import { CHALLENGE_FLOW, companyOf, teamName, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Empty, Field, Modal, Page, Tabs, toneFor } from '../ui'

const emptyCompany = {
  name: '', razao: '', cnpj: '', segmento: '', phone: '', email: '', site: '', description: '',
  tipo: 'Empresa participante', status: 'Em cadastro',
  reps: [{ name: '', cargo: '', email: '', phone: '', principal: true }],
}

export function Companies({ params }) {
  const { state, update, flash } = useHack()
  const [tab, setTab] = useState(params.aba === 'desafios' ? 'desafios' : 'empresas')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyCompany)
  const [challenge, setChallenge] = useState(null)
  const [removing, setRemoving] = useState(null)

  function blankCompany() {
    return { ...emptyCompany, reps: [{ name: '', cargo: '', email: '', phone: '', principal: true }] }
  }

  function blankChallenge() {
    return { title: '', companyId: state.companies[0]?.id || '', problem: '', objective: '', requirements: '', restrictions: '', expected: '', note: '' }
  }

  function openCompany(company) {
    setForm(company
      ? { ...blankCompany(), ...company, reps: company.reps?.length ? company.reps.map((rep) => ({ ...rep })) : blankCompany().reps }
      : blankCompany())
    setModal(true)
  }

  function patchRep(partial) {
    const reps = form.reps?.length ? form.reps.map((rep) => ({ ...rep })) : blankCompany().reps
    reps[0] = { ...reps[0], ...partial }
    setForm({ ...form, reps })
  }

  function saveCompany(event) {
    event.preventDefault()
    const rep = form.reps[0]
    if (!form.name.trim() || !rep?.name.trim()) {
      flash('Informe o nome da empresa e o representante principal.', 'err')
      return
    }
    const reps = form.reps.filter((item) => item.name.trim()).map((item, index) => ({ ...item, id: item.id || uid('rep'), principal: index === 0 }))
    update((draft) => {
      if (form.id) {
        const index = draft.companies.findIndex((item) => item.id === form.id)
        if (index >= 0) draft.companies[index] = { ...draft.companies[index], ...form, name: form.name.trim(), reps }
      } else {
        draft.companies.push({ ...form, id: uid('emp'), name: form.name.trim(), reps })
      }
    })
    setModal(false)
    setForm(blankCompany())
    flash(form.id ? 'Empresa atualizada.' : 'Empresa cadastrada.')
  }

  function saveChallenge(event) {
    event.preventDefault()
    if (!challenge.title.trim() || !challenge.companyId) {
      flash('Informe o título e a empresa.', 'err')
      return
    }
    update((draft) => {
      if (challenge.id) {
        const index = draft.challenges.findIndex((item) => item.id === challenge.id)
        if (index >= 0) {
          draft.challenges[index] = { ...draft.challenges[index], ...challenge, title: challenge.title.trim(), updatedAt: new Date().toLocaleString('pt-BR') }
        }
      } else {
        draft.challenges.push({ ...challenge, id: uid('des'), title: challenge.title.trim(), status: 'Recebido', teamId: null, updatedAt: new Date().toLocaleString('pt-BR') })
        const company = draft.companies.find((item) => item.id === challenge.companyId)
        if (company && company.status === 'Em cadastro') company.status = 'Aguardando desafio'
      }
    })
    setChallenge(null)
    flash(challenge.id ? 'Desafio atualizado.' : 'Desafio recebido.')
  }

  function confirmRemove() {
    if (!removing) return
    update((draft) => {
      if (removing.kind === 'empresa') {
        draft.companies = draft.companies.filter((item) => item.id !== removing.id)
        draft.challenges = draft.challenges.filter((item) => item.companyId !== removing.id)
        draft.judges = (draft.judges || []).filter((item) => item.companyId !== removing.id)
      } else {
        const current = draft.challenges.find((item) => item.id === removing.id)
        draft.challenges = draft.challenges.filter((item) => item.id !== removing.id)
        const owner = current && draft.companies.find((item) => item.id === current.companyId)
        if (owner && owner.status === 'Com desafio' && !draft.challenges.some((item) => item.companyId === owner.id)) owner.status = 'Aguardando desafio'
      }
    })
    setRemoving(null)
    flash(removing.kind === 'empresa' ? 'Empresa excluída.' : 'Desafio excluído.')
  }

  const companies = state.companies.filter((company) => company.name.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos' || company.status === status))
  const challenges = state.challenges.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos' || item.status === status))

  return (
    <Page
      crumbs={tab === 'empresas' ? 'HackLab / Organização / Empresas e Desafios / Empresas' : 'HackLab / Organização / Empresas e Desafios / Desafios'}
      title="Empresas e Desafios"
      subtitle="Gerencie as empresas participantes e os desafios propostos para o Hackathon."
      actions={tab === 'empresas'
        ? <button className="btn" onClick={() => openCompany()}>+ Cadastrar empresa</button>
        : <button className="btn" onClick={() => setChallenge(blankChallenge())}>+ Cadastrar desafio</button>}
    >
      <Tabs tabs={[{ id: 'empresas', label: 'Empresas' }, { id: 'desafios', label: 'Desafios' }]} value={tab} onChange={(value) => { setTab(value); setStatus('Todos'); setQuery(''); go(value === 'desafios' ? 'preparacao?aba=empresas&inner=desafios' : 'preparacao?aba=empresas') }} />
      {tab === 'empresas' ? (
        <>
          <div className="grid cols-3">
            <article className="card stat"><div className="stat-label">Empresas cadastradas</div><div className="stat-value">{state.companies.length || '—'}</div></article>
            <article className="card stat"><div className="stat-label">Representantes</div><div className="stat-value">{state.companies.reduce((sum, company) => sum + company.reps.length, 0) || '—'}</div></article>
            <article className="card stat"><div className="stat-label">Com desafios</div><div className="stat-value">{state.companies.filter((company) => state.challenges.some((item) => item.companyId === company.id)).length || '—'}</div></article>
          </div>
          <div className="filters mt">
            <input className="input" placeholder="Buscar empresa" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              {['Todos', 'Em cadastro', 'Confirmada', 'Aguardando desafio', 'Com desafio', 'Inativa'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Empresa</th><th>Representante</th><th>Desafios</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {state.companies.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhuma empresa cadastrada" text="Cadastre uma empresa para registrar o representante e os desafios." action={<button className="btn" onClick={() => openCompany()}>+ Cadastrar empresa</button>} /></td></tr> : companies.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhuma empresa encontrada" text="Ajuste a busca ou o filtro de status." /></td></tr> : companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.reps.find((rep) => rep.principal)?.name || company.reps[0]?.name || '—'}</td>
                    <td>{state.challenges.filter((item) => item.companyId === company.id).length || '—'}</td>
                    <td><Badge tone={toneFor(company.status)}>{company.status}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn ghost small" onClick={() => go(`empresa?id=${company.id}`)}>Visualizar</button>
                        <button className="btn ghost small" onClick={() => openCompany(company)}>Editar</button>
                        <button className="btn ghost small" onClick={() => setRemoving({ kind: 'empresa', id: company.id, name: company.name, challenges: state.challenges.filter((item) => item.companyId === company.id).length })}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="grid cols-4">
            {[
              ['Cadastrados', state.challenges.length],
              ['Em análise', state.challenges.filter((item) => item.status === 'Em análise').length],
              ['Aprovados', state.challenges.filter((item) => item.status === 'Aprovado').length],
              ['Distribuídos', state.challenges.filter((item) => item.status === 'Distribuído').length],
            ].map(([label, count]) => (
              <article className="card stat" key={label}><div className="stat-label">{label}</div><div className="stat-value">{count || '—'}</div></article>
            ))}
          </div>
          <div className="filters mt">
            <input className="input" placeholder="Buscar desafio" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              {['Todos', ...CHALLENGE_FLOW].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Desafio</th><th>Empresa</th><th>Equipe</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {state.challenges.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum desafio cadastrado" text="Cadastre um desafio proposto por uma empresa." action={<button className="btn" onClick={() => setChallenge(blankChallenge())}>+ Cadastrar desafio</button>} /></td></tr> : challenges.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum desafio encontrado" text="Ajuste a busca ou o filtro de status." /></td></tr> : challenges.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{companyOf(state, item.companyId)?.name || '—'}</td>
                    <td>{item.teamId ? teamName(item.teamId) : '—'}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn ghost small" onClick={() => go(`desafio?id=${item.id}`)}>Visualizar</button>
                        <button className="btn ghost small" onClick={() => setChallenge({ ...item, note: item.note || '' })}>Editar</button>
                        <button className="btn ghost small" onClick={() => setRemoving({ kind: 'desafio', id: item.id, name: item.title })}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="stat-hint">Recebido → Em análise → Aprovado → Distribuído → Em desenvolvimento → Finalizado. <button className="linkish" onClick={() => go('distribuicao')}>Ver distribuição</button></p>
        </>
      )}

      {modal ? (
        <Modal wide title={form.id ? 'Editar empresa' : 'Cadastrar empresa'} subtitle="Empresa, representante e participação." onClose={() => setModal(false)} footer={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn" onClick={saveCompany}>{form.id ? 'Salvar alterações' : 'Cadastrar empresa'}</button></>}>
          <h3>Empresa</h3>
          <div className="form-grid">
            <Field label="Nome da empresa" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Segmento"><input className="input" value={form.segmento} onChange={(event) => setForm({ ...form, segmento: event.target.value })} /></Field>
            <Field label="Descrição" className="span-2"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          </div>
          <h3>Representante</h3>
          <div className="form-grid">
            <Field label="Nome" required><input className="input" value={form.reps[0].name} onChange={(event) => patchRep({ name: event.target.value })} /></Field>
            <Field label="Cargo"><input className="input" value={form.reps[0].cargo} onChange={(event) => patchRep({ cargo: event.target.value })} /></Field>
            <Field label="E-mail" hint="Opcional"><input className="input" value={form.reps[0].email} onChange={(event) => patchRep({ email: event.target.value })} /></Field>
          </div>
          <h3>Participação</h3>
          <Field label="Tipo de participação">
            <select className="input" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
              {['Empresa participante', 'Parceira', 'Patrocinadora', 'Apoio', 'Outro'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </Modal>
      ) : null}

      {challenge ? (
        <Modal wide title={challenge.id ? 'Editar desafio' : 'Cadastrar desafio'} onClose={() => setChallenge(null)} footer={<><button className="btn ghost" onClick={() => setChallenge(null)}>Cancelar</button><button className="btn" onClick={saveChallenge}>{challenge.id ? 'Salvar alterações' : 'Salvar desafio'}</button></>}>
          <h3>Informações principais</h3>
          <Field label="Título" required><input className="input" value={challenge.title} onChange={(event) => setChallenge({ ...challenge, title: event.target.value })} /></Field>
          <Field label="Empresa" required>
            <select className="input" value={challenge.companyId} onChange={(event) => setChallenge({ ...challenge, companyId: event.target.value })}>
              <option value="">Selecione</option>
              {state.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </Field>
          <Field label="Problema"><textarea className="input" value={challenge.problem} onChange={(event) => setChallenge({ ...challenge, problem: event.target.value })} /></Field>
          <Field label="Objetivo"><textarea className="input" value={challenge.objective} onChange={(event) => setChallenge({ ...challenge, objective: event.target.value })} /></Field>
          <h3>Detalhamento</h3>
          <Field label="Requisitos"><textarea className="input" value={challenge.requirements} onChange={(event) => setChallenge({ ...challenge, requirements: event.target.value })} /></Field>
          <Field label="Restrições"><textarea className="input" value={challenge.restrictions} onChange={(event) => setChallenge({ ...challenge, restrictions: event.target.value })} /></Field>
          <Field label="Resultado esperado"><textarea className="input" value={challenge.expected} onChange={(event) => setChallenge({ ...challenge, expected: event.target.value })} /></Field>
          <Field label="Observações"><textarea className="input" value={challenge.note || ''} onChange={(event) => setChallenge({ ...challenge, note: event.target.value })} /></Field>
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          title={removing.kind === 'empresa' ? 'Excluir empresa?' : 'Excluir desafio?'}
          subtitle={removing.kind === 'empresa' && removing.challenges ? 'Os desafios desta empresa também serão removidos deste navegador.' : 'O cadastro será removido deste navegador.'}
          onClose={() => setRemoving(null)}
          footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={confirmRemove}>Excluir</button></>}
        >
          <p>{removing.name}</p>
        </Modal>
      ) : null}
    </Page>
  )
}

export function CompanyDetail({ params }) {
  const { state } = useHack()
  const company = state.companies.find((item) => item.id === params.id) || state.companies[0]
  const [tab, setTab] = useState('geral')
  if (!company) {
    return <Page title="Empresa"><Empty title="Nenhuma empresa." text="Cadastre uma empresa para ver os detalhes." action={<button className="btn" onClick={() => go('empresas')}>Voltar</button>} /></Page>
  }
  const challenges = state.challenges.filter((item) => item.companyId === company.id)
  return (
    <Page crumbs={`HackLab / Organização / Empresas e Desafios / ${company.name}`} title={company.name} subtitle="Detalhes da empresa · dados deste protótipo." actions={<><button className="btn ghost" type="button" onClick={() => go('preparacao?aba=empresas')}>Voltar</button><Badge tone={toneFor(company.status)}>{company.status}</Badge><button className="btn ghost" onClick={() => go('empresas?aba=desafios')}>Adicionar desafio</button></>}>
      <Tabs tabs={[{ id: 'geral', label: 'Visão geral' }, { id: 'reps', label: 'Representantes' }, { id: 'desafios', label: 'Desafios' }, { id: 'docs', label: 'Documentos' }]} value={tab} onChange={setTab} />
      {tab === 'geral' ? (
        <div className="card">
          <div className="grid cols-2">
            <p><b>Segmento</b><br />{company.segmento || '—'}</p>
            <p><b>Participação</b><br />{company.tipo || '—'}</p>
            <p><b>E-mail</b><br />{company.email || '—'}</p>
            <p><b>Telefone</b><br />{company.phone || '—'}</p>
          </div>
          <p>{company.description || 'Sem descrição.'}</p>
        </div>
      ) : null}
      {tab === 'reps' ? <div className="card">{company.reps.map((rep) => <p key={rep.id}>{rep.name} · {rep.cargo} {rep.principal ? '· Principal' : ''}<br /><small>{rep.email}</small></p>)}<p className="stat-hint">Representantes são pessoas ligadas à empresa, não a própria empresa.</p></div> : null}
      {tab === 'desafios' ? <div className="card">{challenges.map((item) => <p key={item.id}><button className="linkish" onClick={() => go(`desafio?id=${item.id}`)}>{item.title}</button> · {item.status}</p>)}{challenges.length === 0 ? <p>Nenhum desafio.</p> : null}</div> : null}
      {tab === 'docs' ? <div className="card"><p>Nenhum documento anexado a esta empresa. O upload deste protótipo é apenas visual.</p></div> : null}
    </Page>
  )
}

export function ChallengeDetail({ params }) {
  const { state, update, flash } = useHack()
  const challenge = state.challenges.find((item) => item.id === params.id) || state.challenges[0]
  const [ask, setAsk] = useState(false)
  const [note, setNote] = useState('')
  const [approve, setApprove] = useState(false)
  const [assign, setAssign] = useState(false)
  const [teamId, setTeamId] = useState(1)
  if (!challenge) return <Page title="Desafio"><Empty title="Nenhum desafio." text="Cadastre um desafio para abrir esta tela." /></Page>
  const company = companyOf(state, challenge.companyId)

  function setStatus(status, extra = {}) {
    update((draft) => {
      const current = draft.challenges.find((item) => item.id === challenge.id)
      Object.assign(current, extra, { status, updatedAt: new Date().toLocaleString('pt-BR') })
      if (status === 'Aprovado' || status === 'Distribuído') {
        const owner = draft.companies.find((item) => item.id === current.companyId)
        if (owner) owner.status = 'Com desafio'
      }
    })
  }

  return (
    <Page crumbs={`HackLab / Organização / Empresas e Desafios / ${challenge.title}`} title="Detalhes do Desafio" subtitle={`${challenge.title} · ${company?.name || 'Empresa'}`} actions={
      <>
        <button className="btn ghost" type="button" onClick={() => go('preparacao?aba=empresas&inner=desafios')}>Voltar</button>
        {challenge.status === 'Em análise'
          ? <><button className="btn ghost" onClick={() => setAsk(true)}>Solicitar ajustes</button><button className="btn" onClick={() => setApprove(true)}>Aprovar</button></>
          : challenge.status === 'Aprovado' || challenge.status === 'Distribuído'
            ? <button className="btn" onClick={() => setAssign(true)}>Associar equipe</button>
            : <button className="btn ghost" onClick={() => { setStatus('Em análise'); flash('Desafio em análise.') }}>Iniciar análise</button>}
      </>
    }>
      <p className="flow-line">Recebido → Em análise → Aprovado → Distribuído → Em desenvolvimento → Finalizado</p>
      <p>Status atual: <Badge tone={toneFor(challenge.status)}>{challenge.status}</Badge></p>
      <div className="grid cols-2">
        <article className="card">
          <p><b>Empresa</b> {company?.name} {company ? <button className="linkish" onClick={() => go(`empresa?id=${company.id}`)}>Ver empresa</button> : null}</p>
          <p><b>Problema</b><br />{challenge.problem || '—'}</p>
          <p><b>Objetivo</b><br />{challenge.objective || '—'}</p>
          <p><b>Requisitos</b><br />{challenge.requirements || '—'}</p>
          <p><b>Restrições</b><br />{challenge.restrictions || '—'}</p>
          <p><b>Resultado esperado</b><br />{challenge.expected || '—'}</p>
        </article>
        <article className="card">
          <h3>Equipe responsável</h3>
          <p>{challenge.teamId ? teamName(challenge.teamId) : 'Este desafio ainda não foi distribuído.'}</p>
          <h3>Solução da equipe</h3>
          <p>{challenge.teamId ? (state.teams.find((team) => team.id === challenge.teamId)?.solution || 'Será preenchido durante o evento.') : 'Solução ainda não iniciada.'}</p>
          {challenge.status === 'Em análise' ? <p className="stat-hint">Aprove o desafio para liberar a associação a uma equipe.</p> : null}
        </article>
      </div>
      {ask ? (
        <Modal title="Solicitar ajustes" subtitle="Registre o que precisa ser ajustado. Nenhuma mensagem é enviada neste protótipo." onClose={() => setAsk(false)} footer={<><button className="btn ghost" onClick={() => setAsk(false)}>Cancelar</button><button className="btn" onClick={() => { setStatus('Em análise', { note }); setAsk(false); flash('Solicitação registrada.') }}>Registrar solicitação</button></>}>
          <Field label="Observação"><textarea className="input" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        </Modal>
      ) : null}
      {approve ? (
        <Modal title="Aprovar desafio?" subtitle="Após a aprovação, o desafio poderá ser associado a uma equipe." onClose={() => setApprove(false)} footer={<><button className="btn ghost" onClick={() => setApprove(false)}>Cancelar</button><button className="btn" onClick={() => { setStatus('Aprovado'); setApprove(false); flash('Desafio aprovado.') }}>Aprovar</button></>}>
          <p>{challenge.title}<br />{company?.name}<br />Novo status: Aprovado</p>
        </Modal>
      ) : null}
      {assign ? (
        <Modal title="Associar equipe" subtitle="Confirme a equipe que receberá este desafio." onClose={() => setAssign(false)} footer={<><button className="btn ghost" onClick={() => setAssign(false)}>Cancelar</button><button className="btn" onClick={() => { setStatus('Distribuído', { teamId: Number(teamId) }); setAssign(false); flash(`Desafio associado à ${teamName(teamId)}.`) }}>Confirmar associação</button></>}>
          <p><b>Desafio</b> {challenge.title}</p>
          <p><b>Empresa</b> {company?.name || '—'}</p>
          <Field label="Equipe selecionada">
            <select className="input" value={teamId} onChange={(event) => setTeamId(Number(event.target.value))}>
              {state.teams.map((team) => <option key={team.id} value={team.id}>{teamName(team.id)} · {team.status === 'confirmada' ? 'Confirmada' : 'Em formação'}</option>)}
            </select>
          </Field>
        </Modal>
      ) : null}
    </Page>
  )
}

export function Distribution() {
  const { state } = useHack()
  return (
    <Page crumbs="HackLab / Organização / Empresas e Desafios / Distribuição" title="Distribuição dos Desafios" subtitle="Visão do Dia 1 · relação entre equipes, empresas e desafios. No Dia 1 as soluções ainda não são exibidas." actions={<button className="btn ghost" onClick={() => go('empresas?aba=desafios')}>Voltar</button>}>
      <div className="grid cols-2">
        {state.teams.map((team) => {
          const challenge = state.challenges.find((item) => item.teamId === team.id)
          const company = challenge ? companyOf(state, challenge.companyId) : null
          return (
            <article className="card" key={team.id}>
              <h3>{teamName(team.id)}</h3>
              <p>Empresa: {company?.name || '—'}</p>
              <p>Desafio: {challenge?.title || '—'}</p>
              <Badge tone={toneFor(challenge ? challenge.status : 'Aguardando')}>{challenge ? challenge.status : 'Sem desafio'}</Badge>
              <p className="stat-hint">{challenge?.status === 'Em desenvolvimento' ? team.solution || 'Solução em andamento.' : 'Solução ainda não iniciada.'}</p>
            </article>
          )
        })}
      </div>
    </Page>
  )
}
