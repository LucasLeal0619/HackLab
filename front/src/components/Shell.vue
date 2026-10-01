<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { navActive, navFor, navParent } from '../model'
import { go, useHack } from '../store'
import Field from './Field.vue'
import Icon from './Icon.vue'
import Logo from './Logo.vue'
import Modal from './Modal.vue'

const props = defineProps({
  path: { type: String, default: '' },
})

const hack = useHack()
const open = ref(false)
const panel = ref('')
const expanded = ref([])

function isOpen(id) {
  return expanded.value.includes(id)
}

function toggleGroup(id) {
  expanded.value = isOpen(id) ? expanded.value.filter((item) => item !== id) : [...expanded.value, id]
}

const session = computed(() => hack.state.session)
const alertCount = computed(() => (
  hack.state.tasks.filter((item) => item.status !== 'Concluído').length
  + hack.state.occurrences.filter((item) => item.status !== 'Resolvida').length
))

const alertItems = computed(() => [
  ...hack.state.equipment.filter((item) => item.status === 'Com problema').map((item) => `Equipamento com problema · ${item.name} · ${item.place}`),
  ...hack.state.occurrences.filter((item) => item.priority === 'Urgente' && item.status !== 'Resolvida').map((item) => `Ocorrência urgente · ${item.title} · ${item.place}`),
  ...hack.state.occurrences.filter((item) => item.status !== 'Resolvida' && /sala|estrutura|material/i.test(`${item.category} ${item.place}`) && item.priority !== 'Urgente').map((item) => `Sala com problema · ${item.title} · ${item.place || '—'}`),
  ...(hack.state.students.length && hack.state.students.some((student) => !hack.state.checkins.some((item) => item.personId === student.id && item.status === 'Presente'))
    ? [`Presença pendente · ${hack.state.students.filter((student) => !hack.state.checkins.some((item) => item.personId === student.id && item.status === 'Presente')).length} participante(s) sem registro`]
    : []),
  ...hack.state.tasks.filter((item) => item.status !== 'Concluído').map((item) => `Pendência · ${item.title}`),
])

const spacingOptions = [['padrao', 'Padrão'], ['confortavel', 'Confortável'], ['amplo', 'Amplo']]

watch(() => props.path, (path) => {
  panel.value = ''
  open.value = false
  const parent = navParent(path)
  if (parent && !expanded.value.includes(parent)) expanded.value = [...expanded.value, parent]
}, { immediate: true })

function onPointer(event) {
  if (!panel.value) return
  if (event.target.closest('.top-tools')) return
  panel.value = ''
}

function onKey(event) {
  if (panel.value && event.key === 'Escape') panel.value = ''
}

