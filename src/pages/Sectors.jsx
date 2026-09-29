import { useState } from 'react'
import { EXPENSE_CATEGORIES, SETORES, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Drawer, Empty, Field, Modal, Page, toneFor } from '../ui'

const COPY = {
  'Recursos Humanos': 'Integrantes da organização, funções, responsáveis, participantes e apoio.',
  Finanças: 'Orçamento, receitas, despesas, saldo, fornecedores e comprovantes.',
  Marketing: 'Campanhas, conteúdos, materiais, canais e cronograma.',
  Tecnologia: 'Equipamentos, infraestrutura, suporte e ocorrências técnicas.',
  Produção: 'Espaços, materiais, estrutura, alimentação e logística.',
}

const SUB = {
  'Recursos Humanos': [
    { id: 'integrantes', label: 'Integrantes' },
    { id: 'funcoes', label: 'Funções' },
    { id: 'responsaveis', label: 'Responsáveis' },
  ],
  Finanças: [
    { id: 'mov', label: 'Movimentações' },
    { id: 'fornecedores', label: 'Fornecedores' },
    { id: 'comprovantes', label: 'Comprovantes' },
  ],
  Marketing: [
    { id: 'campanhas', label: 'Campanhas' },
    { id: 'conteudos', label: 'Conteúdos e Materiais' },
    { id: 'cronograma', label: 'Cronograma' },
  ],
  Tecnologia: [
    { id: 'equipamentos', label: 'Equipamentos' },
    { id: 'infra', label: 'Infraestrutura' },
    { id: 'suporte', label: 'Suporte' },
  ],
  Produção: [
    { id: 'espacos', label: 'Espaços' },
    { id: 'materiais', label: 'Materiais' },
    { id: 'operacao', label: 'Operação' },
  ],
}

const EQUIP_STATUS = ['Disponível', 'Em uso', 'Com problema', 'Em manutenção', 'Indisponível']
const ITEM_STATUS = ['Não iniciado', 'Em andamento', 'Concluído', 'Com problema']

function brl(value) {
  if (value === '' || value == null) return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dash(value) {
  return value ? value : '—'
}

function matches(text, query) {
  return String(text || '').toLowerCase().includes(query.trim().toLowerCase())
}

function Pendencias({ sector }) {
  const { state } = useHack()
  const items = state.tasks.filter((task) => task.sector === sector && task.status !== 'Concluído')
  return (
    <div className="card mt">
      <div className="row-between">
        <h3>Pendências deste setor</h3>
        <button className="btn ghost small" onClick={() => go('gestao?aba=pendencias')}>Ver todas</button>
      </div>
      {items.length === 0 ? <p>Nenhuma pendência registrada para este setor.</p> : items.slice(0, 4).map((task) => (
        <p key={task.id}>{task.title} · <Badge tone={toneFor(task.status)}>{task.status}</Badge></p>
      ))}
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
          {item.hint ? <p className="stat-hint">{item.hint}</p> : null}
        </article>
      ))}
    </div>
  )
}

function sectorPulse(state, name) {
  const open = state.tasks.filter((task) => task.sector === name && task.status !== 'Concluído').length
  if (open) return { label: 'Com pendências', count: open }
  const started = {
    'Recursos Humanos': state.orgMembers.length,
    Finanças: state.incomes.length + state.expenses.length + (state.suppliers || []).length,
    Marketing: state.campaigns.length + (state.contents || []).length,
    Tecnologia: state.equipment.length + (state.infra || []).length + (state.occurrences || []).filter((item) => item.category === 'Suporte').length,
    Produção: state.spaces.length + (state.materials || []).length + (state.operations || []).length,
  }[name]
  return started ? { label: 'Em andamento', count: open } : { label: 'Não iniciado', count: 0 }
}

