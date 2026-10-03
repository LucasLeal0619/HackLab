export const KEY = 'hacklab.prototype.v1'

export const TURMAS = [
  { id: 'Breno', label: 'Turma Breno', professor: 'Professor Breno' },
  { id: 'Rafael', label: 'Turma Rafael', professor: 'Professor Rafael' },
  { id: 'Clara', label: 'Turma Clara', professor: 'Professora Clara' },
]

export const AVAILABILITY = ['Disponível', 'Indisponível', 'Desistente']

export const SETORES = ['Recursos Humanos', 'Finanças', 'Marketing', 'Tecnologia', 'Produção']

function money(value) {
  if (value === '' || value == null) return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}

// Visão por exceção de cada setor: um destaque e a situação que pede atenção.
export function sectorSummaries(state) {
  const openFor = (name) => (state.tasks || []).filter((task) => task.sector === name && task.status !== 'Concluído').length
  const pending = (name) => {
    const count = openFor(name)
    return count ? { text: plural(count, 'pendência', 'pendências'), tone: 'warn' } : { text: 'Normal', tone: 'ok' }
  }
  const incomes = (state.incomes || []).filter((item) => item.value !== '' && item.value != null)
  const expenses = (state.expenses || []).filter((item) => (item.actual !== '' && item.actual != null) || (item.planned !== '' && item.planned != null))
  const incomeTotal = incomes.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.actual !== '' && item.actual != null ? item.actual : item.planned || 0), 0)
  const balance = incomes.length + expenses.length ? incomeTotal - expenseTotal : null
  const occurrences = state.occurrences || []
  const open = (item) => item.status !== 'Resolvida' && item.status !== 'Concluído'
  const calls = occurrences.filter((item) => occurrenceSector(item) === 'Tecnologia' && open(item)).length
  const broken = (state.equipment || []).filter((item) => item.status === 'Com problema').length
  const prodOcc = occurrences.filter((item) => occurrenceSector(item) === 'Produção' && open(item)).length
  return [
    {
      name: 'Recursos Humanos',
      icon: 'users',
      highlight: plural(state.orgMembers?.length || 0, 'integrante', 'integrantes'),
      status: pending('Recursos Humanos'),
    },
    {
      name: 'Finanças',
      icon: 'chart',
      highlight: `Saldo ${balance == null ? '—' : money(balance)}`,
      status: balance != null && balance < 0 ? { text: 'Saldo negativo', tone: 'bad' } : pending('Finanças'),
    },
    {
      name: 'Marketing',
      icon: 'star',
      highlight: plural(state.campaigns?.length || 0, 'campanha', 'campanhas'),
      status: pending('Marketing'),
    },
    {
      name: 'Tecnologia',
      icon: 'bolt',
      highlight: broken ? plural(broken, 'com problema', 'com problema') : plural(state.equipment?.length || 0, 'equipamento', 'equipamentos'),
      highlightTone: broken ? 'bad' : '',
      status: calls ? { text: plural(calls, 'ocorrência aberta', 'ocorrências abertas'), tone: 'warn' } : pending('Tecnologia'),
    },
    {
      name: 'Produção',
      icon: 'grid',
      highlight: plural(state.spaces?.length || 0, 'espaço', 'espaços'),
      status: prodOcc ? { text: plural(prodOcc, 'ocorrência', 'ocorrências'), tone: 'warn' } : pending('Produção'),
    },
  ]
}

// Cadastro público: só Jurado (com convite) e Votante criam a própria conta.
export const PUBLIC_PROFILES = ['Votante', 'Jurado']
export const PUBLIC_CATEGORY = { Votante: 'Público', Jurado: 'Jurado' }
export const INVITE_STATUS = ['Não utilizado', 'Utilizado']

export function isExternalProfile(profile) {
  return PUBLIC_PROFILES.includes(profile)
}

export function inviteCode() {
  return `JUR-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')}`
}

export function findInvite(state, code) {
  const wanted = String(code || '').trim().toUpperCase()
  return wanted ? (state.invites || []).find((item) => item.code.toUpperCase() === wanted) || null : null
}

export function currentUser(state) {
  const session = state.session
  if (!session) return null
  return (state.users || []).find((item) => (session.userId && item.id === session.userId) || item.email?.toLowerCase() === session.email) || null
}

// Registro do jurado ligado à conta atual (pelo vínculo da conta ou pelo e-mail).
export function judgeOf(state) {
  const session = state.session
  if (!session) return null
  const user = currentUser(state)
  return (state.judges || []).find((item) => (user && item.userId === user.id) || (item.email && item.email.toLowerCase() === session.email)) || null
}

// Equipes que o jurado avalia: somente a atribuição explícita em judge.assignedTeamIds.
// A empresa do jurado é apenas contexto e não define avaliações. Um jurado pode avaliar
// várias equipes e uma equipe pode ter vários jurados. Sem atribuição, a lista fica vazia.
export function assignedTeams(state) {
  const ids = judgeOf(state)?.assignedTeamIds || []
  return state.teams.filter((team) => ids.includes(team.id))
}

// Ocorrências: fatos ocorridos (diferente de pendência, que é algo a fazer).
export const OCC_CATEGORIES = ['Tecnologia', 'Infraestrutura', 'Produção', 'Participante', 'Equipe', 'Empresa', 'Organização', 'Outro']
export const OCC_PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente']
export const OCC_STATUS = ['Aberta', 'Em atendimento', 'Resolvida']

// Categorias antigas do protótipo continuam legíveis sem migrar o que já está salvo.
const LEGACY_OCC_CATEGORY = { Suporte: 'Tecnologia', Equipamento: 'Tecnologia', Sala: 'Infraestrutura', Estrutura: 'Infraestrutura', Materiais: 'Produção' }
const CATEGORY_SECTOR = { Tecnologia: 'Tecnologia', Infraestrutura: 'Produção', Produção: 'Produção' }