onMounted(() => {
  document.addEventListener('mousedown', onPointer)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onPointer)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="shell">
    <a class="skip" href="#conteudo">Ir para o conteúdo</a>
    <aside class="sidebar" :class="{ open }">
      <div class="side-brand"><Logo /></div>
      <div v-for="group in navFor(session?.profile)" :key="group.group" class="nav-group">
        <p class="nav-label">{{ group.group }}</p>
        <template v-for="item in group.items" :key="item.id">
          <button
            v-if="item.children"
            type="button"
            class="nav-item"
            :class="{ open: isOpen(item.id), 'group-on': navParent(path) === item.id }"
            :aria-expanded="isOpen(item.id)"
            @click="toggleGroup(item.id)"
          >
            <Icon :name="item.icon" />
            <span>{{ item.label }}</span>
            <Icon class="nav-caret" name="chevron" :size="16" />
          </button>
          <div v-if="item.children" class="nav-sub" :class="{ open: isOpen(item.id) }" :aria-hidden="isOpen(item.id) ? undefined : 'true'">
            <button
              v-for="child in item.children"
              :key="child.id"
              type="button"
              class="nav-item nav-child"
              :class="{ active: navActive(child.id, path) }"
              :tabindex="isOpen(item.id) ? 0 : -1"
              :aria-current="navActive(child.id, path) ? 'page' : undefined"
              @click="go(child.id); open = false; panel = ''"
            >
              {{ child.label }}
            </button>
          </div>
          <button
            v-else
            type="button"
            class="nav-item"
            :class="{ active: navActive(item.id, path) }"
            :aria-current="navActive(item.id, path) ? 'page' : undefined"
            @click="go(item.id); open = false; panel = ''"
          >
            <Icon :name="item.icon" /> {{ item.label }}
          </button>
        </template>
      </div>
      <div class="side-foot">Protótipo local · dados neste navegador</div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button class="icon-btn menu-btn" type="button" aria-label="Abrir menu" title="Abrir menu" @click="open = !open"><Icon name="grid" /></button>
        <div class="top-tools">
          <span v-if="hack.state.demo" class="demo-badge">Modo demonstração</span>
          <div class="tool">
            <button class="icon-btn" type="button" aria-label="Alertas" title="Alertas" @click="panel = panel === 'alerts' ? '' : 'alerts'">
              <Icon name="bell" />
              <span v-if="alertCount > 0" class="dot" />
            </button>
            <div v-if="panel === 'alerts'" class="popover" role="dialog" aria-label="Alertas">
              <div class="row-between"><h3>Alertas</h3><button class="icon-btn" type="button" aria-label="Fechar" title="Fechar" @click="panel = ''"><Icon name="x" :size="16" /></button></div>
              <p v-if="alertItems.length === 0" class="stat-hint">Tudo certo! Nenhum alerta no momento.</p>
              <div v-else class="menu-list">
                <p v-for="item in alertItems" :key="item">{{ item }}</p>
              </div>
              <button class="btn ghost small" type="button" @click="panel = ''; go('pendencias')">Ver pendências</button>
            </div>
          </div>
          <div class="tool">
            <button class="a11y-btn" type="button" @click="panel = panel === 'a11y' ? '' : 'a11y'"><Icon name="access" :size="16" /> Acessibilidade</button>
            <div v-if="panel === 'a11y'" class="popover" role="dialog" aria-label="Acessibilidade">
              <div class="row-between"><h3>Acessibilidade</h3><button class="icon-btn" type="button" aria-label="Fechar" title="Fechar" @click="panel = ''"><Icon name="x" :size="16" /></button></div>
              <Field label="Tamanho da fonte" hint="Aumentar ou diminuir o texto">
                <div class="row-between">
                  <button class="btn ghost small" type="button" @click="hack.setA11y({ scale: Math.max(90, hack.state.a11y.scale - 10) })">A−</button>
                  <strong>{{ hack.state.a11y.scale }}%</strong>
                  <button class="btn ghost small" type="button" @click="hack.setA11y({ scale: Math.min(140, hack.state.a11y.scale + 10) })">A+</button>
                </div>
              </Field>
              <label class="check"><input type="checkbox" :checked="hack.state.a11y.contrast" @change="hack.setA11y({ contrast: $event.target.checked })" /> Alto contraste</label>
              <label class="check"><input type="checkbox" :checked="hack.state.a11y.focus" @change="hack.setA11y({ focus: $event.target.checked })" /> Destacar foco</label>
              <label class="check"><input type="checkbox" :checked="hack.state.a11y.motion" @change="hack.setA11y({ motion: $event.target.checked })" /> Reduzir animações</label>
              <Field label="Ajustar espaçamento">
                <div class="chips">
                  <button v-for="[id, label] in spacingOptions" :key="id" type="button" class="chip" :class="{ on: hack.state.a11y.spacing === id }" @click="hack.setA11y({ spacing: id })">{{ label }}</button>
                </div>
              </Field>
              <button class="btn ghost small" type="button" @click="hack.resetA11y()">Restaurar padrão</button>
            </div>
          </div>
          <div class="tool">
            <button class="user-btn" type="button" @click="panel = panel === 'user' ? '' : 'user'">
              <span class="avatar"><Icon name="users" :size="16" /></span>
              <span class="user-meta">
                <b>{{ session?.name || 'Usuário' }}</b>
                <span><span class="status-dot" /> {{ session?.profile }}</span>
              </span>
            </button>
            <div v-if="panel === 'user'" class="popover" role="menu">
              <div class="row-between"><h3>Meu perfil</h3><button class="icon-btn" type="button" aria-label="Fechar" title="Fechar" @click="panel = ''"><Icon name="x" :size="16" /></button></div>
              <p class="stat-hint">{{ session?.email }}<br />{{ session?.sector }} · {{ session?.role }}</p>
              <p class="stat-hint">Protótipo: clique em um perfil de acesso para ver a regra visual.</p>
              <div class="chips">
                <button v-for="profile in ['Administrador', 'Consultor', 'Editor']" :key="profile" type="button" class="chip" :class="{ on: session?.profile === profile }" @click="hack.setProfile(profile)">{{ profile }}</button>
              </div>
              <div class="menu-list">
                <button v-if="session?.profile !== 'Editor'" type="button" @click="panel = ''; go('config')">Configuração do evento</button>
                <button type="button" @click="hack.loadDemo()">Dados demonstrativos</button>
                <button type="button" @click="hack.resetAll()">Limpar dados do protótipo</button>
                <button type="button" @click="hack.logout()"><Icon name="logout" :size="16" /> Sair</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main id="conteudo" class="content"><slot /></main>
    </div>
    <Modal
      v-if="hack.state.session && !hack.state.welcome"
      title="Como deseja explorar o HackLab?"
      subtitle="Você pode carregar um cenário demonstrativo para conhecer todas as áreas do protótipo ou começar com os dados vazios."
      @close="hack.update((draft) => { draft.welcome = 'vazio' })"
    >
      <p>O cenário demonstrativo fica neste navegador e pode ser carregado de novo em Perfil, Dados demonstrativos.</p>
      <template #footer>
        <button class="btn ghost" type="button" @click="hack.update((draft) => { draft.welcome = 'vazio' })">Começar vazio</button>
        <button class="btn" type="button" @click="hack.loadDemo()">Explorar com dados demonstrativos</button>
      </template>
    </Modal>
  </div>
</template>