export default function Sectors({ params }) {
  const { state, update, flash } = useHack()
  const opened = SETORES.includes(params.setor) ? params.setor : ''
  const sector = opened || 'Recursos Humanos'
  const [view, setView] = useState(SUB[sector][0].id)
  const [tracked, setTracked] = useState(sector)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('Todos')
  const [detail, setDetail] = useState(null)
  const [removing, setRemoving] = useState(null)

  if (tracked !== sector) {
    setTracked(sector)
    setView(SUB[sector][0].id)
    setQuery('')
    setStatus('')
    setKind('Todos')
  }

  function selectSector(name) {
    go(`gestao?aba=setores&setor=${encodeURIComponent(name)}`)
  }

  function open(type, seed) {
    setForm(seed)
    setModal(type)
  }

  function save() {
    if ((modal === 'membro' || modal === 'campanha' || modal === 'equip' || modal === 'espaco' || modal === 'chamado' || modal === 'material' || modal === 'fornecedor' || modal === 'conteudo' || modal === 'comprovante' || modal === 'infra' || modal === 'operacao') && !String(form.name || form.title || '').trim()) {
      flash('Informe o nome para salvar.', 'err')
      return
    }
    if (modal === 'mov' && !String(form.description || '').trim()) {
      flash('Informe a descrição da movimentação.', 'err')
      return
    }
    update((draft) => {
      const place = (list, record) => {
        const index = record.id ? list.findIndex((item) => item.id === record.id) : -1
        if (index >= 0) list[index] = { ...list[index], ...record }
        else list.push(record)
      }
      if (modal === 'membro') place(draft.orgMembers, { ...form, id: form.id || uid('org') })
      if (modal === 'mov') {
        if (form.id) {
          draft.incomes = draft.incomes.filter((item) => item.id !== form.id)
          draft.expenses = draft.expenses.filter((item) => item.id !== form.id)
        }
        const id = form.id || uid(form.kind === 'Despesa' ? 'desp' : 'rec')
        if (form.kind === 'Despesa') {
          draft.expenses.push({
            id,
            description: form.description,
            category: form.category,
            supplier: form.supplier,
            responsible: form.responsible,
            planned: form.value === '' ? '' : Number(form.value),
            actual: form.value === '' ? '' : Number(form.value),
            date: form.date,
            status: form.status,
            notes: form.notes,
          })
        } else {
          draft.incomes.push({
            id,
            description: form.description,
            category: form.category,
            origin: form.origin,
            responsible: form.responsible,
            value: form.value === '' ? '' : Number(form.value),
            date: form.date,
            status: form.status,
            notes: form.notes,
          })
        }
      }
      if (modal === 'fornecedor') {
        if (!draft.suppliers) draft.suppliers = []
        place(draft.suppliers, { id: form.id || uid('forn'), name: form.name, category: form.category, contact: form.contact, status: form.status })
      }
      if (modal === 'comprovante') {
        const record = {
          name: form.name,
          category: 'Finanças',
          sector: 'Finanças',
          responsible: form.responsible || '',
          description: form.description || '',
          version: form.version || '1.0',
          note: form.note || 'Comprovante demonstrativo',
          fileName: form.fileName || '',
        }
        const index = form.id ? draft.documents.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.documents[index] = { ...draft.documents[index], ...record }
        else draft.documents.unshift({ ...record, id: uid('doc'), date: new Date().toLocaleDateString('pt-BR'), history: [{ version: '1.0', date: new Date().toLocaleDateString('pt-BR'), responsible: form.responsible || '—', note: 'Comprovante demonstrativo' }] })
      }
      if (modal === 'campanha') place(draft.campaigns, { ...form, id: form.id || uid('camp') })
      if (modal === 'conteudo') {
        if (!draft.contents) draft.contents = []
        place(draft.contents, { id: form.id || uid('cont'), name: form.name, kind: form.kind, channel: form.channel, responsible: form.responsible, date: form.date, status: form.status })
      }
      if (modal === 'equip') place(draft.equipment, { ...form, id: form.id || uid('eq'), qty: Number(form.qty || 1) })
      if (modal === 'chamado') {
        const record = { title: form.title, category: form.category || 'Suporte', description: form.description || '', place: form.place, priority: form.priority, responsible: form.responsible, status: form.status || 'Aberta' }
        const index = form.id ? draft.occurrences.findIndex((item) => item.id === form.id) : -1
        if (index >= 0) draft.occurrences[index] = { ...draft.occurrences[index], ...record }
        else draft.occurrences.unshift({ id: uid('oc'), ...record, solution: '', day: '', at: '' })
      }
      if (modal === 'espaco') place(draft.spaces, { ...form, id: form.id || uid('sp') })
      if (modal === 'material') {
        if (!draft.materials) draft.materials = []
        place(draft.materials, { id: form.id || uid('mat'), name: form.name, needed: form.needed, available: form.available, status: form.status })
      }
      if (modal === 'infra') {
        if (!draft.infra) draft.infra = []
        place(draft.infra, { id: form.id || uid('inf'), name: form.name, status: form.status, responsible: form.responsible || '', notes: form.notes || '' })
      }
      if (modal === 'operacao') {
        if (!draft.operations) draft.operations = []
        place(draft.operations, { id: form.id || uid('op'), name: form.name, description: form.description || '', status: form.status })
      }
    })
    flash(form.id ? 'Alterações salvas.' : 'Registro salvo neste navegador.')
    setModal(null)
  }

  function confirmRemove() {
    if (!removing) return
    update((draft) => {
      if (removing.list === 'mov') {
        draft.incomes = draft.incomes.filter((item) => item.id !== removing.id)
        draft.expenses = draft.expenses.filter((item) => item.id !== removing.id)
        return
      }
      draft[removing.list] = (draft[removing.list] || []).filter((item) => item.id !== removing.id)
    })
    setRemoving(null)
    flash('Registro excluído.')
  }

  function rowActions(view, edit, remove) {
    return (
      <div className="row-actions">
        <button className="btn ghost small" type="button" onClick={view}>Visualizar</button>
        <button className="btn ghost small" type="button" onClick={edit}>Editar</button>
        <button className="btn ghost small" type="button" onClick={remove}>Excluir</button>
      </div>
    )
  }

  const openTasks = state.tasks.filter((task) => task.sector === sector && task.status !== 'Concluído').length
  const knownIncomes = state.incomes.filter((item) => item.value !== '' && item.value != null)
  const knownExpenses = state.expenses.filter((item) => (item.actual !== '' && item.actual != null) || (item.planned !== '' && item.planned != null))
  const incomeTotal = knownIncomes.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const expenseTotal = knownExpenses.reduce((sum, item) => sum + Number(item.actual !== '' && item.actual != null ? item.actual : item.planned || 0), 0)
  const calls = (state.occurrences || []).filter((item) => item.category === 'Suporte')
  const suppliers = state.suppliers || []
  const contents = state.contents || []
  const materials = state.materials || []
  const receipts = state.documents.filter((doc) => doc.category === 'Finanças')

  const primary = {
    integrantes: <button className="btn" onClick={() => open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })}>+ Novo integrante</button>,
    mov: <button className="btn" onClick={() => open('mov', { kind: 'Receita', description: '', category: 'Outros', value: '', date: '', status: 'Pendente', supplier: '', origin: '', responsible: '', notes: '' })}>+ Nova movimentação</button>,
    fornecedores: <button className="btn" onClick={() => open('fornecedor', { name: '', category: 'Outros', contact: '', status: 'Ativo' })}>+ Novo fornecedor</button>,
    comprovantes: <button className="btn" onClick={() => open('comprovante', { name: '', description: '', note: '', fileName: '', responsible: '' })}>+ Adicionar comprovante</button>,
    campanhas: <button className="btn" onClick={() => open('campanha', { name: '', objective: '', audience: '', channel: 'Instagram', responsible: '', date: '', status: 'Não iniciado', description: '' })}>+ Nova campanha</button>,
    conteudos: <button className="btn" onClick={() => open('conteudo', { name: '', kind: 'Conteúdo', channel: 'Instagram', responsible: '', date: '', status: 'Pendente' })}>+ Novo item</button>,
    equipamentos: <button className="btn" onClick={() => open('equip', { name: '', category: 'Notebook', qty: 1, place: '', status: 'Disponível', notes: '' })}>+ Novo equipamento</button>,
    suporte: <button className="btn" onClick={() => open('chamado', { title: '', place: '', priority: 'Média', responsible: '', description: '' })}>+ Novo chamado</button>,
    espacos: <button className="btn" onClick={() => open('espaco', { name: '', type: 'Sala', capacity: '', purpose: '', status: 'Não iniciado', notes: '' })}>+ Novo espaço</button>,
    materiais: <button className="btn" onClick={() => open('material', { name: '', needed: '', available: '', status: 'A definir' })}>+ Novo material</button>,
    funcoes: <button className="btn" onClick={() => open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })}>+ Nova função</button>,
    responsaveis: <button className="btn" onClick={() => open('membro', { name: '', profile: 'Editor', sector: 'Recursos Humanos', func: '', status: 'Ativo', email: '' })}>+ Novo responsável</button>,
    cronograma: <button className="btn" onClick={() => open('campanha', { name: '', objective: '', audience: '', channel: 'Instagram', responsible: '', date: '', status: 'Não iniciado', description: '' })}>+ Nova atividade</button>,
    infra: <button className="btn" onClick={() => open('infra', { name: '', status: 'Não iniciado', responsible: '', notes: '' })}>+ Novo item</button>,
    operacao: <button className="btn" onClick={() => open('operacao', { name: '', description: '', status: 'Não iniciado' })}>+ Novo item</button>,
  }[view] || null

  const members = state.orgMembers.filter((item) => matches(`${item.name} ${item.func} ${item.profile}`, query) && (!status || item.status === status))
  const movements = [
    ...state.incomes.map((item) => ({ ...item, tipo: 'Receita', valor: item.value })),
    ...state.expenses.map((item) => ({ ...item, tipo: 'Despesa', valor: item.actual !== '' && item.actual != null ? item.actual : item.planned })),
  ].filter((item) => matches(item.description, query) && (!status || item.status === status))
  const typed = movements.filter((item) => kind === 'Todos' || (kind === 'Receitas' && item.tipo === 'Receita') || (kind === 'Despesas' && item.tipo === 'Despesa'))

  function sectorCard(name) {
    const pulse = sectorPulse(state, name)
    const lead = state.orgMembers.find((item) => item.sector === name)
    return (
      <article className="card" key={name}>
        <h3>{name}</h3>
        <p><Badge tone={toneFor(pulse.label)}>{pulse.label}</Badge></p>
        <p>Responsável: {lead?.name || '—'}</p>
        <p>Pendências: {pulse.count || '—'}</p>
        <button className="btn small" type="button" onClick={() => selectSector(name)}>Abrir setor</button>
      </article>
    )
  }

  if (!opened) {
    const mine = state.session?.sectors?.length
      ? state.session.sectors
      : state.session?.profile === 'Editor' && state.session.sector
        ? [state.session.sector]
        : []
    const mineSet = new Set(mine.filter((name) => SETORES.includes(name)))
    return (
      <Page title="Setores" subtitle="Escolha um setor para acompanhar o que falta.">
        <p className="stat-hint">Cada setor mostra o status, o responsável e as pendências. Abra um setor para ver o que precisa ser feito.</p>
        {mineSet.size ? <h3 className="ops-title">Meus setores</h3> : null}
        <div className="grid cols-3">
          {(mineSet.size ? SETORES.filter((name) => mineSet.has(name)) : SETORES).map(sectorCard)}
        </div>
        {mineSet.size ? (
          <>
            <h3 className="ops-title">Demais setores</h3>
            <div className="grid cols-3">
              {SETORES.filter((name) => !mineSet.has(name)).map(sectorCard)}
            </div>
          </>
        ) : null}
      </Page>
    )
  }

  return (
    <Page crumbs={`Setores / ${sector}`} title={sector} subtitle={COPY[sector]} actions={<><button className="btn ghost" type="button" onClick={() => go('gestao?aba=setores')}>Voltar</button>{primary}</>}>
      <div className="sector-head">
        <h2>{sector}</h2>
        <p>{COPY[sector]}</p>
      </div>

      {sector === 'Recursos Humanos' ? (
        <Kpis items={[
          { label: 'Integrantes', value: dash(state.orgMembers.length) },
          { label: 'Responsáveis', value: dash(state.orgMembers.filter((item) => item.func).length) },
          { label: 'Participantes', value: dash(state.students.length) },
          { label: 'Pendências', value: dash(openTasks) },
        ]} />
      ) : null}
      {sector === 'Finanças' ? (
        <Kpis items={[
          { label: 'Orçamento previsto', value: state.event?.budget === '' || state.event?.budget == null ? '—' : brl(state.event.budget) },
          { label: 'Receitas', value: knownIncomes.length ? brl(incomeTotal) : '—' },
          { label: 'Despesas', value: knownExpenses.length ? brl(expenseTotal) : '—' },
          { label: 'Saldo', value: knownIncomes.length + knownExpenses.length ? brl(incomeTotal - expenseTotal) : '—' },
        ]} />
      ) : null}
      {sector === 'Marketing' ? (
        <Kpis items={[
          { label: 'Campanhas', value: dash(state.campaigns.length) },
          { label: 'Conteúdos', value: dash(contents.filter((item) => item.kind !== 'Material').length) },
          { label: 'Materiais', value: dash(contents.filter((item) => item.kind === 'Material').length) },
          { label: 'Pendências', value: dash(openTasks) },
        ]} />
      ) : null}
      {sector === 'Tecnologia' ? (
        <Kpis items={[
          { label: 'Equipamentos', value: dash(state.equipment.length) },
          { label: 'Disponíveis', value: dash(state.equipment.filter((item) => item.status === 'Disponível').length) },
          { label: 'Com problema', value: dash(state.equipment.filter((item) => item.status === 'Com problema').length) },
          { label: 'Chamados abertos', value: dash(calls.filter((item) => item.status !== 'Resolvida' && item.status !== 'Concluído').length) },
        ]} />
      ) : null}
      {sector === 'Produção' ? (
        <Kpis items={[
          { label: 'Espaços', value: dash(state.spaces.length) },
          { label: 'Materiais', value: dash(materials.length) },
          { label: 'Pendências', value: dash(openTasks) },
          { label: 'Ocorrências', value: dash((state.occurrences || []).filter((item) => item.category !== 'Suporte').length) },
        ]} />
      ) : null}

      <div className="stack-nav">
        {SUB[sector].map((item) => (
          <button type="button" key={item.id} className={view === item.id ? 'on' : ''} onClick={() => setView(item.id)}>{item.label}</button>
        ))}
      </div>

      {sector === 'Recursos Humanos' && view === 'integrantes' ? (
        <>
          <div className="filters">
            <input className="input" placeholder="Buscar" aria-label="Buscar integrante" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Integrante</th><th>Perfil</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {members.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum integrante cadastrado." /></td></tr> : members.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.profile}</td>
                    <td>{item.func || '—'}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>{rowActions(
                      () => setDetail({ title: item.name, lines: [['Perfil', item.profile], ['Função', item.func || '—'], ['E-mail', item.email || '—'], ['Status', item.status]] }),
                      () => open('membro', { email: '', func: '', ...item }),
                      () => setRemoving({ list: 'orgMembers', id: item.id, name: item.name }),
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {sector === 'Recursos Humanos' && view === 'funcoes' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Função</th><th>Integrante</th><th>Setor</th><th>Ações</th></tr></thead>
            <tbody>
              {state.orgMembers.filter((item) => item.func).length === 0 ? <tr><td colSpan={4}><Empty title="Nenhuma função cadastrada." /></td></tr> : state.orgMembers.filter((item) => item.func).map((item) => (
                <tr key={item.id}>
                  <td>{item.func}</td>
                  <td>{item.name}</td>
                  <td>{item.sector || '—'}</td>
                  <td>{rowActions(
                    () => setDetail({ title: item.func, lines: [['Integrante', item.name], ['Setor', item.sector || '—'], ['Perfil', item.profile], ['Status', item.status]] }),
                    () => open('membro', { email: '', ...item }),
                    () => setRemoving({ list: 'orgMembers', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Recursos Humanos' && view === 'responsaveis' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Função / Área</th><th>Responsável</th><th>Ações</th></tr></thead>
            <tbody>
              {state.orgMembers.filter((item) => item.func).length === 0 ? <tr><td colSpan={3}><Empty title="Nenhum responsável definido." /></td></tr> : state.orgMembers.filter((item) => item.func).map((item) => (
                <tr key={item.id}>
                  <td>{item.func}</td>
                  <td>{item.name}</td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Função', item.func], ['Setor', item.sector || '—'], ['E-mail', item.email || '—'], ['Status', item.status]] }),
                    () => open('membro', { email: '', ...item }),
                    () => setRemoving({ list: 'orgMembers', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Finanças' && view === 'mov' ? (
        <>
          <div className="filters">
            <input className="input" placeholder="Buscar" aria-label="Buscar movimentação" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="input" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              <option>Pendente</option>
              <option>Em andamento</option>
              <option>Concluído</option>
            </select>
            <div className="chips">
              {['Todos', 'Receitas', 'Despesas'].map((item) => (
                <button type="button" key={item} className={`chip ${kind === item ? 'on' : ''}`} onClick={() => setKind(item)}>{item}</button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Distribuição das despesas</h3>
            {knownExpenses.length === 0 ? <p>Ainda não há dados suficientes para gerar esta visualização.</p> : (
              <div className="chips">{EXPENSE_CATEGORIES.map((category) => {
                const total = state.expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.actual || item.planned || 0), 0)
                return total ? <span className="chip" key={category}>{category} · {brl(total)}</span> : null
              })}</div>
            )}
          </div>
          <div className="table-wrap mt">
            <table>
              <thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {typed.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma movimentação financeira cadastrada." /></td></tr> : typed.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.tipo}</td>
                    <td>{item.category || '—'}</td>
                    <td>{brl(item.valor)}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>{rowActions(
                      () => setDetail({ title: item.description, lines: [['Tipo', item.tipo], ['Categoria', item.category || '—'], ['Valor', brl(item.valor)], ['Fornecedor', item.supplier || '—'], ['Data', item.date || '—'], ['Status', item.status]] }),
                      () => open('mov', { supplier: item.supplier || '', origin: item.origin || '', responsible: item.responsible || '', notes: item.notes || '', ...item, kind: item.tipo, value: item.valor === '' || item.valor == null ? '' : item.valor }),
                      () => setRemoving({ list: 'mov', id: item.id, name: item.description }),
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {sector === 'Finanças' && view === 'fornecedores' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fornecedor</th><th>Categoria</th><th>Contato</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {suppliers.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum fornecedor cadastrado." /></td></tr> : suppliers.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.contact || '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Categoria', item.category], ['Contato', item.contact || '—'], ['Status', item.status]] }),
                    () => open('fornecedor', { contact: '', ...item }),
                    () => setRemoving({ list: 'suppliers', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Finanças' && view === 'comprovantes' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Comprovante</th><th>Data</th><th>Arquivo</th><th>Ações</th></tr></thead>
            <tbody>
              {receipts.length === 0 ? <tr><td colSpan={4}><Empty title="Nenhum comprovante armazenado." text="O arquivo continua apenas demonstrativo e também aparece em Documentos." /></td></tr> : receipts.map((item) => (
                <tr key={item.id}><td>{item.name}</td><td>{item.date}</td><td>{item.fileName || 'Upload demonstrativo'}</td><td>{rowActions(
                  () => setDetail({ title: item.name, lines: [['Data', item.date || '—'], ['Arquivo', item.fileName || 'Upload demonstrativo'], ['Descrição', item.description || '—']] }),
                  () => open('comprovante', { description: '', note: '', fileName: '', responsible: '', ...item }),
                  () => setRemoving({ list: 'documents', id: item.id, name: item.name }),
                )}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Marketing' && view === 'campanhas' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Campanha</th><th>Canal</th><th>Responsável</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {state.campaigns.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhuma campanha cadastrada." /></td></tr> : state.campaigns.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.channel}</td>
                  <td>{item.responsible || '—'}</td>
                  <td>{item.date || 'A definir'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Canal', item.channel], ['Objetivo', item.objective || '—'], ['Público', item.audience || '—'], ['Responsável', item.responsible || '—'], ['Data', item.date || 'A definir'], ['Status', item.status]] }),
                    () => open('campanha', { objective: '', audience: '', responsible: '', date: '', description: '', ...item }),
                    () => setRemoving({ list: 'campaigns', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Marketing' && view === 'conteudos' ? (
        <>
          <div className="filters">
            <div className="chips">
              {['Todos', 'Conteúdos', 'Materiais'].map((item) => (
                <button type="button" key={item} className={`chip ${kind === item ? 'on' : ''}`} onClick={() => setKind(item)}>{item}</button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Tipo</th><th>Canal</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {contents.filter((item) => kind === 'Todos' || (kind === 'Conteúdos' && item.kind !== 'Material') || (kind === 'Materiais' && item.kind === 'Material')).length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum conteúdo ou material cadastrado." /></td></tr> : contents.filter((item) => kind === 'Todos' || (kind === 'Conteúdos' && item.kind !== 'Material') || (kind === 'Materiais' && item.kind === 'Material')).map((item) => (
                  <tr key={item.id}><td>{item.name}</td><td>{item.kind}</td><td>{item.channel || '—'}</td><td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td><td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Tipo', item.kind], ['Canal', item.channel || '—'], ['Responsável', item.responsible || '—'], ['Data', item.date || 'A definir'], ['Status', item.status]] }),
                    () => open('conteudo', { responsible: '', date: '', ...item }),
                    () => setRemoving({ list: 'contents', id: item.id, name: item.name }),
                  )}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {sector === 'Marketing' && view === 'cronograma' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Atividade</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {state.campaigns.length + contents.length === 0 ? <tr><td colSpan={4}><Empty title="Nenhuma atividade no cronograma." /></td></tr> : (
                [...state.campaigns.map((item) => ({ ...item, source: 'campanha' })), ...contents.map((item) => ({ ...item, source: 'conteudo' }))]
                  .sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')))
                  .map((item) => (
                    <tr key={`${item.source}-${item.id}`}>
                      <td>{item.date || 'A definir'}</td>
                      <td>{item.name}</td>
                      <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                      <td>{rowActions(
                        () => setDetail({ title: item.name, lines: [['Tipo', item.source === 'campanha' ? 'Campanha' : 'Conteúdo'], ['Data', item.date || 'A definir'], ['Status', item.status], ['Responsável', item.responsible || '—']] }),
                        () => { const { source, ...rest } = item; open(source, rest) },
                        () => setRemoving({ list: item.source === 'campanha' ? 'campaigns' : 'contents', id: item.id, name: item.name }),
                      )}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Tecnologia' && view === 'equipamentos' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Equipamento</th><th>Categoria</th><th>Local</th><th>Qtd.</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {state.equipment.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhum equipamento cadastrado." /></td></tr> : state.equipment.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.place || 'A definir'}</td>
                  <td>{item.qty}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Categoria', item.category], ['Quantidade', item.qty], ['Local', item.place || 'A definir'], ['Status', item.status], ['Observação', item.notes || '—']] }),
                    () => open('equip', { place: '', notes: '', ...item }),
                    () => setRemoving({ list: 'equipment', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Tecnologia' && view === 'infra' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {(state.infra || []).length === 0 ? <tr><td colSpan={4}><Empty title="Nenhum item de infraestrutura cadastrado." /></td></tr> : state.infra.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.responsible || '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Responsável', item.responsible || '—'], ['Status', item.status], ['Observação', item.notes || '—']] }),
                    () => open('infra', { responsible: '', notes: '', ...item }),
                    () => setRemoving({ list: 'infra', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Tecnologia' && view === 'suporte' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Chamado</th><th>Local</th><th>Prioridade</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {calls.length === 0 ? <tr><td colSpan={6}><Empty title="Nenhum chamado registrado." /></td></tr> : calls.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.place || '—'}</td>
                  <td><Badge tone={toneFor(item.priority)}>{item.priority}</Badge></td>
                  <td>{item.responsible || '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.title, lines: [['Local', item.place || '—'], ['Prioridade', item.priority], ['Responsável', item.responsible || '—'], ['Status', item.status], ['Descrição', item.description || '—']] }),
                    () => open('chamado', { place: '', responsible: '', description: '', ...item }),
                    () => setRemoving({ list: 'occurrences', id: item.id, name: item.title }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Produção' && view === 'espacos' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Espaço</th><th>Uso</th><th>Capacidade</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {state.spaces.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum espaço ou material cadastrado." /></td></tr> : state.spaces.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.purpose || item.type}</td>
                  <td>{item.capacity || '—'}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Tipo', item.type], ['Uso', item.purpose || '—'], ['Capacidade', item.capacity || '—'], ['Status', item.status]] }),
                    () => open('espaco', { purpose: '', capacity: '', notes: '', type: item.type || 'Sala', ...item }),
                    () => setRemoving({ list: 'spaces', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Produção' && view === 'materiais' ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Material</th><th>Necessário</th><th>Disponível</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {materials.length === 0 ? <tr><td colSpan={5}><Empty title="Nenhum espaço ou material cadastrado." /></td></tr> : materials.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.needed === '' || item.needed == null ? '—' : item.needed}</td>
                  <td>{item.available === '' || item.available == null ? '—' : item.available}</td>
                  <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                  <td>{rowActions(
                    () => setDetail({ title: item.name, lines: [['Necessário', item.needed || '—'], ['Disponível', item.available || '—'], ['Status', item.status]] }),
                    () => open('material', { needed: '', available: '', ...item }),
                    () => setRemoving({ list: 'materials', id: item.id, name: item.name }),
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sector === 'Produção' && view === 'operacao' ? (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {(state.operations || []).length === 0 ? <tr><td colSpan={4}><Empty title="Nenhum item de operação cadastrado." /></td></tr> : state.operations.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.description || '—'}</td>
                    <td><Badge tone={toneFor(item.status)}>{item.status}</Badge></td>
                    <td>{rowActions(
                      () => setDetail({ title: item.name, lines: [['Descrição', item.description || '—'], ['Status', item.status]] }),
                      () => open('operacao', { description: '', ...item }),
                      () => setRemoving({ list: 'operations', id: item.id, name: item.name }),
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="stat-hint mt">O evento permanece das 08:00 às 12:00. Horários fora desse intervalo aparecem apenas como aviso demonstrativo.</p>
        </>
      ) : null}

      <Pendencias sector={sector} />

      {detail ? (
        <Drawer title={detail.title} onClose={() => setDetail(null)}>
          <dl className="kv">{detail.lines.map(([label, value]) => <span key={label} style={{ display: 'contents' }}><dt>{label}</dt><dd>{value}</dd></span>)}</dl>
        </Drawer>
      ) : null}

      {modal ? (
        <Modal title={(form.id ? { membro: 'Editar integrante', mov: 'Editar movimentação', fornecedor: 'Editar fornecedor', comprovante: 'Editar comprovante', campanha: 'Editar campanha', conteudo: 'Editar item', equip: 'Editar equipamento', chamado: 'Editar chamado', espaco: 'Editar espaço', material: 'Editar material', infra: 'Editar item', operacao: 'Editar item' } : { membro: 'Novo integrante', mov: 'Nova movimentação', fornecedor: 'Novo fornecedor', comprovante: 'Adicionar comprovante', campanha: 'Nova campanha', conteudo: 'Novo item', equip: 'Novo equipamento', chamado: 'Novo chamado', espaco: 'Novo espaço', material: 'Novo material', infra: 'Novo item', operacao: 'Novo item' })[modal]} subtitle="Os dados ficam salvos apenas neste navegador." onClose={() => setModal(null)} footer={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn" onClick={save}>{form.id ? 'Salvar alterações' : 'Salvar'}</button></>}>
          {modal === 'membro' ? (
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Perfil"><select className="input" value={form.profile} onChange={(event) => setForm({ ...form, profile: event.target.value })}><option>Administrador</option><option>Consultor</option><option>Editor</option></select></Field>
              <Field label="Função"><input className="input" value={form.func} onChange={(event) => setForm({ ...form, func: event.target.value })} /></Field>
              <Field label="E-mail"><input className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Ativo</option><option>Inativo</option></select></Field>
            </div>
          ) : null}
          {modal === 'mov' ? (
            <div className="form-grid">
              <div className="field span-2">
                <span>Tipo</span>
                <div className="chips">
                  {['Receita', 'Despesa'].map((item) => <button type="button" key={item} className={`chip ${form.kind === item ? 'on' : ''}`} onClick={() => setForm({ ...form, kind: item })}>{item}</button>)}
                </div>
              </div>
              <Field label="Descrição" required className="span-2"><input className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Valor" hint="Deixe em branco se o valor ainda não for conhecido."><input className="input" type="number" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></Field>
              {form.kind === 'Despesa' ? <Field label="Fornecedor"><input className="input" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} /></Field> : <Field label="Origem"><input className="input" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></Field>}
              <Field label="Data"><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></Field>
            </div>
          ) : null}
          {modal === 'fornecedor' ? (
            <div className="form-grid">
              <Field label="Fornecedor" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Contato"><input className="input" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Ativo</option><option>Inativo</option></select></Field>
            </div>
          ) : null}
          {modal === 'comprovante' ? (
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Descrição" className="span-2"><input className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="Arquivo demonstrativo" className="span-2" hint="Nenhum arquivo é enviado."><input className="input" type="file" onChange={(event) => setForm({ ...form, fileName: event.target.files?.[0]?.name || '' })} /></Field>
            </div>
          ) : null}
          {modal === 'campanha' ? (
            <div className="form-grid">
              <Field label="Campanha" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Canal"><select className="input" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>{['Instagram', 'WhatsApp', 'E-mail', 'Site', 'Cartazes', 'Comunicação interna', 'Outros'].map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
              <Field label="Data"><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Não iniciado</option><option>Em andamento</option><option>Concluído</option></select></Field>
            </div>
          ) : null}
          {modal === 'conteudo' ? (
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <div className="field">
                <span>Tipo</span>
                <div className="chips">{['Conteúdo', 'Material'].map((item) => <button type="button" key={item} className={`chip ${form.kind === item ? 'on' : ''}`} onClick={() => setForm({ ...form, kind: item })}>{item}</button>)}</div>
              </div>
              <Field label="Canal"><input className="input" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></Field>
            </div>
          ) : null}
          {modal === 'equip' ? (
            <div className="form-grid">
              <Field label="Nome" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Computador', 'Notebook', 'Projetor', 'Tela', 'Áudio', 'Vídeo', 'Cabo', 'Extensão', 'Rede', 'Outro'].map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Quantidade"><input className="input" type="number" value={form.qty} onChange={(event) => setForm({ ...form, qty: event.target.value })} /></Field>
              <Field label="Local"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{EQUIP_STATUS.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Observação" className="span-2"><textarea className="input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          ) : null}
          {modal === 'chamado' ? (
            <div className="form-grid">
              <Field label="Chamado" required className="span-2"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Local"><input className="input" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} /></Field>
              <Field label="Responsável"><input className="input" value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
              <div className="field span-2">
                <span>Prioridade</span>
                <div className="chips">{['Baixa', 'Média', 'Alta', 'Urgente'].map((item) => <button type="button" key={item} className={`chip ${form.priority === item ? 'on' : ''}`} onClick={() => setForm({ ...form, priority: item })}>{item}</button>)}</div>
              </div>
              <Field label="Descrição" className="span-2"><textarea className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            </div>
          ) : null}
          {modal === 'espaco' ? (
            <div className="form-grid">
              <Field label="Espaço" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Uso"><input className="input" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></Field>
              <Field label="Capacidade"><input className="input" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Não iniciado</option><option>Em andamento</option><option>Concluído</option></select></Field>
            </div>
          ) : null}
          {modal === 'material' ? (
            <div className="form-grid">
              <Field label="Material" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>A definir</option><option>Em andamento</option><option>Concluído</option></select></Field>
              <Field label="Necessário" hint="Deixe em branco se a quantidade ainda não for conhecida."><input className="input" value={form.needed} onChange={(event) => setForm({ ...form, needed: event.target.value })} /></Field>
              <Field label="Disponível" hint="Deixe em branco se a quantidade ainda não for conhecida."><input className="input" value={form.available} onChange={(event) => setForm({ ...form, available: event.target.value })} /></Field>
            </div>
          ) : null}
          {modal === 'infra' ? (
            <div className="form-grid">
              <Field label="Item" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Responsável"><input className="input" value={form.responsible || ''} onChange={(event) => setForm({ ...form, responsible: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{ITEM_STATUS.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Observação" className="span-2"><textarea className="input" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          ) : null}
          {modal === 'operacao' ? (
            <div className="form-grid">
              <Field label="Item" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Status"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{ITEM_STATUS.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Descrição" className="span-2"><textarea className="input" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {removing ? (
        <Modal title="Excluir registro?" subtitle="O registro será removido deste navegador." onClose={() => setRemoving(null)} footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={confirmRemove}>Excluir</button></>}>
          <p>{removing.name}</p>
        </Modal>
      ) : null}
    </Page>
  )
}
