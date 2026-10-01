import { SETORES } from './model'

// Perfis de acesso do protótipo: navegação, página inicial e rotas visíveis de cada experiência.
// ProfileSwitcher (menu "Meu perfil") é apenas uma ferramenta de simulação do protótipo.
// Posteriormente será substituído por autenticação e autorização reais.
// Ocultar páginas no front-end não é segurança; aqui só organiza a experiência visual.

const ITEMS = {
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  preparacao: {
    id: 'preparacao',
    label: 'Preparação',
    icon: 'sliders',
    children: [
      { id: 'config', label: 'Evento' },
      { id: 'participantes', label: 'Participantes' },
      { id: 'equipes', label: 'Equipes' },
      { id: 'empresas', label: 'Empresas' },
      { id: 'desafios', label: 'Desafios' },
    ],
  },
  gestao: {
    id: 'gestao',
    label: 'Gestão',
    icon: 'grid',
    children: [
      { id: 'setores', label: 'Setores' },
      { id: 'reunioes', label: 'Reuniões' },
      { id: 'pendencias', label: 'Pendências' },
      { id: 'ocorrencias', label: 'Ocorrências' },
      { id: 'documentos', label: 'Documentos' },
    ],
  },
  presenca: { id: 'presenca', label: 'Ingressos e Presença', icon: 'ticket' },
  encerramento: {
    id: 'encerramento',
    label: 'Encerramento',
    icon: 'star',
    children: [
      { id: 'jurados', label: 'Jurados' },
      { id: 'avaliacoes', label: 'Avaliações' },
      { id: 'votacao-gestao', label: 'Votação' },
      { id: 'resultados', label: 'Resultados' },
    ],
  },
  relatorios: { id: 'relatorios', label: 'Relatórios', icon: 'chart' },
  usuarios: { id: 'usuarios', label: 'Usuários e Permissões', icon: 'users' },
}

// Item com apenas alguns submenus.
function only(item, ids) {
  return { ...item, children: item.children.filter((child) => ids.includes(child.id)) }
}

// Páginas de detalhe que pertencem a cada destino da navegação.
const LEAF = {
  dashboard: ['inicio', 'dashboard'],
  config: ['config'],
  participantes: ['participantes'],
  equipes: ['equipes', 'montar', 'roletas'],
  empresas: ['empresas', 'empresa'],
  desafios: ['desafios', 'desafio', 'distribuicao'],
  setores: ['setores'],
  reunioes: ['reunioes', 'reuniao', 'manifestacao'],
  pendencias: ['pendencias'],
  ocorrencias: ['ocorrencias'],
  documentos: ['documentos'],
  presenca: ['presenca'],
  jurados: ['jurados', 'criterios'],
  avaliacoes: ['avaliacoes'],
  'votacao-gestao': ['votacao-gestao'],
  resultados: ['resultados', 'premiacao', 'painel'],
  usuarios: ['usuarios'],
  relatorios: ['relatorios', 'relatorio'],
}

export const ACCESS_PROFILES = {
  Administrador: {
    key: 'admin',
    represents: 'Equipe de TI / administração do HackLab',
    home: 'dashboard',
    layout: 'admin',
    adminTools: true,
    nav: [
      { group: 'Dashboard', items: [ITEMS.dashboard] },
      { group: 'Organização', items: [ITEMS.preparacao, ITEMS.gestao] },
      { group: 'Evento', items: [ITEMS.presenca, ITEMS.encerramento] },
      { group: 'Análise', items: [ITEMS.relatorios] },
      { group: 'Administração', items: [ITEMS.usuarios] },
    ],
    // Experiências focadas que o Administrador pode abrir a partir da gestão.
    extra: ['area-jurado', 'avaliar', 'votacao', 'apresentacao'],
  },
  Consultor: {
    key: 'consultant',
    represents: 'Professores: acompanhamento, consulta e orientação',
    home: 'dashboard',
    layout: 'admin',
    nav: [
      { group: 'Dashboard', items: [ITEMS.dashboard] },
      { group: 'Organização', items: [only(ITEMS.preparacao, ['participantes', 'equipes', 'empresas', 'desafios']), ITEMS.gestao] },
      { group: 'Evento', items: [ITEMS.presenca, only(ITEMS.encerramento, ['avaliacoes', 'resultados'])] },
      { group: 'Análise', items: [ITEMS.relatorios] },
    ],
    extra: ['apresentacao'],
  },
  Editor: {
    key: 'editor',
    represents: 'Membros da equipe de um ou mais setores',
    home: 'dashboard',
    layout: 'admin',
    sectorScoped: true,
    nav: [
      { group: 'Dashboard', items: [ITEMS.dashboard] },
      {
        group: 'Meu trabalho',
        items: [
          { id: 'setores', label: 'Meu Setor', icon: 'grid' },
          { id: 'pendencias', label: 'Pendências', icon: 'check' },
          { id: 'ocorrencias', label: 'Ocorrências', icon: 'alert' },
          { id: 'documentos', label: 'Documentos', icon: 'file' },
        ],
      },
    ],
  },
  Validador: {
    key: 'validator',
    represents: 'Responsável por ingresso, QR Code e check-in',
    home: 'presenca',
    layout: 'focus',
    title: '',
    routes: ['presenca'],
  },
  Jurado: {
    key: 'juror',
    represents: 'Responsável pelas avaliações das equipes',
    home: 'area-jurado',
    layout: 'focus',
    title: 'Área do Jurado',
    routes: ['area-jurado', 'avaliar'],
  },
  Votante: {
    key: 'voter',
    represents: 'Público e convidados habilitados para votar',
    home: 'votacao',
    layout: 'focus',
    title: '',
    routes: ['votacao'],
  },
}

export const PROFILE_NAMES = Object.keys(ACCESS_PROFILES)

export function profileConfig(profile) {
  return ACCESS_PROFILES[profile] || ACCESS_PROFILES.Administrador
}

const ALLOWED = Object.fromEntries(PROFILE_NAMES.map((name) => {
  const config = ACCESS_PROFILES[name]
  const ids = (config.nav || []).flatMap((group) => group.items.flatMap((item) => (item.children ? item.children.map((child) => child.id) : [item.id])))
  const routes = [...ids.flatMap((id) => LEAF[id] || [id]), ...(config.routes || []), ...(config.extra || [])]
  return [name, new Set(routes)]
}))

export function canAccess(profile, path) {
  return ALLOWED[profile in ALLOWED ? profile : 'Administrador'].has(String(path || '').split('?')[0])
}

export function homeFor(profile) {
  return profileConfig(profile).home
}

export function navFor(profile) {
  return profileConfig(profile).nav || []
}

export function navActive(id, path) {
  if (path === id) return true
  return (LEAF[id] || []).includes(path)
}

// Único ponto que traduz a rota atual em destino ativo da Sidebar do perfil.
export function navState(path, profile) {
  for (const group of navFor(profile)) {
    for (const item of group.items) {
      const child = item.children?.find((entry) => navActive(entry.id, path))
      if (child) return { item: child.id, group: item.id }
      if (!item.children && navActive(item.id, path)) return { item: item.id, group: '' }
    }
  }
  return { item: '', group: '' }
}

// Editor enxerga apenas os setores atribuídos; demais perfis não têm recorte (null).
export function sectorScope(session) {
  if (!profileConfig(session?.profile).sectorScoped) return null
  const list = (session?.sectors?.length ? session.sectors : [session?.sector]).filter((name) => SETORES.includes(name))
  return list.length ? list : [SETORES[0]]
}

export function inScope(session, sector) {
  const scope = sectorScope(session)
  return !scope || scope.includes(sector)
}
