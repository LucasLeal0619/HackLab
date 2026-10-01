<script setup>
import { computed, ref, watch } from 'vue'
import { OCC_CATEGORIES, OCC_PRIORITIES, OCC_STATUS, SETORES, occurrenceCategory, occurrenceSector, occurrenceStatus, teamName, uid } from '../model'
import { useHack } from '../store'
import Badge from '../components/Badge.vue'
import Drawer from '../components/Drawer.vue'
import Empty from '../components/Empty.vue'
import Field from '../components/Field.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone.js'

const DAYS = [['', 'Fora dos dias do evento'], ['1', 'Dia 1'], ['2', 'Dia 2'], ['3', 'Dia 3']]

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const { state, update, flash } = useHack()
const filters = ref({ query: '', category: '', sector: '', priority: '', status: '', day: '' })
const form = ref(null)
const detailId = ref(null)
const solving = ref(null)
const removing = ref(null)

function dayLabel(value) {
  return value ? `Dia ${value}` : '—'
}

function blank(extra = {}) {
  return { title: '', category: 'Outro', description: '', day: '', at: '', place: '', team: '', sector: '', priority: 'Média', responsible: state.session?.name || '', status: 'Aberta', notes: '', ...extra }
}

// Atalhos dos setores chegam como parâmetros e abrem o mesmo formulário da central.
watch(() => props.params, (params) => {
  if (params.setor && SETORES.includes(params.setor)) filters.value.sector = params.setor
  if (params.novo) {
    form.value = blank({
      title: params.titulo || '',
      category: OCC_CATEGORIES.includes(params.categoria) ? params.categoria : 'Outro',
      sector: SETORES.includes(params.setor) ? params.setor : '',
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
    .filter((item) => !term || `${item.title} ${item.description || ''} ${item.place || ''} ${item.responsible || ''}`.toLowerCase().includes(term))
    .filter((item) => !f.category || item.categoryLabel === f.category)
    .filter((item) => !f.sector || item.sectorLabel === f.sector)
    .filter((item) => !f.priority || item.priority === f.priority)
    .filter((item) => !f.status || item.statusLabel === f.status)
    .filter((item) => !f.day || String(item.day || '') === f.day)
})
const counts = computed(() => OCC_STATUS.map((status) => [status, state.occurrences.filter((item) => occurrenceStatus(item) === status).length]))
const detail = computed(() => {
  const item = state.occurrences.find((entry) => entry.id === detailId.value)
  return item ? { ...item, categoryLabel: occurrenceCategory(item), sectorLabel: occurrenceSector(item), statusLabel: occurrenceStatus(item) } : null
})
const filtering = computed(() => Object.values(filters.value).some(Boolean))

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
</script>

<template>
  <Page crumbs="Gestão / Ocorrências" title="Ocorrências" subtitle="Registre e acompanhe situações ocorridas durante a organização e realização do Hackathon.">
    <template #actions>
      <button class="btn" type="button" @click="openNew">+ Registrar ocorrência</button>
    </template>

    <div class="filters occ-filters">
      <input v-model="filters.query" class="input" placeholder="Buscar ocorrência" aria-label="Buscar ocorrência" />
      <select v-model="filters.category" class="input" aria-label="Categoria">
        <option value="">Categoria</option>
        <option v-for="item in OCC_CATEGORIES" :key="item">{{ item }}</option>
      </select>
      <select v-model="filters.sector" class="input" aria-label="Setor">
        <option value="">Setor</option>
        <option v-for="item in SETORES" :key="item">{{ item }}</option>
      </select>
      <select v-model="filters.priority" class="input" aria-label="Prioridade">
        <option value="">Prioridade</option>
        <option v-for="item in OCC_PRIORITIES" :key="item">{{ item }}</option>
      </select>
      <select v-model="filters.status" class="input" aria-label="Status">
        <option value="">Status</option>
        <option v-for="item in OCC_STATUS" :key="item">{{ item }}</option>
      </select>
      <select v-model="filters.day" class="input" aria-label="Dia">
        <option value="">Dia</option>
        <option v-for="item in [1, 2, 3]" :key="item" :value="String(item)">Dia {{ item }}</option>
      </select>
    </div>
    <p class="attendance-summary">
      <span v-for="[status, total] in counts" :key="status">{{ status }} <b>{{ total }}</b></span>
      <button v-if="filtering" class="linkish" type="button" @click="filters = { query: '', category: '', sector: '', priority: '', status: '', day: '' }">Limpar filtros</button>
    </p>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Ocorrência</th><th>Categoria</th><th>Local</th><th>Setor</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-if="list.length === 0">
            <td colspan="7"><Empty :title="state.occurrences.length ? 'Nenhuma ocorrência para estes filtros.' : 'Nenhuma ocorrência registrada.'" text="Ocorrências são fatos ou problemas que aconteceram. O que ainda precisa ser feito fica em Pendências." /></td>
          </tr>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.title }}<template v-if="item.day || item.at"><br /><small class="stat-hint">{{ [item.day ? `Dia ${item.day}` : '', item.at].filter(Boolean).join(' · ') }}</small></template></td>
            <td>{{ item.categoryLabel }}</td>
            <td>{{ item.place || '—' }}</td>
            <td>{{ item.sectorLabel || '—' }}</td>
            <td><Badge :tone="toneFor(item.priority)">{{ item.priority || '—' }}</Badge></td>
            <td><Badge :tone="toneFor(item.statusLabel)">{{ item.statusLabel }}</Badge></td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" type="button" @click="detailId = item.id">Ver</button>
                <button class="btn ghost small" type="button" @click="openEdit(item)">Editar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Drawer v-if="detail" :title="detail.title" :subtitle="`${detail.categoryLabel} · ${detail.statusLabel}`" @close="detailId = null">
      <dl class="detail-list">
        <dt>Descrição</dt><dd>{{ detail.description || '—' }}</dd>
        <dt>Categoria</dt><dd>{{ detail.categoryLabel }}</dd>
        <dt>Dia</dt><dd>{{ dayLabel(detail.day) }}</dd>
        <dt>Data / horário</dt><dd>{{ detail.at || '—' }}</dd>
        <dt>Local</dt><dd>{{ detail.place || '—' }}</dd>
        <dt>Equipe</dt><dd>{{ detail.team || '—' }}</dd>
        <dt>Setor responsável</dt><dd>{{ detail.sectorLabel || '—' }}</dd>
        <dt>Prioridade</dt><dd><Badge :tone="toneFor(detail.priority)">{{ detail.priority || '—' }}</Badge></dd>
        <dt>Responsável</dt><dd>{{ detail.responsible || '—' }}</dd>
        <dt>Status</dt><dd><Badge :tone="toneFor(detail.statusLabel)">{{ detail.statusLabel }}</Badge></dd>
        <dt>Solução</dt><dd>{{ detail.solution || '—' }}</dd>
        <dt>Observação</dt><dd>{{ detail.notes || '—' }}</dd>
      </dl>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = detail">Excluir</button>
        <button class="btn ghost" type="button" @click="openEdit(detail)">Editar</button>
        <button v-if="detail.statusLabel !== 'Resolvida'" class="btn" type="button" @click="openSolve">Registrar solução</button>
      </template>
    </Drawer>

    <Modal v-if="form" :title="form.id ? 'Editar ocorrência' : 'Registrar ocorrência'" subtitle="Registre o que aconteceu. Tarefas a fazer pertencem a Pendências." wide @close="form = null">
      <div class="form-grid">
        <Field label="Título" required class-name="span-2"><input v-model="form.title" class="input" /></Field>
        <Field label="Categoria">
          <select v-model="form.category" class="input">
            <option v-for="item in OCC_CATEGORIES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Setor responsável">
          <select v-model="form.sector" class="input">
            <option value="">Não se aplica</option>
            <option v-for="item in SETORES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Descrição" class-name="span-2"><textarea v-model="form.description" class="input" /></Field>
        <Field label="Dia do evento">
          <select v-model="form.day" class="input">
            <option v-for="[value, label] in DAYS" :key="value" :value="value">{{ label }}</option>
          </select>
        </Field>
        <Field label="Data / horário"><input v-model="form.at" class="input" placeholder="Ex.: 26/09 · 09:40" /></Field>
        <Field label="Local / sala"><input v-model="form.place" class="input" /></Field>
        <Field label="Equipe relacionada">
          <select v-model="form.team" class="input">
            <option value="">Nenhuma</option>
            <option v-for="team in state.teams" :key="team.id" :value="teamName(team.id)">{{ teamName(team.id) }}</option>
          </select>
        </Field>
        <Field label="Responsável"><input v-model="form.responsible" class="input" /></Field>
        <Field label="Status">
          <select v-model="form.status" class="input">
            <option v-for="item in OCC_STATUS" :key="item">{{ item }}</option>
          </select>
        </Field>
        <div class="field span-2">
          <span>Prioridade</span>
          <div class="chips">
            <button v-for="item in OCC_PRIORITIES" :key="item" type="button" class="chip" :class="{ on: form.priority === item }" @click="form.priority = item">{{ item }}</button>
          </div>
        </div>
        <Field label="Observação" class-name="span-2"><input v-model="form.notes" class="input" /></Field>
      </div>
      <template #footer>
        <button class="btn ghost" type="button" @click="form = null">Cancelar</button>
        <button class="btn" type="button" @click="save">{{ form.id ? 'Salvar alterações' : 'Registrar ocorrência' }}</button>
      </template>
    </Modal>

    <Modal v-if="solving" title="Registrar solução" subtitle="A ocorrência passará para o status Resolvida." @close="solving = null">
      <Field label="Solução adotada" required><textarea v-model="solving.solution" class="input" /></Field>
      <Field label="Responsável"><input v-model="solving.responsible" class="input" /></Field>
      <Field label="Observação"><input v-model="solving.note" class="input" /></Field>
      <template #footer>
        <button class="btn ghost" type="button" @click="solving = null">Cancelar</button>
        <button class="btn" type="button" @click="saveSolution">Salvar solução</button>
      </template>
    </Modal>

    <Modal v-if="removing" title="Excluir ocorrência?" subtitle="O registro será removido deste navegador." @close="removing = null">
      <p>{{ removing.title }}</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="removing = null">Cancelar</button>
        <button class="btn danger" type="button" @click="remove">Excluir</button>
      </template>
    </Modal>
  </Page>
</template>
