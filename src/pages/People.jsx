import { useEffect, useMemo, useState } from 'react'
import { availabilityOf, isAvailable, teamName, TURMAS, uid } from '../model'
import { go, useHack } from '../store'
import { Badge, Empty, Field, Modal, Page } from '../ui'

const blank = { name: '', turma: '', email: '', matricula: '', note: '', availability: 'Disponível' }

export default function People() {
  const { state, update, flash } = useHack()
  const [query, setQuery] = useState('')
  const [turma, setTurma] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('Todas')
  const [equipe, setEquipe] = useState('Todas')
  const [askConfirm, setAskConfirm] = useState(false)
  const [askReopen, setAskReopen] = useState(false)
  const [modal, setModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [menu, setMenu] = useState('')
  const [removing, setRemoving] = useState(null)
  const [form, setForm] = useState(blank)

  const placedIds = useMemo(() => {
    const ids = new Set()
    state.teams.forEach((team) => {
      if (team.members.length) team.members.forEach((id) => ids.add(id))
    })
    return ids
  }, [state.teams])

  function teamOf(id) {
    return state.teams.find((team) => team.members.includes(id))
  }

  useEffect(() => {
    if (!menu) return undefined
    function close() { setMenu('') }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const rows = state.students.filter((student) => {
    const matches = student.name.toLowerCase().includes(query.toLowerCase())
    const turmaOk = turma === 'Todas' || student.turma === turma
    const statusOk = statusFilter === 'Todas' || availabilityOf(student) === statusFilter
    const team = teamOf(student.id)
    const equipeOk = equipe === 'Todas' || (equipe === 'Sem equipe' && !team) || (team && teamName(team.id) === equipe)
    return matches && turmaOk && statusOk && equipeOk
  })

  function openCreate() {
    setForm(blank)
    setModal(true)
  }

  function save(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.turma) {
      flash('Informe o nome e a turma.', 'err')
      return
    }
    update((draft) => {
      if (form.id) {
        const index = draft.students.findIndex((item) => item.id === form.id)
        if (index >= 0) draft.students[index] = { ...draft.students[index], ...form, name: form.name.trim(), availability: form.availability || 'Disponível' }
      } else {
        draft.students.push({ ...form, id: uid('alu'), name: form.name.trim(), availability: form.availability || 'Disponível' })
      }
    })
    const previous = form.id ? state.students.find((student) => student.id === form.id) : null
    const leaving = previous && isAvailable(previous) && (form.availability || 'Disponível') !== 'Disponível' && teamOf(form.id)
    setModal(false)
    setForm(blank)
    flash(leaving
      ? 'A composição das equipes foi alterada porque um participante ficou indisponível.'
      : (form.id ? 'Participante atualizado.' : 'Participante cadastrado.'))
  }

  function removeStudent() {
    if (!removing) return
    update((draft) => {
      draft.students = draft.students.filter((item) => item.id !== removing.id)
      draft.teams.forEach((team) => {
        if (!team.members.includes(removing.id)) return
        team.members = team.members.filter((id) => id !== removing.id)
        team.status = team.members.length ? 'em-montagem' : 'nao-formada'
      })
      draft.checkins = draft.checkins.filter((item) => item.personId !== removing.id)
    })
    setRemoving(null)
    setViewing(null)
    setMenu('')
    flash('Participante excluído.')
  }

  function setAvailability(student, availability) {
    const leaving = isAvailable(student) && availability !== 'Disponível' && teamOf(student.id)
    update((draft) => {
      const current = draft.students.find((item) => item.id === student.id)
      if (current) current.availability = availability
    })
    setMenu('')
    flash(leaving
      ? 'A composição das equipes foi alterada porque um participante ficou indisponível.'
      : 'Situação do participante atualizada.')
  }

  function confirmList() {
    if (!state.students.some(isAvailable)) {
      flash('Cadastre ao menos um participante disponível antes de confirmar a lista.', 'err')
      return
    }
    update((draft) => { draft.participantsConfirmed = true })
    setAskConfirm(false)
    flash('Lista de participantes confirmada.')
  }

  function reopenList() {
    update((draft) => { draft.participantsConfirmed = false })
    setAskReopen(false)
    flash('Lista de participantes reaberta.')
  }

  const registered = state.students.length

  return (
    <Page
      crumbs="HackLab / Organização / Participantes"
      title="Participantes"
      subtitle="Gerencie os participantes do Hackathon."
      actions={(
        <>
          {state.participantsConfirmed
            ? <button className="btn ghost" type="button" onClick={() => setAskReopen(true)}>Reabrir participantes</button>
            : <button className="btn ghost" type="button" onClick={() => setAskConfirm(true)}>Confirmar participantes</button>}
          <button className="btn" type="button" onClick={openCreate}>+ Cadastrar participante</button>
        </>
      )}
    >
      <div className="grid cols-4">
        <article className="card stat"><div className="stat-label">Total cadastrados</div><div className="stat-value">{registered}</div></article>
        {TURMAS.map((item) => (
          <article className="card stat" key={item.id}>
            <div className="stat-label">{item.id}</div>
            <div className="stat-value">{state.students.filter((student) => student.turma === item.id).length}</div>
          </article>
        ))}
      </div>

      <div className="filters mt">
        <input className="input" placeholder="Buscar participante" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar participante" />
        <select className="input" aria-label="Turma" value={turma} onChange={(event) => setTurma(event.target.value)}>
          <option value="Todas">Turma</option>
          {TURMAS.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
        </select>
        <select className="input" aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="Todas">Status</option>
          <option>Disponível</option>
          <option>Indisponível</option>
          <option>Desistente</option>
        </select>
        <select className="input" aria-label="Equipe" value={equipe} onChange={(event) => setEquipe(event.target.value)}>
          <option value="Todas">Equipe</option>
          <option>Sem equipe</option>
          {state.teams.map((team) => <option key={team.id}>{teamName(team.id)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Participante</th><th>Turma</th><th>Equipe</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {state.students.length === 0 ? (
              <tr><td colSpan={5}><Empty title="Nenhum participante cadastrado ainda." text="Cadastre os participantes para começar a formação das equipes." action={<button className="btn" onClick={openCreate}>+ Cadastrar participante</button>} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5}><Empty title="Nenhum participante encontrado" text="Ajuste a busca ou limpe os filtros." action={<button className="btn ghost" onClick={() => { setQuery(''); setTurma('Todas'); setEquipe('Todas'); setStatusFilter('Todas') }}>Limpar filtros</button>} /></td></tr>
            ) : rows.map((student) => {
              const team = teamOf(student.id)
              const availability = availabilityOf(student)
              const note = availability === 'Disponível'
                ? (placedIds.has(student.id) ? 'Pode participar e já está em uma equipe.' : 'Pode participar normalmente.')
                : availability === 'Indisponível'
                  ? 'Está cadastrado, mas não participará naquele momento.'
                  : 'Não participará mais do Hackathon.'
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.turma}</td>
                  <td>{team ? teamName(team.id) : '—'}</td>
                  <td><Badge tone={availability === 'Disponível' ? 'ok' : availability === 'Desistente' ? 'danger' : 'warn'}>{availability}</Badge><br /><small>{note}</small></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost small" onClick={() => setViewing(student)}>Visualizar</button>
                      <button className="btn ghost small" onClick={() => { setForm({ ...blank, ...student, availability: availabilityOf(student) }); setModal(true) }}>Editar</button>
                      <button className="btn ghost small" onClick={() => { setMenu(''); setRemoving(student) }}>Excluir</button>
                      <span className="row-menu">
                        <button className="btn ghost small" title="Mais opções" aria-label="Mais opções" onMouseDown={(event) => event.stopPropagation()} onClick={() => setMenu(menu === student.id ? '' : student.id)}>⋯</button>
                        {menu === student.id ? (
                          <div className="menu-pop" onMouseDown={(event) => event.stopPropagation()}>
                            {team ? <button type="button" onClick={() => go(`montar?id=${team.id}`)}>Abrir equipe</button> : <button type="button" onClick={() => go('preparacao?aba=equipes')}>Ver equipes</button>}
                            {availability !== 'Disponível' ? <button type="button" onClick={() => setAvailability(student, 'Disponível')}>Marcar como disponível</button> : null}
                            {availability !== 'Indisponível' ? <button type="button" onClick={() => setAvailability(student, 'Indisponível')}>Marcar como indisponível</button> : null}
                            {availability !== 'Desistente' ? <button type="button" onClick={() => setAvailability(student, 'Desistente')}>Marcar como desistente</button> : null}
                          </div>
                        ) : null}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {registered ? <p className="stat-hint">{registered === 1 ? '1 participante cadastrado' : `${registered} participantes cadastrados`}{state.participantsConfirmed ? ' · Lista confirmada' : ''}</p> : null}

      {modal ? (
        <Modal title={form.id ? 'Editar participante' : 'Cadastrar participante'} subtitle="Nome e turma são suficientes para a formação das equipes." onClose={() => setModal(false)} footer={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn" onClick={save}>{form.id ? 'Salvar alterações' : 'Cadastrar participante'}</button></>}>
          <Field label="Nome completo" required><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Turma" required>
            <select className="input" value={form.turma} onChange={(event) => setForm({ ...form, turma: event.target.value })}>
              <option value="">Selecione a turma</option>
              {TURMAS.map((item) => <option key={item.id} value={item.id}>{item.professor}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Matrícula" hint="Opcional"><input className="input" value={form.matricula || ''} onChange={(event) => setForm({ ...form, matricula: event.target.value })} /></Field>
            <Field label="E-mail" hint="Opcional"><input className="input" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Observação" className="span-2"><input className="input" value={form.note || ''} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
          </div>
          <Field label="Situação">
            <select className="input" value={form.availability || 'Disponível'} onChange={(event) => setForm({ ...form, availability: event.target.value })}>
              <option>Disponível</option>
              <option>Indisponível</option>
              <option>Desistente</option>
            </select>
          </Field>
        </Modal>
      ) : null}

      {viewing ? (
        <Modal title={viewing.name} subtitle={availabilityOf(viewing)} onClose={() => setViewing(null)} footer={<><button className="btn ghost" onClick={() => setViewing(null)}>Fechar</button><button className="btn" onClick={() => { setForm({ ...blank, ...viewing, availability: availabilityOf(viewing) }); setViewing(null); setModal(true) }}>Editar</button></>}>
          <p><b>Turma</b> {viewing.turma}</p>
          <p><b>Situação</b> {availabilityOf(viewing)}</p>
          <p><b>Equipe</b> {teamOf(viewing.id) ? teamName(teamOf(viewing.id).id) : 'Ainda sem equipe.'}</p>
          <p><b>Matrícula</b> {viewing.matricula || '—'}</p>
          <p><b>E-mail</b> {viewing.email || '—'}</p>
          <p><b>Observação</b> {viewing.note || '—'}</p>
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          title="Excluir participante?"
          subtitle={teamOf(removing.id) ? `${removing.name} sai da ${teamName(teamOf(removing.id).id)} e o cadastro é removido deste navegador.` : 'O cadastro será removido deste navegador.'}
          onClose={() => setRemoving(null)}
          footer={<><button className="btn ghost" type="button" onClick={() => setRemoving(null)}>Cancelar</button><button className="btn danger" type="button" onClick={removeStudent}>Excluir</button></>}
        >
          <p>{removing.name} · {removing.turma}</p>
        </Modal>
      ) : null}

      {askConfirm ? (
        <Modal title="Confirmar participantes?" subtitle="Confirme que a lista atual representa as pessoas que participarão da formação das equipes." onClose={() => setAskConfirm(false)} footer={<><button className="btn ghost" type="button" onClick={() => setAskConfirm(false)}>Cancelar</button><button className="btn" type="button" onClick={confirmList}>Confirmar participantes</button></>}>
          <p>{state.students.filter(isAvailable).length} disponíveis para a formação. Quem estiver indisponível ou desistente continua no cadastro, mas não entra nas equipes.</p>
        </Modal>
      ) : null}

      {askReopen ? (
        <Modal title="Reabrir participantes?" subtitle={state.teams.length ? 'Alterações nos participantes podem afetar as equipes já formadas.' : 'A lista volta a ficar em aberto.'} onClose={() => setAskReopen(false)} footer={<><button className="btn ghost" type="button" onClick={() => setAskReopen(false)}>Cancelar</button><button className="btn" type="button" onClick={reopenList}>Reabrir participantes</button></>}>
          <p>A alteração não reorganiza as equipes sozinha.</p>
        </Modal>
      ) : null}
    </Page>
  )
}
