// Lógica do componente Occurrences.vue (o template fica no .vue).
import { computed, ref, watch } from 'vue'
import { OCC_CATEGORIES, OCC_PRIORITIES, OCC_STATUS, SETORES, occurrenceCategory, occurrenceSector, occurrenceStatus, teamName, uid } from '@/js/data/model'
import { inScope, isOperational, sectorScope } from '@/js/config/access'
import { useHack } from '@/js/stores/hack'
import { toneFor } from '@/js/utils/tone'

export function useOccurrences(props) {
  const DAYS = [['', 'Fora dos dias do evento'], ['1', 'Dia 1'], ['2', 'Dia 2'], ['3', 'Dia 3']]


  const { state, update, flash } = useHack()
  const scope = computed(() => sectorScope(state.session))
  const sectorOptions = computed(() => scope.value || SETORES)
  const operational = computed(() => isOperational(state.session))
  const filters = ref({ query: '', category: '', sector: '', priority: '', status: '', day: '' })
  const form = ref(null)
  const detailId = ref(null)
  const solving = ref(null)
  const removing = ref(null)

  function dayLabel(value) {
    return value ? `Dia ${value}` : '—'
  }

  function blank(extra = {}) {
    return { title: '', category: 'Outro', description: '', day: '', at: '', place: '', team: '', sector: scope.value?.[0] || '', priority: 'Média', responsible: state.session?.name || '', status: 'Aberta', notes: '', ...extra }
  }

  // Atalhos dos setores chegam como parâmetros e abrem o mesmo formulário da central.
  watch(() => props.params, (params) => {
    if (params.setor && SETORES.includes(params.setor)) filters.value.sector = params.setor
    if (params.novo) {
      form.value = blank({
        title: params.titulo || '',
        category: OCC_CATEGORIES.includes(params.categoria) ? params.categoria : 'Outro',
        sector: SETORES.includes(params.setor) ? params.setor : scope.value?.[0] || '',
        place: params.local || '',
      })
      filters.value.sector = ''
      window.history.replaceState(null, '', '#/ocorrencias')
    }
  }, { immediate: true })

  const list = computed(() => {
    const f = filters.value
    const term = f.query.trim().toLowerCase()
    return state.occurrences
      .map((item) => ({ ...item, categoryLabel: occurrenceCategory(item), sectorLabel: occurrenceSector(item), statusLabel: occurrenceStatus(item) }))
      .filter((item) => inScope(state.session, item.sectorLabel))
      .filter((item) => !term || `${item.title} ${item.description || ''} ${item.place || ''} ${item.responsible || ''}`.toLowerCase().includes(term))
      .filter((item) => !f.category || item.categoryLabel === f.category)
      .filter((item) => !f.sector || item.sectorLabel === f.sector)
      .filter((item) => !f.priority || item.priority === f.priority)
      .filter((item) => !f.status || item.statusLabel === f.status)
      .filter((item) => !f.day || String(item.day || '') === f.day)
  })
  const counts = computed(() => OCC_STATUS.map((status) => [status, state.occurrences.filter((item) => inScope(state.session, occurrenceSector(item)) && occurrenceStatus(item) === status).length]))
  const detail = computed(() => {
    const item = state.occurrences.find((entry) => entry.id === detailId.value)
    return item ? { ...item, categoryLabel: occurrenceCategory(item), sectorLabel: occurrenceSector(item), statusLabel: occurrenceStatus(item) } : null
  })
  const filtering = computed(() => Object.values(filters.value).some(Boolean))
  const advancedFilters = computed(() => ['category', 'sector', 'priority', 'status', 'day'].filter((key) => filters.value[key]).length)

  function clearFilters() {
    filters.value = { query: '', category: '', sector: '', priority: '', status: '', day: '' }
  }

  function openNew() {
    form.value = blank()
  }

  function openEdit(item) {
    form.value = blank({ ...item, category: occurrenceCategory(item), sector: occurrenceSector(item), status: occurrenceStatus(item), day: item.day ? String(item.day) : '' })
    detailId.value = null
  }

  function save() {
    const current = form.value
    if (!current.title.trim()) {
      flash('Informe o título da ocorrência.', 'err')
      return
    }
    const record = {
      title: current.title.trim(),
      category: current.category,
      description: current.description,
      day: current.day ? Number(current.day) : '',
      at: current.at,
      place: current.place,
      team: current.team,
      sector: current.sector,
      priority: current.priority,
      responsible: current.responsible,
      status: current.status,
      notes: current.notes,
    }
    update((draft) => {
      const index = current.id ? draft.occurrences.findIndex((item) => item.id === current.id) : -1
      if (index >= 0) draft.occurrences[index] = { ...draft.occurrences[index], ...record }
      else draft.occurrences.unshift({ id: uid('oc'), ...record, solution: '' })
    })
    flash(current.id ? 'Ocorrência atualizada.' : 'Ocorrência registrada.')
    form.value = null
  }

  function openSolve() {
    solving.value = { id: detail.value.id, solution: '', responsible: detail.value.responsible || state.session?.name || '', note: '' }
  }

  function saveSolution() {
    const current = solving.value
    if (!current.solution.trim()) {
      flash('Descreva a solução adotada.', 'err')
      return
    }
    update((draft) => {
      const item = draft.occurrences.find((entry) => entry.id === current.id)
      if (!item) return
      item.status = 'Resolvida'
      item.solution = current.solution.trim()
      if (current.responsible) item.responsible = current.responsible
      if (current.note) item.notes = [item.notes, current.note].filter(Boolean).join(' · ')
    })
    solving.value = null
    flash('Ocorrência resolvida.')
  }

  function remove() {
    const id = removing.value.id
    update((draft) => {
      draft.occurrences = draft.occurrences.filter((item) => item.id !== id)
    })
    removing.value = null
    detailId.value = null
    flash('Ocorrência excluída.')
  }

  return {
    DAYS,
    state,
    scope,
    sectorOptions,
    operational,
    filters,
    form,
    detailId,
    solving,
    removing,
    dayLabel,
    list,
    counts,
    detail,
    filtering,
    advancedFilters,
    clearFilters,
    openNew,
    openEdit,
    save,
    openSolve,
    saveSolution,
    remove,
    OCC_CATEGORIES,
    OCC_PRIORITIES,
    OCC_STATUS,
    teamName,
    toneFor,
  }
}
