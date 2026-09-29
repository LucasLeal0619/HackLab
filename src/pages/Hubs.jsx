import { journeySteps } from '../model'
import { go, useHack } from '../store'
import { NextStep, Page, Tabs } from '../ui'
import Config from './Config'
import People from './People'
import { Teams } from './Teams'
import { Companies } from './Companies'
import Sectors from './Sectors'
import { Meetings } from './Meetings'
import { Judges } from './Judges'

const PREP = [
  { id: 'evento', label: 'Evento' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'equipes', label: 'Equipes' },
  { id: 'empresas', label: 'Empresas e Desafios' },
]

const GESTAO = [
  { id: 'setores', label: 'Setores' },
  { id: 'reunioes', label: 'Reuniões' },
  { id: 'pendencias', label: 'Pendências' },
  { id: 'documentos', label: 'Documentos' },
]

const CLOSE = [
  { id: 'jurados', label: 'Jurados' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'votacao', label: 'Votação' },
  { id: 'resultados', label: 'Resultados' },
]

function mark(status) {
  if (status === 'concluida') return '✓'
  if (status === 'andamento') return '→'
  return '○'
}

export function Preparation({ params }) {
  const { state } = useHack()
  const aba = PREP.some((item) => item.id === params.aba) ? params.aba : 'evento'
  const steps = journeySteps(state)
  const rail = [
    ['Evento', steps[0]],
    ['Participantes', steps[1]],
    ['Equipes', steps[2]],
    ['Empresas e desafios', steps[3]],
  ]
  const next = {
    evento: steps[0].status === 'concluida' ? { title: 'Evento configurado', text: 'Agora cadastre quem vai participar.', action: 'Ir para Participantes', to: 'preparacao?aba=participantes' } : null,
    participantes: state.participantsConfirmed ? { title: 'Lista confirmada', text: 'Agora você pode formar as equipes.', action: 'Ir para Equipes', to: 'preparacao?aba=equipes' } : null,
    equipes: steps[2].status === 'concluida' ? { title: 'Equipes organizadas', text: 'Agora associe empresas e desafios.', action: 'Ir para Empresas e Desafios', to: 'preparacao?aba=empresas' } : null,
    empresas: steps[0].status === 'concluida' && state.participantsConfirmed && steps[2].status === 'concluida' && steps[3].status === 'concluida'
      ? { title: 'Preparação concluída', text: 'As informações essenciais do Hackathon estão prontas.', action: 'Ir para Gestão', to: 'gestao?aba=setores' }
      : null,
  }[aba]

  return (
    <>
      <Page title="Preparação" subtitle="Organize o evento, os participantes, as equipes e os desafios.">
        <ol className="prep-rail">
          {rail.map(([label, step]) => (
            <li key={label} className={step.status}>{mark(step.status)} {label}</li>
          ))}
        </ol>
        <Tabs tabs={PREP} value={aba} onChange={(id) => go(`preparacao?aba=${id}`)} />
      </Page>
      <div className="journey-slot">
        {aba === 'evento' ? <Config params={{ aba: params.inner === 'usuarios' ? 'usuarios' : 'hackathon' }} /> : null}
        {aba === 'participantes' ? <People params={params} /> : null}
        {aba === 'equipes' ? <Teams /> : null}
        {aba === 'empresas' ? <Companies params={{ aba: params.inner === 'desafios' ? 'desafios' : 'empresas' }} /> : null}
      </div>
      <NextStep {...(next || {})} />
    </>
  )
}

export function Management({ params }) {
  const aba = GESTAO.some((item) => item.id === params.aba) ? params.aba : 'setores'
  const meetingAba = params.lista === 'atas' ? 'atas' : params.lista === 'decisoes' ? 'decisoes' : 'reunioes'
  return (
    <>
      <Page title="Gestão" subtitle="Acompanhe setores, reuniões, pendências e documentos.">
        <Tabs tabs={GESTAO} value={aba} onChange={(id) => go(`gestao?aba=${id}`)} />
      </Page>
      <div className="journey-slot">
        {aba === 'setores' ? <Sectors params={params} /> : null}
        {aba === 'reunioes' ? <Meetings params={{ aba: meetingAba }} embedded /> : null}
        {aba === 'pendencias' ? <Meetings params={{ aba: 'pendencias' }} embedded /> : null}
        {aba === 'documentos' ? <Meetings params={{ aba: 'documentos' }} embedded /> : null}
      </div>
      {aba === 'setores' && !params.setor ? (
        <NextStep title="Gestão em andamento" text="Quando os setores estiverem encaminhados, acompanhe o evento." action="Ir para Modo Evento" to="evento" />
      ) : null}
    </>
  )
}

export function Closing({ params }) {
  const aba = CLOSE.some((item) => item.id === params.aba) ? params.aba : 'jurados'
  return (
    <>
      <Page title="Encerramento" subtitle="Jurados, avaliações, votação e divulgação dos resultados.">
        <Tabs tabs={CLOSE} value={aba} onChange={(id) => go(`encerramento?aba=${id}`)} />
      </Page>
      <div className="journey-slot">
        <Judges params={params} part={aba} />
      </div>
    </>
  )
}
