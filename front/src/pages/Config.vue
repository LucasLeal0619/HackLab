<script setup>
import { computed, ref } from 'vue'
import { SETORES, uid } from '../model'
import { useHack } from '../store'
import Badge from '../components/Badge.vue'
import Field from '../components/Field.vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import Tabs from '../components/Tabs.vue'
import { toneFor } from '../components/tone'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
})

const MATRIX = [
  ['Dashboard', 'Permitido', 'Permitido', 'Permitido'],
  ['Configuração', 'Permitido', 'Consulta', 'Sem acesso'],
  ['Pessoas', 'Permitido', 'Permitido', 'Permitido'],
  ['Equipes', 'Permitido', 'Permitido', 'Permitido'],
  ['Empresas', 'Permitido', 'Permitido', 'Permitido'],
  ['Desafios', 'Permitido', 'Permitido', 'Permitido'],
  ['Setores', 'Todos', 'Consulta', 'Autorizados'],
  ['Modo Evento', 'Permitido', 'Permitido', 'Permitido'],
  ['Painel de Resultados', 'Permitido', 'Permitido', 'Consulta'],
  ['Reuniões e Atas', 'Permitido', 'Permitido', 'Permitido'],
  ['Documentos', 'Permitido', 'Permitido', 'Permitido'],
  ['Relatórios', 'Permitido', 'Permitido', 'Consulta'],
  ['Usuários e Permissões', 'Permitido', 'Sem acesso', 'Sem acesso'],
  ['Auditoria', 'Permitido', 'Sem acesso', 'Sem acesso'],
]

const emptyUser = { name: '', email: '', profile: 'Editor', status: 'Ativo', sector: '', sectors: [], role: '', password: '' }

const { state, update, flash } = useHack()
const admin = computed(() => state.session?.profile === 'Administrador')
const tab = ref(props.params.aba || 'hackathon')
const dated = ref(Boolean(state.event.date))
const form = ref({ ...state.event })
const modal = ref(null)
const user = ref({ ...emptyUser })
const query = ref('')
const profile = ref('Todos')
const showPassword = ref(false)

const visible = computed(() => state.users.filter((item) => {
  const text = `${item.name} ${item.email}`.toLowerCase().includes(query.value.toLowerCase())
  return text && (profile.value === 'Todos' || item.profile === profile.value)
}))

function saveEvent(event) {
  event.preventDefault()
  update((draft) => { draft.event = { ...draft.event, ...form.value, date: dated.value ? form.value.date : '', days: 3, start: '08:00', end: '12:00' } })
  flash('Alterações da configuração salvas neste navegador.')
}

function openCreate() {
  user.value = { ...emptyUser, sectors: [] }
  showPassword.value = false
  modal.value = 'user'
}

function openEdit(item) {
  user.value = { ...item, password: '', sectors: [...(item.sectors || [])] }
  showPassword.value = false
  modal.value = 'user'
}

function saveUser(event) {
  event?.preventDefault?.()
  const password = (user.value.password || '').trim()
  if (!user.value.name.trim() || !user.value.email.trim() || !user.value.sector || !user.value.role.trim()) {
    flash('Preencha nome, e-mail, setor e função.', 'err')
    return
  }
  if (!user.value.id && password.length < 4) {
    flash('Cadastre uma senha com pelo menos 4 caracteres.', 'err')
    return
  }
  if (user.value.id && password && password.length < 4) {
    flash('A nova senha precisa ter pelo menos 4 caracteres.', 'err')
    return
  }
  update((draft) => {
    const sectors = user.value.profile === 'Editor'
      ? (user.value.sectors?.length ? user.value.sectors : [user.value.sector])
      : (user.value.sectors || [])
    if (user.value.id) {
      const index = draft.users.findIndex((item) => item.id === user.value.id)
      if (index >= 0) {
        const current = draft.users[index]
        draft.users[index] = { ...current, ...user.value, name: user.value.name.trim(), email: user.value.email.trim(), sectors, password: password || current.password || '' }
      }
    } else {
      draft.users.push({ ...user.value, id: uid('usr'), name: user.value.name.trim(), email: user.value.email.trim(), sectors, password })
    }
  })
  modal.value = null
  flash(user.value.id ? 'Alterações do usuário salvas.' : 'Usuário cadastrado.')
}

