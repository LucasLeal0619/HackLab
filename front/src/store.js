import { inject, reactive, ref, toRaw, watch } from 'vue'
import { homeFor, migrateProfile, profileConfig } from './access'
import { ACCOUNTS, KEY, SETORES, buildDemo, defaultState, normalizeTeams, seedUsers } from './model'

const STORE = 'hacklab'

function withSeedUsers(users) {
  const profiles = new Set(users.map((item) => item.profile))
  const ids = new Set(users.map((item) => item.id))
  return [...users, ...seedUsers().filter((item) => !profiles.has(item.profile) && !ids.has(item.id))]
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const base = defaultState()
    const hasWork = ['students', 'companies', 'meetings', 'judges'].some((key) => (parsed[key] || []).length)
    return {
      ...base,
      ...parsed,
      a11y: { ...base.a11y, ...(parsed.a11y || {}) },
      event: { ...base.event, ...(parsed.event || {}) },
      voting: { ...base.voting, ...(parsed.voting || {}) },
      teams: normalizeTeams(parsed.teams).map((team) => ({ ...team, members: team.members || [] })),
      students: (parsed.students || []).map((student) => ({ ...student, availability: student.availability || 'Disponível' })),
      participantsConfirmed: Boolean(parsed.participantsConfirmed),
      teamSize: Number(parsed.teamSize) || 6,
      // Estado salvo antes da Spec 17: "Administrador" vira SuperAdmin e os novos perfis ganham usuários demonstrativos.
      session: parsed.session ? { ...parsed.session, profile: migrateProfile(parsed.session.profile) } : null,
      users: parsed.users?.length ? withSeedUsers(parsed.users.map((item) => ({ ...item, profile: migrateProfile(item.profile) }))) : base.users,
      orgMembers: (parsed.orgMembers || []).map((item) => ({ ...item, profile: migrateProfile(item.profile) })),
      welcome: parsed.welcome ?? (hasWork ? 'existente' : null),
      demo: Boolean(parsed.demo) || /demonstrativ/i.test(JSON.stringify({
        students: parsed.students,
        companies: parsed.companies,
        judges: parsed.judges,
        meetings: parsed.meetings,
      })),
    }
  } catch {
    return defaultState()
  }
}

export function parseHash() {
  const raw = (window.location.hash || '#/login').replace(/^#\/?/, '')
  const [path, qs] = raw.split('?')
  const params = Object.fromEntries(new URLSearchParams(qs || ''))
  return { path: path || 'login', params }
}

export function go(to) {
  const path = to.startsWith('/') ? to : `/${to}`
  if (`#${path}` === window.location.hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = path
  }
}

const route = ref(parseHash())
let routeBound = false

function bindRoute() {
  if (routeBound) return
  routeBound = true
  window.addEventListener('hashchange', () => {
    route.value = parseHash()
  })
}

export function useRoute() {
  bindRoute()
  return route
}

function replaceState(state, next) {
  Object.keys(state).forEach((key) => {
    if (!(key in next)) delete state[key]
  })
  Object.assign(state, next)
}

export function createHackStore() {
  bindRoute()
  const state = reactive(load())
  let toastTimer = 0

  const store = reactive({
    state,
    toast: null,
    update(fn) {
      const draft = structuredClone(toRaw(state))
      fn(draft)
      replaceState(state, draft)
    },
    flash(text, type = 'ok') {
      store.toast = { text, type, id: Date.now() }
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => { store.toast = null }, 3200)
    },
    login(email, password, remember) {
      const normalized = email.trim().toLowerCase()
      const secret = password.trim()
      if (!normalized.includes('@') || secret.length < 4) {
        return 'Informe um e-mail válido e uma senha com pelo menos 4 caracteres.'
      }
      const registered = (state.users || []).find((item) => item.email?.trim().toLowerCase() === normalized)
      if (registered?.status === 'Inativo') return 'Este usuário está inativo e não tem acesso ao HackLab.'
      if (registered?.password && registered.password !== secret) return 'Senha incorreta.'
      const known = ACCOUNTS[normalized]
      const session = registered
        ? {
          email: normalized,
          name: registered.name,
          profile: registered.profile,
          sector: registered.sector,
          role: registered.role,
          sectors: registered.sectors,
        }
        : known
          ? { email: normalized, ...known }
          : {
            email: normalized,
            name: 'Usuário Demonstrativo',
            profile: 'SuperAdmin',
            sector: '',
            role: 'Equipe de TI',
          }
      if (remember) localStorage.setItem('hacklab.remember', normalized)
      else localStorage.removeItem('hacklab.remember')
      store.update((draft) => { draft.session = session })
      go(homeFor(session.profile))
      return ''
    },
    logout() {
      store.update((draft) => { draft.session = null })
      go('login')
    },
    // Simulação do protótipo: troca só a experiência visual, sem tocar nos dados do evento.
    setProfile(profile) {
      store.update((draft) => {
        if (!draft.session) return
        draft.session.profile = profile
        if (profileConfig(profile).sectorScoped) {
          const sectors = (draft.session.sectors || []).filter((name) => SETORES.includes(name))
          draft.session.sectors = sectors.length ? sectors : ['Tecnologia']
          if (!draft.session.sectors.includes(draft.session.sector)) draft.session.sector = draft.session.sectors[0]
        }
      })
      store.flash(`Perfil de acesso alterado para ${profile}.`)
      go(homeFor(profile))
    },
    setDemoSector(sector) {
      if (!SETORES.includes(sector)) return
      store.update((draft) => {
        if (!draft.session) return
        draft.session.sectors = [sector]
        draft.session.sector = sector
      })
      store.flash(`Setor demonstrativo: ${sector}.`)
    },
    setA11y(partial) {
      store.update((draft) => { draft.a11y = { ...draft.a11y, ...partial } })
    },
    resetA11y() {
      store.update((draft) => { draft.a11y = defaultState().a11y })
      store.flash('Acessibilidade restaurada ao padrão.')
    },
    loadDemo() {
      replaceState(state, buildDemo(structuredClone(toRaw(state))))
      store.flash('Dados demonstrativos carregados neste navegador.')
    },
    resetAll() {
      const fresh = defaultState()
      fresh.session = state.session
      fresh.a11y = state.a11y
      replaceState(state, fresh)
      store.flash('Dados do protótipo limpos. A sessão foi mantida.')
    },
  })

  watch(state, () => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, { deep: true })

  watch(() => state.a11y, (a11y) => {
    const root = document.documentElement
    document.body.style.zoom = `${a11y.scale}%`
    root.classList.toggle('contrast', a11y.contrast)
    root.classList.toggle('focus-strong', a11y.focus)
    root.classList.toggle('reduce-motion', a11y.motion)
    root.dataset.spacing = a11y.spacing
  }, { deep: true, immediate: true })

  watch(() => state.session?.email, () => {
    const email = state.session?.email?.trim().toLowerCase()
    if (!email) return
    const registered = (state.users || []).find((item) => item.email?.trim().toLowerCase() === email)
    if (registered?.status !== 'Inativo') return
    state.session = null
    go('login')
    store.flash('Este usuário está inativo e não tem acesso ao HackLab.', 'err')
  })

  return store
}

export function useHack() {
  return inject(STORE)
}
