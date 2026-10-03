<script setup>
// ProfileSwitcher é apenas uma ferramenta de simulação do protótipo.
// Posteriormente será substituído por autenticação e autorização reais.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { PROFILE_NAMES, profileConfig, sectorScope } from '../access'
import { SETORES } from '../model'
import { go, useHack } from '../store'
import Icon from './Icon.vue'

const hack = useHack()
const open = ref(false)
const root = ref(null)
const session = computed(() => hack.state.session)
const config = computed(() => profileConfig(session.value?.profile))
const activeSector = computed(() => sectorScope(session.value)?.[0] || '')

function choose(profile) {
  open.value = false
  if (profile !== session.value?.profile) hack.setProfile(profile)
}

function chooseSector(sector) {
  hack.setDemoSector(sector)
  open.value = false
  go(`setores?setor=${encodeURIComponent(sector)}`)
}

function run(action) {
  open.value = false
  action()
}

function onPointer(event) {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false
}

function onKey(event) {
  if (open.value && event.key === 'Escape') open.value = false
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
  <div ref="root" class="tool profile-tool">
    <button class="user-btn" type="button" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <span class="avatar"><Icon name="users" :size="16" /></span>
      <span class="user-meta">
        <b>{{ session?.name || 'Usuário' }}</b>
        <span><span class="status-dot" /> {{ session?.profile }}</span>
      </span>
    </button>
    <div v-if="open" class="profile-back" aria-hidden="true" @click="open = false" />
    <div v-if="open" class="popover profile-menu" role="dialog" aria-label="Meu perfil">
      <div class="row-between"><h3>Meu perfil</h3><button class="icon-btn" type="button" aria-label="Fechar" title="Fechar" @click="open = false"><Icon name="x" :size="16" /></button></div>
      <p class="profile-who"><b>{{ session?.name }}</b><span>{{ session?.email }}</span></p>
      <p class="profile-current"><span>Perfil atual</span><b>{{ session?.profile }}</b><small>{{ config.represents }}</small></p>
      <p class="stat-hint">Protótipo: selecione um perfil para visualizar sua experiência no HackLab.</p>
      <div class="profile-grid" role="group" aria-label="Perfis de acesso">
        <button v-for="name in PROFILE_NAMES" :key="name" type="button" class="profile-option" :class="{ on: session?.profile === name }" :aria-pressed="session?.profile === name" @click="choose(name)">{{ name }}</button>
      </div>
      <template v-if="config.sectorScoped">
        <p class="profile-label">Setor demonstrativo</p>
        <div class="chips">
          <button v-for="name in SETORES" :key="name" type="button" class="chip" :class="{ on: activeSector === name }" @click="chooseSector(name)">{{ name }}</button>
        </div>
      </template>
      <div class="menu-list">
        <template v-if="config.globalAdmin">
          <button type="button" @click="run(() => go('config'))">Configuração do evento</button>
          <button type="button" @click="run(hack.loadDemo)">Dados demonstrativos</button>
          <button type="button" @click="run(hack.resetAll)">Limpar dados do protótipo</button>
        </template>
        <button type="button" @click="run(hack.logout)"><Icon name="logout" :size="16" /> Sair</button>
      </div>
    </div>
  </div>
</template>
