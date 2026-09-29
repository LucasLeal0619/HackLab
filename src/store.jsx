import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ACCOUNTS, KEY, buildDemo, defaultState, normalizeTeams } from './model'

const Ctx = createContext(null)

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
      users: parsed.users?.length ? parsed.users : base.users,
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

export function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const root = document.documentElement
    document.body.style.zoom = `${state.a11y.scale}%`
    root.classList.toggle('contrast', state.a11y.contrast)
    root.classList.toggle('focus-strong', state.a11y.focus)
    root.classList.toggle('reduce-motion', state.a11y.motion)
    root.dataset.spacing = state.a11y.spacing
  }, [state.a11y])

  useEffect(() => {
    const email = state.session?.email?.trim().toLowerCase()
    if (!email) return
    const registered = (state.users || []).find((item) => item.email?.trim().toLowerCase() === email)
    if (registered?.status !== 'Inativo') return
    setState((prev) => ({ ...prev, session: null }))
    go('login')
    setToast({ text: 'Este usuário está inativo e não tem acesso ao HackLab.', type: 'err', id: Date.now() })
  }, [state.session, state.users])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const update = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const flash = useCallback((text, type = 'ok') => {
    setToast({ text, type, id: Date.now() })
  }, [])

  const api = useMemo(() => ({
    state,
    update,
    toast,
    flash,
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
            profile: 'Administrador',
            sector: 'Gestão Geral',
            role: 'Administrador',
          }
      if (remember) localStorage.setItem('hacklab.remember', normalized)
      else localStorage.removeItem('hacklab.remember')
      update((draft) => { draft.session = session })
      go('inicio')
      return ''
    },
    logout() {
      update((draft) => { draft.session = null })
      go('login')
    },
    setProfile(profile) {
      update((draft) => {
        if (!draft.session) return
        draft.session.profile = profile
        if (profile === 'Editor') {
          const sectors = draft.session.sectors?.length ? draft.session.sectors : ['Tecnologia']
          draft.session.sectors = sectors
          if (!sectors.includes(draft.session.sector)) draft.session.sector = sectors[0]
        }
      })
      flash(`Perfil de acesso alterado para ${profile}.`)
      if (profile === 'Editor') go('inicio')
    },
    setA11y(partial) {
      update((draft) => { draft.a11y = { ...draft.a11y, ...partial } })
    },
    resetA11y() {
      update((draft) => { draft.a11y = defaultState().a11y })
      flash('Acessibilidade restaurada ao padrão.')
    },
    loadDemo() {
      setState((prev) => buildDemo(prev))
      flash('Dados demonstrativos carregados neste navegador.')
    },
    resetAll() {
      const session = state.session
      const a11y = state.a11y
      const fresh = defaultState()
      fresh.session = session
      fresh.a11y = a11y
      setState(fresh)
      flash('Dados do protótipo limpos. A sessão foi mantida.')
    },
  }), [state, update, toast, flash])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useHack() {
  return useContext(Ctx)
}
