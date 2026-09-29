import { useEffect } from 'react'
import { go, useHack, useRoute } from './store'
import { FocusFrame, Icon, Shell } from './ui'
import { Closing, Management, Preparation } from './pages/Hubs'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Roulette, TeamBuild } from './pages/Teams'
import { ChallengeDetail, CompanyDetail, Distribution } from './pages/Companies'
import { Manifest, MeetingDetail } from './pages/Meetings'
import { EventMode, Occurrences, Presence, Room, Ticket, Validate } from './pages/Event'
import { Awards, Evaluate, JudgeArea, Presentation, PublicVote, Results } from './pages/Judges'
import { Reports } from './pages/Reports'

const OPEN = new Set(['login', 'votacao', 'apresentacao'])
const BARE = new Set(['login', 'votacao', 'apresentacao', 'area-jurado', 'avaliar'])
const EDITOR_HOME = new Set(['preparacao', 'config', 'participantes', 'equipes', 'montar', 'roletas', 'empresas', 'empresa', 'desafio', 'distribuicao', 'encerramento', 'jurados', 'painel', 'premiacao', 'relatorios', 'relatorio'])

function gestaoAba(path, params) {
  if (path === 'setores') return { ...params, aba: 'setores' }
  if (params.aba === 'documentos') return { ...params, aba: 'documentos' }
  if (params.aba === 'pendencias') return { ...params, aba: 'pendencias' }
  if (params.aba === 'atas') return { aba: 'reunioes', lista: 'atas' }
  if (params.aba === 'decisoes') return { aba: 'reunioes', lista: 'decisoes' }
  return { ...params, aba: 'reunioes' }
}

export default function App() {
  const { path, params } = useRoute()
  const { state, toast } = useHack()
  const editor = state.session?.profile === 'Editor'

  useEffect(() => {
    if (!state.session && !OPEN.has(path)) go('login')
    if (state.session && path === 'login') go('inicio')
    if (editor && EDITOR_HOME.has(path)) go('inicio')
  }, [path, state.session, editor])

  let page = <Dashboard />
  if (path === 'login') page = <Login />
  else if (path === 'inicio' || path === 'dashboard') page = <Dashboard />
  else if (path === 'preparacao') page = <Preparation params={params} />
  else if (path === 'config') page = <Preparation params={{ aba: 'evento', inner: params.aba }} />
  else if (path === 'participantes') page = <Preparation params={{ aba: 'participantes' }} />
  else if (path === 'equipes') page = <Preparation params={{ aba: 'equipes' }} />
  else if (path === 'empresas') page = <Preparation params={{ aba: 'empresas', inner: params.aba === 'desafios' ? 'desafios' : '' }} />
  else if (path === 'montar') page = <TeamBuild params={params} />
  else if (path === 'roletas') page = <Roulette params={params} />
  else if (path === 'empresa') page = <CompanyDetail params={params} />
  else if (path === 'desafio') page = <ChallengeDetail params={params} />
  else if (path === 'distribuicao') page = <Distribution />
  else if (path === 'gestao') page = <Management params={params} />
  else if (path === 'setores' || path === 'reunioes') page = <Management params={gestaoAba(path, params)} />
  else if (path === 'reuniao') page = <MeetingDetail params={params} />
  else if (path === 'manifestacao') page = <Manifest params={params} />
  else if (path === 'relatorios' || path === 'relatorio') page = <Reports params={params} />
  else if (path === 'evento') page = <EventMode params={params} />
  else if (path === 'ingresso') page = <Ticket />
  else if (path === 'validar') page = <Validate params={params} />
  else if (path === 'presenca') page = <Presence />
  else if (path === 'sala') page = <Room params={params} />
  else if (path === 'ocorrencias') page = <Occurrences />
  else if (path === 'encerramento') page = <Closing params={params} />
  else if (path === 'jurados') page = <Closing params={{ aba: params.aba === 'publico' ? 'votacao' : 'jurados' }} />
  else if (path === 'area-jurado') page = <FocusFrame title="Área do Jurado" exitTo="encerramento?aba=avaliacoes"><JudgeArea /></FocusFrame>
  else if (path === 'avaliar') page = <FocusFrame title="Área do Jurado" exitTo="area-jurado"><Evaluate key={params.id || '1'} params={params} /></FocusFrame>
  else if (path === 'votacao') page = <FocusFrame title="Votação do Público" exitTo="encerramento?aba=votacao"><PublicVote /></FocusFrame>
  else if (path === 'premiacao') page = <Awards />
  else if (path === 'painel') page = <Results />
  else if (path === 'apresentacao') page = <Presentation />

  const bare = BARE.has(path) || !state.session
  return (
    <>
      {bare ? page : <Shell path={path}>{page}</Shell>}
      {toast ? <div className={`toast ${toast.type === 'err' ? 'err' : ''}`} role="status"><Icon name={toast.type === 'err' ? 'info' : 'check'} size={16} /><span>{toast.text}</span></div> : null}
    </>
  )
}