export function occurrenceCategory(item) {
  const category = item?.category || 'Outro'
  return LEGACY_OCC_CATEGORY[category] || category
}

export function occurrenceSector(item) {
  return item?.sector ?? CATEGORY_SECTOR[occurrenceCategory(item)] ?? ''
}

export function occurrenceStatus(item) {
  return OCC_STATUS.includes(item?.status) ? item.status : item?.status === 'Concluído' ? 'Resolvida' : 'Aberta'
}

// Credencial do evento: 1 pessoa = 1 credencial = 1 QR Code, válida nos dias autorizados.
// Categoria da credencial (presença física) é diferente do perfil de acesso ao sistema.
export const CREDENTIAL_CATEGORIES = ['Participante', 'Organização', 'Professor', 'Jurado', 'Público', 'Convidado']
export const CREDENTIAL_STATUS = ['Ativa', 'Bloqueada', 'Cancelada']
export const EVENT_DAYS = [1, 2, 3]

const PROFILE_CATEGORY = {
  SuperAdmin: 'Organização',
  'Gestor de Setor': 'Organização',
  Editor: 'Organização',
  Validador: 'Organização',
  Consultor: 'Professor',
  Jurado: 'Jurado',
  Votante: 'Público',
}

// Sugestão demonstrativa (editável): Jurado e Público costumam vir no Dia 3.
export function suggestedDays(category) {
  return ['Jurado', 'Público'].includes(category) ? [3] : [...EVENT_DAYS]
}

// Pessoas que podem ter credencial: participantes, contas do sistema e convidados sem conta.
export function credentialPeople(state) {
  return [
    ...(state.students || []).map((item) => ({ id: item.id, name: item.name, email: item.email || '', kind: 'Participante cadastrado', category: 'Participante', detail: item.turma ? `Turma ${item.turma}` : '' })),
    ...(state.users || []).map((item) => ({ id: item.id, name: item.name, email: item.email || '', kind: 'Conta do sistema', category: PROFILE_CATEGORY[item.profile] || 'Organização', detail: item.profile })),
    ...(state.guests || []).map((item) => ({ id: item.id, name: item.name, email: item.email || '', kind: 'Pessoa externa (sem conta)', category: item.category || 'Convidado', detail: 'Sem conta no sistema' })),
  ]
}

export function personOf(state, personId) {
  return credentialPeople(state).find((item) => item.id === personId) || null
}

export function credentialOf(state, personId) {
  return (state.credentials || []).find((item) => item.personId === personId) || null
}

export function findCredential(state, code) {
  const wanted = String(code || '').trim().toUpperCase()
  return wanted ? (state.credentials || []).find((item) => item.code === wanted) || null : null
}

function nextCredentialCode(list) {
  const top = list.reduce((max, item) => Math.max(max, Number(String(item.code).replace(/\D/g, '')) || 0), 0)
  return `HL-${String(top + 1).padStart(6, '0')}`
}

// Geração automática (demonstrativa): participantes, contas internas e cadastros públicos
// recebem uma credencial na primeira vez que aparecem. Nunca duplica a mesma pessoa.
export function syncCredentials(draft) {
  if (!Array.isArray(draft.credentials)) draft.credentials = []
  if (!Array.isArray(draft.guests)) draft.guests = []
  const known = new Set(draft.credentials.map((item) => item.personId))
  const today = new Date().toLocaleDateString('pt-BR')
  const add = (personId, category, status = 'Ativa') => {
    if (known.has(personId)) return
    known.add(personId)
    draft.credentials.push({ id: uid('cred'), code: nextCredentialCode(draft.credentials), personId, category, days: suggestedDays(category), status, createdAt: today, note: '' })
  }
  const LEGACY = { Ativo: 'Ativa', Bloqueado: 'Bloqueada', Cancelado: 'Cancelada' }
  for (const item of draft.students || []) add(item.id, 'Participante', LEGACY[item.ticketStatus] || 'Ativa')
  for (const item of draft.users || []) add(item.id, PROFILE_CATEGORY[item.profile] || 'Organização')
  return draft
}

// Exemplos demonstrativos: convidados sem conta e uma credencial bloqueada.
export function seedDemoCredentials(draft) {
  syncCredentials(draft)
  const today = new Date().toLocaleDateString('pt-BR')
  for (const guest of draft.guests || []) {
    if (draft.credentials.some((item) => item.personId === guest.id)) continue
    draft.credentials.push({ id: uid('cred'), code: nextCredentialCode(draft.credentials), personId: guest.id, category: guest.category, days: suggestedDays(guest.category), status: 'Ativa', createdAt: today, note: 'Credencial demonstrativa' })
  }
  const last = (draft.students || [])[draft.students.length - 1]
  const blocked = last && draft.credentials.find((item) => item.personId === last.id)
  if (blocked) blocked.status = 'Bloqueada'
  return draft
}

// Validação da credencial para um dia: status, dia autorizado e duplicidade.
export function checkCredential(state, credential, day) {
  if (!credential) return { kind: 'missing' }
  if (credential.status === 'Bloqueada') return { kind: 'blocked', credential }
  if (credential.status === 'Cancelada') return { kind: 'cancelled', credential }
  if (!(credential.days || []).includes(Number(day))) return { kind: 'day', credential }
  const record = presenceOf(state, credential.personId, day)
  if (record) return { kind: 'already', credential, record }
  return { kind: 'valid', credential }
}