function toggleSector(item) {
  const on = user.value.sectors?.includes(item)
  user.value = { ...user.value, sectors: on ? user.value.sectors.filter((sector) => sector !== item) : [...(user.value.sectors || []), item] }
}
</script>

<template>
  <Page crumbs="HackLab / Organização / Configuração do Hackathon" title="Configuração do Hackathon" subtitle="Defina as principais informações utilizadas na organização do evento.">
    <Tabs :tabs="[{ id: 'hackathon', label: 'Hackathon' }, { id: 'usuarios', label: 'Usuários e Permissões' }]" :model-value="tab" @update:model-value="tab = $event" />
    <form v-if="tab === 'hackathon'" @submit="saveEvent">
      <section class="card form-section">
        <h3>Informações gerais</h3>
        <div class="form-grid">
          <Field label="Nome" required><input v-model="form.name" class="input" /></Field>
          <Field label="Tema" hint="Opcional."><input v-model="form.theme" class="input" placeholder="Informe o tema" /></Field>
          <Field label="Descrição" class-name="span-2"><textarea v-model="form.description" class="input" placeholder="Descreva brevemente o Hackathon." /></Field>
          <Field label="Local"><input v-model="form.location" class="input" /></Field>
        </div>
      </section>
      <section class="card form-section">
        <h3>Data e horário</h3>
        <label class="check">
          <input type="checkbox" :checked="!dated" @change="dated = !$event.target.checked; if ($event.target.checked) form.date = ''" />
          Data ainda não definida
        </label>
        <Field v-if="dated" label="Data"><input v-model="form.date" class="input" type="date" /></Field>
        <p v-else class="banner">A definir</p>
        <div class="grid cols-3 mt">
          <div><span class="stat-hint">Duração</span><p><b>3 dias</b></p></div>
          <div><span class="stat-hint">Início</span><p><b>08:00</b></p></div>
          <div><span class="stat-hint">Término</span><p><b>12:00</b></p></div>
        </div>
      </section>
      <section class="card form-section">
        <h3>Estrutura do evento</h3>
        <div class="day-cards">
          <div class="day-card"><b>Dia 1</b>Abertura e formação.</div>
          <div class="day-card"><b>Dia 2</b>Desenvolvimento.</div>
          <div class="day-card"><b>Dia 3</b>Apresentações e resultados.</div>
        </div>
      </section>
      <div class="page-actions" style="margin-top: 12px">
        <button type="button" class="btn ghost" @click="form = { ...state.event }; dated = Boolean(state.event.date)">Cancelar</button>
        <button class="btn" type="submit" :disabled="!admin">Salvar alterações</button>
      </div>
      <p v-if="!admin" class="stat-hint">Este perfil consulta a configuração. Só o Administrador salva alterações.</p>
    </form>
    <div v-else>
      <div class="page-actions" style="margin-bottom: 12px">
        <button class="btn ghost" type="button" @click="modal = 'matriz'">Ver matriz de acesso</button>
        <button v-if="admin" class="btn" type="button" @click="openCreate">Novo usuário</button>
        <Badge v-else>Consulta</Badge>
      </div>
      <div class="filters">
        <input v-model="query" class="input" placeholder="Buscar usuário" />
        <select v-model="profile" class="input">
          <option v-for="item in ['Todos', 'Administrador', 'Consultor', 'Editor']" :key="item">{{ item }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Setor</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-for="item in visible" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.email }}</td>
              <td>{{ item.profile }}</td>
              <td>{{ item.sector }}</td>
              <td>{{ item.role }}</td>
              <td><Badge :tone="toneFor(item.status)">{{ item.status }}</Badge></td>
              <td>
                <button class="btn ghost small" type="button" @click="user = { ...item }; modal = 'detalhe'">Ver</button>
                <button v-if="admin" class="btn ghost small" type="button" @click="openEdit(item)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="stat-hint">{{ visible.length }} registros · dados salvos neste navegador</p>
    </div>

    <Modal v-if="modal === 'matriz'" title="Matriz de acesso" subtitle="Representação visual da estrutura geral de acesso. As permissões detalhadas serão definidas nas specs de cada módulo." wide @close="modal = null">
      <div class="table-wrap">
        <table class="matrix">
          <thead><tr><th>Módulo</th><th>Administrador</th><th>Consultor</th><th>Editor</th></tr></thead>
          <tbody>
            <tr v-for="row in MATRIX" :key="row[0]">
              <td v-for="(cell, index) in row" :key="`${row[0]}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn" type="button" @click="modal = null">Fechar</button></template>
    </Modal>

    <Modal v-if="modal === 'user'" :title="user.id ? 'Editar usuário' : 'Novo usuário'" subtitle="Administrador, Consultor ou Editor." @close="modal = null">
      <div class="form-grid">
        <Field label="Nome completo" required><input v-model="user.name" class="input" /></Field>
        <Field label="E-mail" required><input v-model="user.email" class="input" /></Field>
        <Field label="Perfil de acesso" required>
          <select v-model="user.profile" class="input">
            <option v-for="item in ['Administrador', 'Consultor', 'Editor']" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Status">
          <select v-model="user.status" class="input"><option>Ativo</option><option>Inativo</option></select>
        </Field>
        <Field label="Setor" required hint="Setor principal de atuação.">
          <select v-model="user.sector" class="input">
            <option value="">Selecione</option>
            <option v-for="item in ['Gestão Geral', 'Acompanhamento', ...SETORES]" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Função" required hint="Função exercida no Hackathon (independente do perfil)."><input v-model="user.role" class="input" placeholder="Ex.: Apoio técnico" /></Field>
        <Field :label="user.id ? 'Nova senha' : 'Senha'" :required="!user.id" class-name="span-2" :hint="user.id ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 4 caracteres. Fica salva só neste navegador.'">
          <div class="input-icon">
            <Icon name="lock" :size="16" />
            <input v-model="user.password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" />
            <button type="button" class="eye" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword"><Icon name="eye" :size="16" /></button>
          </div>
        </Field>
        <Field v-if="user.profile === 'Editor'" label="Setores permitidos" class-name="span-2" hint="Selecione um ou mais setores em que este Editor poderá trabalhar.">
          <div class="chips">
            <button v-for="item in SETORES" :key="item" type="button" class="chip" :class="{ on: user.sectors?.includes(item) }" @click="toggleSector(item)">{{ item }}</button>
          </div>
        </Field>
      </div>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
        <button class="btn" type="button" @click="saveUser">{{ user.id ? 'Salvar alterações' : 'Cadastrar usuário' }}</button>
      </template>
    </Modal>

    <Modal v-if="modal === 'detalhe'" title="Detalhes do usuário" :subtitle="user.email" @close="modal = null">
      <p><b>Nome</b> {{ user.name }}<br /><b>Perfil</b> {{ user.profile }}<br /><b>Setor</b> {{ user.sector }}<br /><b>Função</b> {{ user.role }}<br /><b>Status</b> <Badge :tone="toneFor(user.status)">{{ user.status }}</Badge></p>
      <p v-if="user.status === 'Inativo'">Este usuário não tem acesso ao HackLab enquanto estiver inativo.</p>
      <button v-if="admin && user.status === 'Ativo'" class="btn danger small" type="button" @click="modal = 'off'">Desativar usuário</button>
      <button v-if="admin && user.status === 'Inativo'" class="btn small" type="button" @click="update((draft) => { const found = draft.users.find((item) => item.id === user.id); if (found) found.status = 'Ativo' }); user = { ...user, status: 'Ativo' }; flash('Usuário ativado.'); modal = 'detalhe'">Ativar usuário</button>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Fechar</button>
        <button v-if="admin" class="btn" type="button" @click="openEdit(user)">Editar usuário</button>
      </template>
    </Modal>

    <Modal v-if="modal === 'off'" title="Desativar usuário?" subtitle="Este usuário deixará de ter acesso ao HackLab, mas suas informações permanecerão registradas." @close="modal = 'detalhe'">
      <p>{{ user.name }} fica inativo e não consegue entrar no HackLab. O cadastro continua na lista.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = 'detalhe'">Cancelar</button>
        <button class="btn danger" type="button" @click="update((draft) => { const found = draft.users.find((item) => item.id === user.id); if (found) found.status = 'Inativo' }); user = { ...user, status: 'Inativo' }; flash('Usuário desativado.'); modal = null">Desativar</button>
      </template>
    </Modal>
  </Page>
</template>
