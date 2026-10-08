// Lógica do componente Presentation.vue (o template fica no .vue).
import { computed, ref } from 'vue'
import { companyOf, teamChallenge, teamName } from '@/js/data/model'
import { useHack, go } from '@/js/stores/hack'

export function usePresentation() {
  const { state, update, flash } = useHack()
  const step = ref(0)

  function teamLabel(team) {
    const challenge = teamChallenge(state, team.id)
    const company = challenge ? companyOf(state, challenge.companyId) : null
    return { challenge, company }
  }

  function doneEvals(teamId) {
    return state.evaluations.filter((item) => item.teamId === teamId && item.status === 'concluida')
  }

  function averageOf(teamId) {
    const scores = doneEvals(teamId).flatMap((item) => Object.values(item.scores || {}).map(Number).filter((value) => !Number.isNaN(value)))
    if (!scores.length) return null
    return scores.reduce((sum, value) => sum + value, 0) / scores.length
  }

  function voteCount(teamId) {
    return state.voting.ballots.filter((item) => item.teamId === teamId).length
  }

  const rows = computed(() => state.teams.map((team) => {
    const meta = teamLabel(team)
    return { team, ...meta, avg: averageOf(team.id), votes: voteCount(team.id) }
  }))
  const totalVotes = computed(() => state.voting.ballots.length)
  const PRESENT_STEPS = computed(() => [
    { type: 'abertura' },
    ...rows.value.map((item) => ({ type: 'equipe', teamId: item.team.id })),
    ...[0, 1, 2].map((awardIndex) => ({ type: 'premiacao', awardIndex })),
    { type: 'fim' },
  ])
  const current = computed(() => PRESENT_STEPS.value[step.value] || { type: 'abertura' })
  const currentTeam = computed(() => rows.value.find((item) => item.team.id === current.value.teamId))
  const currentAward = computed(() => state.awards[current.value.awardIndex] || null)

  function goStep(next) {
    step.value = Math.min(PRESENT_STEPS.value.length - 1, Math.max(0, next))
  }

  return {
    PRESENT_STEPS,
    state,
    step,
    rows,
    totalVotes,
    current,
    currentTeam,
    currentAward,
    goStep,
    teamName,
    go,
  }
}