// Presença é por dia e não depende da disponibilidade do cadastro.
export function presenceOf(state, personId, day) {
  return (state.checkins || []).find((item) => item.personId === personId && Number(item.day) === Number(day) && item.status === 'Presente') || null
}

// Dia de referência: o último dia com registro de presença; antes do evento, Dia 1.
export function currentEventDay(state) {
  const days = (state.checkins || []).map((item) => Number(item.day)).filter((day) => [1, 2, 3].includes(day))
  return days.length ? Math.max(...days) : 1
}

// Logins de demonstração. As demais experiências são testadas pelo seletor "Meu perfil".
export const ACCOUNTS = {
  'admin@senac.br': {
    name: 'Usuário Demonstrativo',
    profile: 'SuperAdmin',
    sector: '',
    role: 'Equipe de TI',
  },
  'consultor@senac.br': {
    name: 'Usuário Consultor',
    profile: 'Consultor',
    sector: 'Acompanhamento',
    role: 'Professor / Coordenação',
  },
  'editor@senac.br': {
    name: 'Usuário Editor',
    profile: 'Editor',
    sector: 'Tecnologia',
    role: 'Apoio',
    sectors: ['Tecnologia'],
  },
}

export function teamName(id) {
  return `Equipe ${String(id).padStart(2, '0')}`
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function availabilityOf(student) {
  return student?.availability || 'Disponível'
}

export function isAvailable(student) {
  return availabilityOf(student) === 'Disponível'
}

export function memberCounts(team, students, { onlyAvailable = false } = {}) {
  const counts = { Breno: 0, Rafael: 0, Clara: 0 }
  for (const id of team.members || []) {
    const student = students.find((item) => item.id === id)
    if (!student) continue
    if (onlyAvailable && !isAvailable(student)) continue
    if (counts[student.turma] !== undefined) counts[student.turma] += 1
  }
  return counts
}

export function activeMembers(team, students) {
  return (team?.members || [])
    .map((id) => students.find((item) => item.id === id))
    .filter((student) => student && isAvailable(student))
}

export function pausedMembers(team, students) {
  return (team?.members || [])
    .map((id) => students.find((item) => item.id === id))
    .filter((student) => student && !isAvailable(student))
}

export function reservedIds(teams, exceptId) {
  const ids = new Set()
  for (const team of teams) {
    if (team.id === exceptId) continue
    ;(team.members || []).forEach((id) => ids.add(id))
  }
  return ids
}

export function balanceLabel(team, students, teams) {
  const size = activeMembers(team, students).length
  if (!size) return 'Pode melhorar'
  const sizes = (teams || []).map((item) => activeMembers(item, students).length).filter((value) => value > 0)
  const gap = sizes.length ? Math.max(...sizes) - Math.min(...sizes) : 0
  const counts = memberCounts(team, students, { onlyAvailable: true })
  const biggest = Math.max(counts.Breno, counts.Rafael, counts.Clara)
  const concentrated = size >= 3 && biggest / size > 0.67
  if (gap <= 1 && !concentrated) return 'Equilibrada'
  return 'Pode melhorar'
}

function shuffle(list) {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function lumpySplit(total, parts) {
  const quotas = Array(parts).fill(0)
  if (!total || parts < 1) return quotas
  if (parts === 1) {
    quotas[0] = total
    return quotas
  }
  const share = 0.5 + Math.random() * 0.35
  const lead = Math.min(total, Math.max(1, Math.round(total * share)))
  quotas[Math.floor(Math.random() * parts)] = lead
  let left = total - lead
  while (left > 0) {
    quotas[Math.floor(Math.random() * parts)] += 1
    left -= 1
  }
  return quotas
}

function fitQuotas(quotas, room, limits) {
  const next = quotas.map((qty, index) => Math.min(qty, room[index], limits[index]))
  let leftover = quotas.reduce((sum, qty) => sum + qty, 0) - next.reduce((sum, qty) => sum + qty, 0)
  while (leftover > 0) {
    let options = next.map((qty, index) => index).filter((index) => next[index] < room[index] && next[index] < limits[index])
    if (!options.length) options = next.map((qty, index) => index).filter((index) => next[index] < room[index])
    if (!options.length) break
    options.sort((a, b) => (room[b] - next[b]) - (room[a] - next[a]))
    next[options[0]] += 1
    leftover -= 1
  }
  return next
}

export function suggestTeams(students, size = 6, { vary = false } = {}) {
  const pool = (students || []).filter(isAvailable)
  if (!pool.length) return []
  const target = Math.max(1, Number(size) || 6)
  const count = Math.max(1, Math.round(pool.length / target))
  const base = Math.floor(pool.length / count)
  const extra = pool.length % count
  const capacities = Array.from({ length: count }, () => base)
  const extraSeats = vary ? shuffle([...capacities.keys()]) : [...capacities.keys()]
  for (let index = 0; index < extra; index += 1) capacities[extraSeats[index]] += 1
  const teams = capacities.map((cap, index) => ({
    id: index + 1,
    status: 'confirmada',
    members: [],
    solution: '',
    cap,
  }))
  const classes = vary ? shuffle(TURMAS) : TURMAS
  classes.forEach((turma, offset) => {
    const people = pool.filter((student) => student.turma === turma.id)
    if (!people.length) return
    if (!vary) {
      people.forEach((student, index) => {
        teams[(index + offset) % count].members.push(student.id)
      })
      return
    }
    const ordered = shuffle(people)
    const others = pool.some((student) => student.turma !== turma.id)
    const room = teams.map((team) => team.cap - team.members.length)
    const limits = room.map((seats, index) => {
      const share = Math.max(1, Math.round(ordered.length * 0.7))
      if (!others || teams[index].cap <= 1) return seats
      return Math.min(seats, share, Math.max(1, teams[index].cap - 1))
    })
    const quotas = fitQuotas(lumpySplit(ordered.length, count), room, limits)
    let cursor = 0
    quotas.forEach((qty, teamIndex) => {
      for (let step = 0; step < qty; step += 1) {
        teams[teamIndex].members.push(ordered[cursor].id)
        cursor += 1
      }
    })
  })
  return teams.map(({ cap, ...team }) => team)
}

export function normalizeTeams(list) {
  if (!Array.isArray(list)) return []
  return list.filter((team) => {
    if ((team.members || []).length) return true
    const legacy = team.model === 'A' || team.model === 'B'
    return !(legacy && (!team.status || team.status === 'nao-formada'))
  })
}

// Usuários demonstrativos: ao menos um por perfil de acesso.
export function seedUsers() {
  const user = (id, name, profile, extra = {}) => ({ id, name, email: `${id.replace('usr-', 'usuario')}@exemplo.com`, profile, sector: '', sectors: [], role: '', status: 'Ativo', ...extra })
  return [
    user('usr-1', 'Usuário SuperAdmin', 'SuperAdmin', { role: 'Equipe de TI' }),
    user('usr-2', 'Usuário Consultor', 'Consultor', { sector: 'Acompanhamento', role: 'Professor / Coordenação' }),
    user('usr-3', 'Editor demonstrativo', 'Editor', { sector: 'Tecnologia', sectors: ['Tecnologia'], role: 'Apoio técnico' }),
    user('usr-4', 'Editor demonstrativo 02', 'Editor', { sector: 'Marketing', sectors: ['Marketing'], role: 'Registro audiovisual', status: 'Inativo' }),
    user('usr-5', 'Gestor demonstrativo', 'Gestor de Setor', { sector: 'Marketing', sectors: ['Marketing'], role: 'Líder do setor' }),
    user('usr-6', 'Validador demonstrativo', 'Validador', { role: 'Check-in' }),
    // Cadastros externos (Jurado e Votante) criam a própria conta; estes são exemplos demonstrativos.
    user('usr-7', 'Jurado demonstrativo 01', 'Jurado', { email: 'jurado.demo@exemplo.com', role: 'Representante', companyId: 'emp-1', origin: 'Convite', category: 'Jurado' }),
    user('usr-8', 'Votante demonstrativo', 'Votante', { email: 'votante.demo@exemplo.com', origin: 'Cadastro público', category: 'Público', hasVoted: false }),
  ]
}

export function defaultState() {
  return {
    session: null,
    welcome: null,
    demo: false,
    a11y: { scale: 100, contrast: false, focus: false, motion: false, spacing: 'padrao' },
    event: {
      name: 'HackLab',
      theme: '',
      description: '',
      location: 'A cadastrar',
      date: '',
      days: 3,
      start: '08:00',
      end: '12:00',
      budget: '',
    },
    users: seedUsers(),
    students: [],
    teams: [],
    participantsConfirmed: false,
    teamSize: 6,
    companies: [],
    challenges: [],
    orgMembers: [],
    incomes: [],
    expenses: [],
    suppliers: [],
    campaigns: [],
    contents: [],
    equipment: [],
    infra: [],
    spaces: [],
    materials: [],
    operations: [],
    meetings: [],
    decisions: [],
    tasks: [],
    documents: [],
    checkins: [],
    occurrences: [],
    judges: [],
    invites: [],
    guests: [],
    credentials: [],
    criteria: [],
    evaluations: [],
    awards: [],
    voting: { status: 'Não iniciada', ballots: [] },
    resultsReleased: false,
    audit: [],
  }
}

function makeStudents(counts = { Breno: 8, Rafael: 5, Clara: 7 }) {
  const list = []
  let n = 1
  for (const turma of TURMAS) {
    const total = counts[turma.id] || 0
    for (let i = 0; i < total; i += 1) {
      list.push({
        id: `alu-${n}`,
        name: `Participante ${pad(n)}`,
        turma: turma.id,
        email: `participante${n}@senac.br`,
        matricula: `2026${String(n).padStart(4, '0')}`,
        note: '',
        availability: 'Disponível',
      })
      n += 1
    }
  }
  const sample = list[list.length - 1]
  if (sample) {
    sample.availability = 'Indisponível'
    sample.name = 'Participante demonstrativo indisponível'
    sample.note = 'Exemplo de pessoa cadastrada que não entra na formação.'
  }
  return list
}

export function buildDemo(current) {
  const students = makeStudents()
  const teams = suggestTeams(students, 6)
  if (teams[0]) teams[0].solution = 'Resumo demonstrativo da solução'

  const companies = [
    {
      id: 'emp-1',
      name: 'Empresa demonstrativa 01',
      razao: '',
      cnpj: '',
      segmento: 'Tecnologia',
      phone: '',
      email: 'contato@exemplo.com',
      site: '',
      description: 'Descrição demonstrativa da empresa. O texto real será cadastrado pela organização.',
      tipo: 'Empresa participante',
      status: 'Com desafio',
      reps: [
        { id: 'rep-1', name: 'Representante 01', cargo: 'Gerente de inovação', email: 'contato@exemplo.com', phone: '', principal: true },
        { id: 'rep-2', name: 'Representante 02', cargo: 'Analista', email: 'rep02@exemplo.com', phone: '', principal: false },
      ],
    },
  ]

  const challenges = [
    {
      id: 'des-1',
      companyId: 'emp-1',
      title: 'Desafio demonstrativo 01',
      status: 'Aprovado',
      problem: 'Texto demonstrativo do problema.',
      objective: 'Texto demonstrativo do objetivo do desafio.',
      requirements: 'Requisitos demonstrativos — a definir pela empresa.',
      restrictions: 'Restrições demonstrativas — a definir pela empresa.',
      expected: 'Resultado esperado demonstrativo.',
      teamId: null,
      updatedAt: 'Data demonstrativa',
    },
    {
      id: 'des-2',
      companyId: 'emp-1',
      title: 'Desafio demonstrativo 02',
      status: 'Aprovado',
      problem: 'Texto demonstrativo do problema. O conteúdo real será enviado pela empresa.',
      objective: 'Texto demonstrativo do objetivo do desafio.',
      requirements: 'Requisitos demonstrativos — a definir pela empresa.',
      restrictions: 'Restrições demonstrativas — a definir pela empresa.',
      expected: 'Resultado esperado demonstrativo.',
      teamId: null,
      updatedAt: 'Data demonstrativa',
    },
    {
      id: 'des-3',
      companyId: 'emp-1',
      title: 'Desafio demonstrativo 03',
      status: 'Rascunho',
      problem: 'Rascunho demonstrativo.',
      objective: '',
      requirements: '',
      restrictions: '',
      expected: '',
      teamId: null,
      updatedAt: 'Data demonstrativa',
    },
    {
      id: 'des-4',
      companyId: 'emp-1',
      title: 'Desafio demonstrativo 04',
      status: 'Em análise',
      problem: 'Texto demonstrativo do problema em análise.',
      objective: 'Texto demonstrativo do objetivo do desafio.',
      requirements: 'Requisitos demonstrativos — a definir pela empresa.',
      restrictions: 'Restrições demonstrativas — a definir pela empresa.',
      expected: 'Resultado esperado demonstrativo.',
      teamId: null,
      updatedAt: 'Data demonstrativa',
    },
  ]
  challenges[0].teamId = teams[0]?.id || null
  challenges[0].status = teams[0] ? 'Distribuído' : 'Aprovado'

  return {
    ...current,
    demo: true,
    // Contas externas demonstrativas (Jurado e Votante) sempre presentes nos dados de apresentação.
    users: [...(current.users || []).filter((item) => !['usr-7', 'usr-8'].includes(item.id)), ...seedUsers().filter((item) => ['usr-7', 'usr-8'].includes(item.id))],
    welcome: 'demonstrativo',
    participantsConfirmed: true,
    teamSize: 6,
    students,
    teams,
    companies,
    challenges,
    orgMembers: [
      { id: 'org-1', name: 'Usuário demonstrativo 01', profile: 'SuperAdmin', sector: 'Recursos Humanos', func: 'Coordenação', status: 'Ativo', email: 'contato@exemplo.com', phone: '' },
      { id: 'org-2', name: 'Usuário demonstrativo 02', profile: 'Consultor', sector: 'Finanças', func: 'Financeiro', status: 'Ativo', email: 'fin@exemplo.com', phone: '' },
      { id: 'org-3', name: 'Usuário demonstrativo 03', profile: 'Gestor de Setor', sector: 'Marketing', func: 'Líder do setor', status: 'Ativo', email: 'mkt@exemplo.com', phone: '' },
      { id: 'org-4', name: 'Usuário demonstrativo 04', profile: 'Editor', sector: 'Tecnologia', func: 'Suporte', status: 'Ativo', email: 'tec@exemplo.com', phone: '' },
      { id: 'org-5', name: 'Usuário demonstrativo 05', profile: 'Editor', sector: 'Produção', func: 'Operação', status: 'Ativo', email: 'prod@exemplo.com', phone: '' },
    ],
    incomes: [
      { id: 'rec-1', description: 'Receita demonstrativa 01', category: 'Outros', origin: 'Apoio demonstrativo', responsible: 'Usuário demonstrativo 02', value: 2500, date: '2026-09-10', status: 'Concluído', notes: '' },
      { id: 'rec-2', description: 'Receita demonstrativa 02', category: 'Marketing', origin: 'Patrocínio demonstrativo', responsible: 'Usuário demonstrativo 02', value: 1500, date: '2026-09-18', status: 'Pendente', notes: '' },
    ],
    expenses: [
      { id: 'desp-1', description: 'Despesa demonstrativa 01', category: 'Alimentação', supplier: 'Fornecedor demonstrativo 01', responsible: 'Usuário demonstrativo 02', planned: 800, actual: 800, date: '2026-09-12', status: 'Concluído', notes: '' },
      { id: 'desp-2', description: 'Despesa demonstrativa 02', category: 'Materiais', supplier: 'Fornecedor demonstrativo 02', responsible: 'Usuário demonstrativo 02', planned: 400, actual: 400, date: '2026-09-20', status: 'Em andamento', notes: '' },
    ],
    suppliers: [
      { id: 'forn-1', name: 'Fornecedor demonstrativo 01', category: 'Alimentação', contact: 'contato@exemplo.com', status: 'Ativo' },
      { id: 'forn-2', name: 'Fornecedor demonstrativo 02', category: 'Materiais', contact: 'contato2@exemplo.com', status: 'Ativo' },
    ],
    campaigns: [
      { id: 'camp-1', name: 'Campanha demonstrativa 01', objective: 'Objetivo demonstrativo', audience: 'Participantes', channel: 'Instagram', responsible: 'Usuário demonstrativo 03', date: '2026-09-28', status: 'Em andamento', description: 'Descrição demonstrativa da campanha.' },
      { id: 'camp-2', name: 'Campanha demonstrativa 02', objective: 'Objetivo demonstrativo', audience: 'Empresas', channel: 'WhatsApp', responsible: 'Usuário demonstrativo 03', date: '2026-10-02', status: 'Não iniciado', description: 'Descrição demonstrativa da campanha.' },
    ],
    contents: [
      { id: 'cont-1', name: 'Conteúdo demonstrativo 01', kind: 'Conteúdo', channel: 'Instagram', responsible: 'Usuário demonstrativo 03', date: '2026-09-27', status: 'Em andamento' },
      { id: 'cont-2', name: 'Material demonstrativo 01', kind: 'Material', channel: 'Cartazes', responsible: 'Usuário demonstrativo 03', date: '2026-09-29', status: 'Pendente' },
    ],
    equipment: [
      { id: 'eq-1', name: 'Equipamento demonstrativo 01', category: 'Notebook', qty: 6, place: 'Sala 03', responsible: 'Usuário demonstrativo', status: 'Em uso', notes: '' },
      { id: 'eq-2', name: 'Equipamento demonstrativo 02', category: 'Projetor', qty: 1, place: 'Sala 03', responsible: 'Usuário demonstrativo', status: 'Disponível', notes: '' },
      { id: 'eq-4', name: 'Equipamento demonstrativo 04', category: 'Extensão', qty: 2, place: 'Sala 04', responsible: 'Usuário demonstrativo', status: 'Com problema', notes: 'Problema demonstrativo' },
    ],
    infra: [
      { id: 'inf-1', name: 'Internet', status: 'Concluído', responsible: 'Usuário demonstrativo 04', notes: 'Item demonstrativo de infraestrutura.' },
      { id: 'inf-2', name: 'Rede', status: 'Em andamento', responsible: 'Usuário demonstrativo 04', notes: 'Item demonstrativo de infraestrutura.' },
      { id: 'inf-3', name: 'Energia', status: 'Não iniciado', responsible: 'Usuário demonstrativo 04', notes: 'Item demonstrativo de infraestrutura.' },
      { id: 'inf-4', name: 'Projeção', status: 'Em andamento', responsible: 'Usuário demonstrativo 04', notes: 'Item demonstrativo de infraestrutura.' },
      { id: 'inf-5', name: 'Áudio', status: 'Concluído', responsible: 'Usuário demonstrativo 04', notes: 'Item demonstrativo de infraestrutura.' },
    ],
    spaces: [
      { id: 'sp-1', name: 'Sala 01', type: 'Sala', capacity: '6', purpose: 'Sala de equipe', responsible: 'Usuário demonstrativo', status: 'Em andamento', notes: '' },
      { id: 'sp-3', name: 'Sala 03', type: 'Sala', capacity: '6', purpose: 'Sala de equipe', responsible: 'Usuário demonstrativo', status: 'Em andamento', notes: '' },
      { id: 'sp-4', name: 'Sala 04', type: 'Sala', capacity: '6', purpose: 'Sala de equipe', responsible: 'Usuário demonstrativo', status: 'Com ocorrência', notes: '' },
    ],
    materials: [
      { id: 'mat-1', name: 'Material demonstrativo 01', needed: '20', available: '12', status: 'Em andamento' },
      { id: 'mat-2', name: 'Material demonstrativo 02', needed: '8', available: '8', status: 'Concluído' },
    ],
    operations: [
      { id: 'op-1', name: 'Estrutura', description: 'Montagem e organização física do evento.', status: 'Em andamento' },
      { id: 'op-2', name: 'Alimentação', description: 'Apoio de alimentação da organização.', status: 'Não iniciado' },
      { id: 'op-3', name: 'Logística', description: 'Deslocamento de materiais e pessoas.', status: 'Em andamento' },
    ],
    meetings: [
      {
        id: 'reu-1',
        title: 'Reunião demonstrativa 01',
        type: 'Geral',
        responsible: 'Usuário demonstrativo 01',
        date: '2026-10-03',
        start: '08:00',
        end: '12:00',
        place: 'Local demonstrativo',
        agenda: 'Pauta demonstrativa 01',
        participantIds: ['usr-1', 'usr-2'],
        notes: '',
        status: 'Agendada',
        presence: {},
        ata: null,
      },
      {
        id: 'reu-3',
        title: 'Reunião demonstrativa 03',
        type: 'Consultores',
        responsible: 'Usuário demonstrativo 01',
        date: '2026-09-20',
        start: '08:00',
        end: '10:00',
        place: 'Local demonstrativo',
        agenda: 'Pauta demonstrativa 01\nPauta demonstrativa 02',
        participantIds: ['usr-1', 'usr-2', 'usr-3'],
        notes: '',
        status: 'Aguardando manifestações',
        presence: {},
        ata: {
          number: '04',
          discussed: 'Texto demonstrativo dos assuntos discutidos.',
          decisions: 'Decisão demonstrativa 01 · Decisão demonstrativa 02',
          forwards: 'Encaminhamento demonstrativo 01 — Responsável: Usuário demonstrativo',
          observations: '',
          status: 'Aguardando manifestações',
          manifestations: [
            { userId: 'usr-1', name: 'Usuário demonstrativo 01', type: 'De acordo', note: '', at: 'Data demonstrativa' },
            { userId: 'usr-2', name: 'Usuário demonstrativo 02', type: 'Com observação', note: 'Observação demonstrativa sobre um ponto da ata.', at: 'Data demonstrativa' },
          ],
          versions: [{ version: '1.0', date: 'Data demonstrativa', responsible: 'Usuário demonstrativo 01', change: 'Versão inicial' }],
        },
      },
    ],
    decisions: [
      {
        id: 'dec-1',
        title: 'Decisão demonstrativa 01',
        description: 'Descrição demonstrativa da decisão tomada na reunião.',
        meetingId: 'reu-3',
        responsible: 'Usuário demonstrativo 01',
        status: 'Em andamento',
        sector: 'Tecnologia',
        date: '2026-09-20',
        notes: '',
        forwards: [],
      },
    ],
    tasks: [
      { id: 'pen-1', title: 'Pendência demonstrativa 01', description: 'Descrição demonstrativa da pendência.', sector: 'Recursos Humanos', due: '2026-10-20', responsible: 'Usuário demonstrativo 01', status: 'Pendente', priority: 'Média', notes: '', createdAt: '26/09/2026' },
      { id: 'pen-2', title: 'Pendência demonstrativa 02', description: 'Descrição demonstrativa da pendência.', sector: 'Marketing', due: '2026-10-05', responsible: 'Usuário demonstrativo 03', status: 'Em andamento', priority: 'Alta', notes: '', createdAt: '26/09/2026' },
      { id: 'pen-3', title: 'Pendência demonstrativa 03', description: 'Descrição demonstrativa da pendência.', sector: 'Finanças', due: '2026-09-01', responsible: 'Usuário demonstrativo 02', status: 'Pendente', priority: 'Alta', notes: '', createdAt: '26/09/2026' },
      { id: 'pen-4', title: 'Pendência demonstrativa 04', description: 'Descrição demonstrativa da pendência.', sector: 'Tecnologia', due: '2026-09-15', responsible: 'Usuário demonstrativo 04', status: 'Concluído', priority: 'Baixa', notes: '', createdAt: '26/09/2026' },
      { id: 'pen-5', title: 'Pendência demonstrativa 05', description: 'Descrição demonstrativa da pendência.', sector: 'Produção', due: '2026-10-15', responsible: 'Usuário demonstrativo 05', status: 'Pendente', priority: 'Média', notes: '', createdAt: '26/09/2026' },
    ],
    documents: [
      { id: 'doc-1', name: 'Ata demonstrativa — ATA Nº 04', category: 'Atas', responsible: 'Usuário demonstrativo 01', sector: 'Gestão', description: 'Ata da Reunião demonstrativa 03', version: '1.0', note: 'Versão inicial', date: '26/09/2026', fileName: 'ata-demonstrativa.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 01', note: 'Versão inicial' }] },
      { id: 'doc-2', name: 'Contrato demonstrativo 01', category: 'Contratos', responsible: 'Usuário demonstrativo 02', sector: 'Finanças', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: 'contrato-demonstrativo.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 02', note: 'Versão inicial' }] },
      { id: 'doc-3', name: 'Documento demonstrativo de empresa', category: 'Empresas', responsible: 'Usuário demonstrativo 01', sector: '', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: 'empresa-demonstrativa.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 01', note: 'Versão inicial' }] },
      { id: 'doc-4', name: 'Documento demonstrativo de desafio', category: 'Desafios', responsible: 'Usuário demonstrativo 01', sector: '', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: 'desafio-demonstrativo.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 01', note: 'Versão inicial' }] },
      { id: 'doc-5', name: 'Comprovante demonstrativo 01', category: 'Finanças', responsible: 'Usuário demonstrativo 02', sector: 'Finanças', description: 'Comprovante demonstrativo.', version: '1.0', note: 'Comprovante demonstrativo', date: '26/09/2026', fileName: 'comprovante-demonstrativo.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 02', note: 'Comprovante demonstrativo' }] },
      { id: 'doc-6', name: 'Peça demonstrativa de marketing', category: 'Marketing', responsible: 'Usuário demonstrativo 03', sector: 'Marketing', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: 'marketing-demonstrativo.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 03', note: 'Versão inicial' }] },
      { id: 'doc-7', name: 'Relatório demonstrativo 01', category: 'Relatórios', responsible: 'Usuário demonstrativo 01', sector: 'Gestão', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: '', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 01', note: 'Arquivo ainda não anexado' }] },
      { id: 'doc-8', name: 'Documento demonstrativo 08', category: 'Outros', responsible: 'Usuário demonstrativo 01', sector: '', description: 'Documento demonstrativo.', version: '1.0', note: '', date: '26/09/2026', fileName: 'outros-demonstrativo.pdf', history: [{ version: '1.0', date: '26/09/2026', responsible: 'Usuário demonstrativo 01', note: 'Versão inicial' }] },
    ],
    occurrences: [
      { id: 'oc-1', title: 'Chamado demonstrativo 01', category: 'Tecnologia', sector: 'Tecnologia', team: '', description: 'Descrição demonstrativa do chamado de suporte.', place: 'Sala 03', priority: 'Alta', responsible: 'Usuário demonstrativo 04', status: 'Aberta', solution: '', day: '', at: '' },
      { id: 'oc-4', title: 'Ocorrência demonstrativa 04', category: 'Infraestrutura', sector: 'Produção', team: '', description: 'Descrição demonstrativa da ocorrência na Sala 03.', place: 'Sala 03', priority: 'Urgente', responsible: 'Usuário demonstrativo 05', status: 'Aberta', solution: '', day: 2, at: 'Horário demonstrativo' },
    ],
    judges: [
      {
        id: 'jur-1',
        userId: 'usr-7',
        // Atribuição manual demonstrativa (não deriva da empresa).
        assignedTeamIds: teams.slice(0, 2).map((team) => team.id),
        name: 'Jurado demonstrativo 01',
        companyId: 'emp-1',
        companyName: 'Empresa demonstrativa 01',
        cargo: 'Representante',
        email: 'contato@exemplo.com',
        status: 'Ativo',
      },
    ],
    criteria: [
      { id: 'cri-1', name: 'Critério demonstrativo 01', description: 'Descrição demonstrativa — critério configurado pelo SuperAdmin.', type: 'Nota numérica', min: '0', max: '10', weight: '', order: 1, active: true },
      { id: 'cri-2', name: 'Critério demonstrativo 02', description: 'Descrição demonstrativa — critério configurado pelo SuperAdmin.', type: 'Nota numérica', min: '0', max: '10', weight: '', order: 2, active: true },
      { id: 'cri-3', name: 'Critério demonstrativo 03', description: 'Descrição demonstrativa — critério configurado pelo SuperAdmin.', type: 'Nota numérica', min: '0', max: '10', weight: '', order: 3, active: true },
      { id: 'cri-4', name: 'Critério demonstrativo 04', description: 'Descrição demonstrativa — critério configurado pelo SuperAdmin.', type: 'Nota numérica', min: '0', max: '10', weight: '', order: 4, active: true },
    ],
    checkins: [
      { id: 'ck-1', personId: 'alu-1', personName: 'Participante 01', category: 'Participante', turma: 'Breno', day: 1, method: 'QR Code', time: '08:05', responsible: 'Usuário demonstrativo 01', status: 'Presente', note: '' },
      { id: 'ck-2', personId: 'alu-1', personName: 'Participante 01', category: 'Participante', turma: 'Breno', day: 2, method: 'Manual', time: '08:10', responsible: 'Usuário demonstrativo 01', status: 'Presente', note: '' },
      { id: 'ck-3', personId: 'alu-2', personName: 'Participante 02', category: 'Participante', turma: 'Breno', day: 3, method: 'QR Code', time: '08:12', responsible: 'Usuário demonstrativo 01', status: 'Presente', note: '' },
    ],
    evaluations: teams.map((team, index) => ({
      id: `av-${index + 1}`,
      teamId: team.id,
      judgeName: 'Jurado demonstrativo 01',
      scores: { 'cri-1': 8, 'cri-2': 7, 'cri-3': 9, 'cri-4': 6 + (index % 3) },
      notes: 'Avaliação demonstrativa.',
      status: 'concluida',
      at: '26/09/2026',
    })),
    awards: [
      { id: 'pre-1', name: 'Premiação demonstrativa 01', description: 'Prêmio demonstrativo definido pela organização.', team: teams[0] ? teamName(teams[0].id) : '', criterion: 'Resultado dos Jurados' },
      { id: 'pre-2', name: 'Premiação demonstrativa 02', description: 'Prêmio demonstrativo da votação.', team: teams[1] ? teamName(teams[1].id) : '', criterion: 'Votação do Público' },
    ],
    // Pessoas externas sem conta no sistema (só credencial do evento).
    guests: [
      { id: 'gst-1', name: 'Visitante Demonstrativo 01', email: '', category: 'Convidado' },
      { id: 'gst-2', name: 'Professor Demonstrativo 01', email: 'professor@exemplo.com', category: 'Professor' },
      { id: 'gst-3', name: 'Público Demonstrativo 01', email: '', category: 'Público' },
    ],
    credentials: [],
    // Convite de jurado demonstrativo (não utilizado), para apresentar o cadastro público.
    invites: [
      { id: 'conv-demo', code: 'JUR-DEMO-01', demo: true, repId: 'rep-2', repName: 'Representante 02', companyId: 'emp-1', companyName: 'Empresa demonstrativa 01', email: 'rep02@exemplo.com', status: 'Não utilizado', usedBy: '', createdAt: '26/09/2026' },
    ],
    voting: {
      status: 'Encerrada',
      ballots: teams.flatMap((team) => [
        { teamId: team.id, at: '26/09/2026' },
        { teamId: team.id, at: '26/09/2026' },
      ]),
    },
    resultsReleased: true,
    event: {
      ...current.event,
      name: current.event?.name || 'HackLab',
      theme: 'Tema demonstrativo',
      description: 'Descrição demonstrativa do evento.',
      location: 'Local demonstrativo',
      date: '2026-09-26',
      budget: 8000,
    },
  }
}

