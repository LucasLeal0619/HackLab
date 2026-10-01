<script setup>
import { computed, watch } from 'vue'
import { go, useHack, useRoute } from './store'
import FocusFrame from './components/FocusFrame.vue'
import Icon from './components/Icon.vue'
import Shell from './components/Shell.vue'
import Closing from './pages/Closing.vue'
import Management from './pages/Management.vue'
import Preparation from './pages/Preparation.vue'
import Login from './pages/Login.vue'
import Dashboard from './pages/Dashboard.vue'
import Roulette from './pages/Roulette.vue'
import TeamBuild from './pages/TeamBuild.vue'
import ChallengeDetail from './pages/ChallengeDetail.vue'
import CompanyDetail from './pages/CompanyDetail.vue'
import Distribution from './pages/Distribution.vue'
import Manifest from './pages/Manifest.vue'
import MeetingDetail from './pages/MeetingDetail.vue'
import EventMode from './pages/EventMode.vue'
import Occurrences from './pages/Occurrences.vue'
import Presence from './pages/Presence.vue'
import Room from './pages/Room.vue'
import Ticket from './pages/Ticket.vue'
import Validate from './pages/Validate.vue'
import Awards from './pages/Awards.vue'
import Evaluate from './pages/Evaluate.vue'
import JudgeArea from './pages/JudgeArea.vue'
import Presentation from './pages/Presentation.vue'
import PublicVote from './pages/PublicVote.vue'
import Results from './pages/Results.vue'
import Reports from './pages/Reports.vue'

const OPEN = new Set(['login', 'votacao', 'apresentacao'])
const BARE = new Set(['login', 'votacao', 'apresentacao', 'area-jurado', 'avaliar'])
const EDITOR_HOME = new Set(['preparacao', 'config', 'participantes', 'equipes', 'montar', 'roletas', 'empresas', 'empresa', 'desafio', 'distribuicao', 'encerramento', 'jurados', 'painel', 'premiacao', 'relatorios', 'relatorio'])

const route = useRoute()
const hack = useHack()
const path = computed(() => route.value.path)
const params = computed(() => route.value.params)
const editor = computed(() => hack.state.session?.profile === 'Editor')
const bare = computed(() => BARE.has(path.value) || !hack.state.session)

function gestaoAba(current, currentParams) {
  if (current === 'setores') return { ...currentParams, aba: 'setores' }
  if (currentParams.aba === 'documentos') return { ...currentParams, aba: 'documentos' }
  if (currentParams.aba === 'pendencias') return { ...currentParams, aba: 'pendencias' }
  if (currentParams.aba === 'atas') return { aba: 'reunioes', lista: 'atas' }
  if (currentParams.aba === 'decisoes') return { aba: 'reunioes', lista: 'decisoes' }
  return { ...currentParams, aba: 'reunioes' }
}

const page = computed(() => path.value)

watch([path, () => hack.state.session, editor], () => {
  if (!hack.state.session && !OPEN.has(path.value)) go('login')
  if (hack.state.session && path.value === 'login') go('inicio')
  if (editor.value && EDITOR_HOME.has(path.value)) go('inicio')
}, { immediate: true })
</script>

<template>
  <Shell v-if="!bare" :path="path">
    <Dashboard v-if="page === 'inicio' || page === 'dashboard'" />
    <Preparation v-else-if="page === 'preparacao'" :params="params" />
    <Preparation v-else-if="page === 'config'" :params="{ aba: 'evento', inner: params.aba }" />
    <Preparation v-else-if="page === 'participantes'" :params="{ aba: 'participantes' }" />
    <Preparation v-else-if="page === 'equipes'" :params="{ aba: 'equipes' }" />
    <Preparation v-else-if="page === 'empresas'" :params="{ aba: 'empresas', inner: params.aba === 'desafios' ? 'desafios' : '' }" />
    <TeamBuild v-else-if="page === 'montar'" :params="params" />
    <Roulette v-else-if="page === 'roletas'" :params="params" />
    <CompanyDetail v-else-if="page === 'empresa'" :params="params" />
    <ChallengeDetail v-else-if="page === 'desafio'" :params="params" />
    <Distribution v-else-if="page === 'distribuicao'" />
    <Management v-else-if="page === 'gestao'" :params="params" />
    <Management v-else-if="page === 'setores' || page === 'reunioes'" :params="gestaoAba(page, params)" />
    <MeetingDetail v-else-if="page === 'reuniao'" :params="params" />
    <Manifest v-else-if="page === 'manifestacao'" :params="params" />
    <Reports v-else-if="page === 'relatorios' || page === 'relatorio'" :params="params" />
    <EventMode v-else-if="page === 'evento'" :params="params" />
    <Ticket v-else-if="page === 'ingresso'" />
    <Validate v-else-if="page === 'validar'" :params="params" />
    <Presence v-else-if="page === 'presenca'" />
    <Room v-else-if="page === 'sala'" :params="params" />
    <Occurrences v-else-if="page === 'ocorrencias'" />
    <Closing v-else-if="page === 'encerramento'" :params="params" />
    <Closing v-else-if="page === 'jurados'" :params="{ aba: params.aba === 'publico' ? 'votacao' : 'jurados' }" />
    <Awards v-else-if="page === 'premiacao'" />
    <Results v-else-if="page === 'painel'" />
    <Dashboard v-else />
  </Shell>
  <template v-else>
    <Login v-if="page === 'login'" />
    <FocusFrame v-else-if="page === 'area-jurado'" title="Área do Jurado" exit-to="encerramento?aba=avaliacoes">
      <JudgeArea />
    </FocusFrame>
    <FocusFrame v-else-if="page === 'avaliar'" title="Área do Jurado" exit-to="area-jurado">
      <Evaluate :key="params.id || '1'" :params="params" />
    </FocusFrame>
    <FocusFrame v-else-if="page === 'votacao'" title="Votação do Público" exit-to="encerramento?aba=votacao">
      <PublicVote />
    </FocusFrame>
    <Presentation v-else-if="page === 'apresentacao'" />
    <Dashboard v-else />
  </template>
  <div v-if="hack.toast" class="toast" :class="{ err: hack.toast.type === 'err' }" role="status">
    <Icon :name="hack.toast.type === 'err' ? 'info' : 'check'" :size="16" />
    <span>{{ hack.toast.text }}</span>
  </div>
</template>
