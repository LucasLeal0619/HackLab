<script setup>
import { computed, ref } from 'vue'
import { PROFILE_NAMES, profileConfig } from '../access'
import { SETORES, uid } from '../model'
import { useHack } from '../store'
import Badge from '../components/Badge.vue'
import Field from '../components/Field.vue'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import Page from '../components/Page.vue'
import { toneFor } from '../components/tone'

defineProps({
  section: { type: String, default: 'evento' },
})

// Matriz demonstrativa: Administrador, Consultor, Editor, Validador, Jurado, Votante.
const MATRIX = [
  ['Dashboard', 'Permitido', 'Permitido', 'Do setor', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Evento (configuração)', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Participantes e Equipes', 'Permitido', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Empresas e Desafios', 'Permitido', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Setores', 'Todos', 'Todos', 'Atribuídos', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Reuniões', 'Permitido', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Pendências, Ocorrências e Documentos', 'Todos', 'Todos', 'Do setor', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Ingressos e Presença', 'Permitido', 'Permitido', 'Sem acesso', 'Permitido', 'Sem acesso', 'Sem acesso'],
  ['Jurados e Votação (gestão)', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Avaliações', 'Permitido', 'Consulta', 'Sem acesso', 'Sem acesso', 'Próprias', 'Sem acesso'],
  ['Resultados', 'Permitido', 'Consulta', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Votação do Público', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Votar'],
  ['Relatórios', 'Permitido', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
  ['Usuários e Permissões', 'Permitido', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso', 'Sem acesso'],
]

// Campos do cadastro que cada perfil usa (perfil, setor e função são independentes).
const USER_FIELDS = {
  Administrador: { sector: false, role: true, roleHint: 'Ex.: Equipe de TI', company: false },
  Consultor: { sector: 'optional', role: true, roleHint: 'Ex.: Professor / Coordenação', company: false },
  Editor: { sector: 'required', role: true, roleHint: 'Ex.: Líder do setor, Registro audiovisual', company: false },
  Validador: { sector: false, role: true, roleHint: 'Ex.: Check-in / Controle de acesso', company: false },
  Jurado: { sector: false, role: true, roleHint: 'Ex.: Representante da empresa', company: true },
  Votante: { sector: false, role: false, roleHint: '', company: false },
}

const emptyUser = { name: '', email: '', profile: 'Editor', status: 'Ativo', sector: '', sectors: [], role: '', companyId: '', password: '' }

const { state, update, flash } = useHack()
const admin = computed(() => state.session?.profile === 'Administrador')
const dated = ref(Boolean(state.event.date))
const form = ref({ ...state.event })
const modal = ref(null)
const user = ref({ ...emptyUser })
const query = ref('')
const profile = ref('Todos')
const showPassword = ref(false)
const fields = computed(() => USER_FIELDS[user.value.profile] || USER_FIELDS.Administrador)

function scopeLabel(item) {
  const sectors = item.profile === 'Editor' ? (item.sectors?.length ? item.sectors : [item.sector]).filter(Boolean).join(', ') : item.sector
  const company = item.profile === 'Jurado' ? state.companies.find((entry) => entry.id === item.companyId)?.name : ''
  return [sectors, company, item.role].filter(Boolean).join(' · ') || '—'
}

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
  if (!user.value.name.trim() || !user.value.email.trim()) {
    flash('Preencha nome e e-mail.', 'err')
    return
  }
  if (fields.value.sector === 'required' && !(user.value.sectors?.length)) {
    flash('Selecione ao menos um setor para o Editor.', 'err')
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
    const sectors = user.value.profile === 'Editor' ? [...user.value.sectors] : []
    if (user.value.profile === 'Editor') user.value.sector = sectors[0]
    if (!fields.value.sector) user.value.sector = ''
    if (!fields.value.role) user.value.role = ''
    if (!fields.value.company) user.value.companyId = ''
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
  <Page
    :title="section === 'usuarios' ? 'Usuários e Permissões' : 'Evento'"
    :subtitle="section === 'usuarios' ? 'Cadastre usuários e consulte a matriz de acesso demonstrativa.' : 'Configure as informações gerais do Hackathon.'"
  >
    <form v-if="section !== 'usuarios'" @submit="saveEvent">
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
          <option v-for="item in ['Todos', ...PROFILE_NAMES]" :key="item">{{ item }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Setor/Função</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            <tr v-for="item in visible" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.email }}</td>
              <td>{{ item.profile }}</td>
              <td>{{ scopeLabel(item) }}</td>
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
          <thead><tr><th>Módulo</th><th v-for="name in PROFILE_NAMES" :key="name">{{ name }}</th></tr></thead>
          <tbody>
            <tr v-for="row in MATRIX" :key="row[0]">
              <td v-for="(cell, index) in row" :key="`${row[0]}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn" type="button" @click="modal = null">Fechar</button></template>
    </Modal>

    <Modal v-if="modal === 'user'" :title="user.id ? 'Editar usuário' : 'Novo usuário'" :subtitle="profileConfig(user.profile).represents" @close="modal = null">
      <div class="form-grid">
        <Field label="Nome completo" required><input v-model="user.name" class="input" /></Field>
        <Field label="E-mail" required><input v-model="user.email" class="input" /></Field>
        <Field label="Perfil de acesso" required>
          <select v-model="user.profile" class="input">
            <option v-for="item in PROFILE_NAMES" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field label="Status">
          <select v-model="user.status" class="input"><option>Ativo</option><option>Inativo</option></select>
        </Field>
        <Field v-if="fields.sector === 'optional'" label="Setor" hint="Opcional para Consultor.">
          <select v-model="user.sector" class="input">
            <option value="">Nenhum</option>
            <option v-for="item in ['Acompanhamento', ...SETORES]" :key="item">{{ item }}</option>
          </select>
        </Field>
        <Field v-if="fields.company" label="Empresa / representação" hint="Relaciona o jurado a uma empresa cadastrada.">
          <select v-model="user.companyId" class="input">
            <option value="">Nenhuma</option>
            <option v-for="item in state.companies" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </Field>
        <Field v-if="fields.role" label="Função" hint="Função exercida no Hackathon (independente do perfil)."><input v-model="user.role" class="input" :placeholder="fields.roleHint" /></Field>
        <Field :label="user.id ? 'Nova senha' : 'Senha'" :required="!user.id" class-name="span-2" :hint="user.id ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 4 caracteres. Fica salva só neste navegador.'">
          <div class="input-icon">
            <Icon name="lock" :size="16" />
            <input v-model="user.password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" />
            <button type="button" class="eye" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword"><Icon name="eye" :size="16" /></button>
          </div>
        </Field>
        <div v-if="fields.sector === 'required'" class="field span-2">
          <span>Setores atribuídos<em>*</em></span>
          <small class="stat-hint">O Editor enxerga apenas estes setores. Liderar um setor não torna o usuário Administrador.</small>
          <div class="chips">
            <button v-for="item in SETORES" :key="item" type="button" class="chip" :class="{ on: user.sectors?.includes(item) }" @click="toggleSector(item)">{{ item }}</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn ghost" type="button" @click="modal = null">Cancelar</button>
        <button class="btn" type="button" @click="saveUser">{{ user.id ? 'Salvar alterações' : 'Cadastrar usuário' }}</button>
      </template>
    </Modal>

    <Modal v-if="modal === 'detalhe'" title="Detalhes do usuário" :subtitle="user.email" @close="modal = null">
      <p><b>Nome</b> {{ user.name }}<br /><b>Perfil</b> {{ user.profile }}<br /><b>Setor/Função</b> {{ scopeLabel(user) }}<br /><b>Status</b> <Badge :tone="toneFor(user.status)">{{ user.status }}</Badge></p>
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