export function journeySteps(state) {
  const eventDone = Boolean(state.event?.theme || state.event?.description || state.event?.date)
  const peopleDone = Boolean(state.participantsConfirmed)
  const teamsDone = (state.teams || []).some((team) => activeMembers(team, state.students || []).length > 0)
  const bizDone = (state.companies || []).length > 0 && (state.challenges || []).length > 0
  const opsDone = (state.meetings || []).length > 0 || (state.tasks || []).length > 0
  const liveDone = (state.checkins || []).length > 0
  const endDone = Boolean(state.resultsReleased)
  const flags = [eventDone, peopleDone, teamsDone, bizDone, opsDone, liveDone, endDone]
  let opened = false
  const status = flags.map((done) => {
    if (done) return 'concluida'
    if (!opened) {
      opened = true
      return 'andamento'
    }
    return 'pendente'
  })
  const meta = [
    ['Configurar evento', 'config'],
    ['Cadastrar participantes', 'participantes'],
    ['Formar equipes', 'equipes'],
    ['Empresas e desafios', 'empresas'],
    ['Preparação operacional', 'setores'],
    ['Realizar evento', 'presenca'],
    ['Encerramento', 'jurados'],
  ]
  return meta.map(([label, to], index) => ({ label, to, status: status[index] }))
}

export function companyOf(state, id) {
  return state.companies.find((item) => item.id === id)
}

export function challengeOf(state, id) {
  return state.challenges.find((item) => item.id === id)
}

export function teamChallenge(state, teamId) {
  return state.challenges.find((item) => item.teamId === teamId)
}

export function formatWhen(value) {
  if (!value) return 'A definir'
  return value
}

export const CHALLENGE_FLOW = ['Rascunho', 'Recebido', 'Em análise', 'Aprovado', 'Distribuído', 'Em desenvolvimento', 'Finalizado']

export const EXPENSE_CATEGORIES = ['Alimentação', 'Materiais', 'Brindes', 'Camisas', 'Decoração', 'Transporte', 'Tecnologia', 'Premiação', 'Marketing', 'Outros']
