<script lang="ts">
  import { app } from '../stores'
  import { findRpg, findChar, getSections, calcFormulas, slotsUsed, canManage, canEditChar, canTouch, pct, fmt, fmtDateTime, initials, equipBonuses, starOf, equipAccStars, equipSlots } from '../utils'
  import type { ItemBonuses } from '../utils'
  import { CAT_LABELS, EQUIP_SLOT_LABELS, EQUIP_SLOT_CATS, MAX_EQUIP_STARS } from '../constants'
  import AttrControl from '../components/AttrControl.svelte'
  import SkillControl from '../components/SkillControl.svelte'
  import Empty from '../components/Empty.svelte'
  import Icon from '../components/Icon.svelte'
  import { send } from '../socket'
  import { pushToast } from '../stores'

  let { rpgId, charId }: { rpgId: string; charId: string } = $props()
  let st = $derived($app)
  let rpg = $derived($app && findRpg(rpgId))
  let c = $derived($app && findChar(charId))

  let secs = $derived(rpg ? getSections(rpg?.schema?.sections) : [])
  let attrs = $derived((rpg?.schema?.attrs || []).filter((a: any) => a.active !== false))
  let skills: any[] = $derived((rpg?.schema?.skills || []).filter((s: any) => s.active !== false))
  let formulas = $derived(rpg && c ? calcFormulas(rpg, c) : [])
  let skillsByCat = $derived(
    skills.reduce<Record<string, any[]>>((m, sk: any) => {
      const cat = sk.cat || 'Geral'
      ;(m[cat] = m[cat] || []).push(sk)
      return m
    }, {})
  )
  let enSec = $derived(secs.filter((s: any) => s.enabled !== false))

  let eqBon = $derived<ItemBonuses>(rpg && c ? equipBonuses(rpg, c) : { DANO: 0, VIDA: 0, MANA: 0, ESFORÇO: 0, DEFESA: 0 })

  let slots = $derived(c ? slotsUsed(c, rpg) : 0)
  let cap = $derived(c?.capacity || 10)

  let notesDraft = $state(c?.notes || '')
  let notesDirty = false
  let notesTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    if (!notesDirty) notesDraft = c?.notes || ''
  })

  function notesInput(e: Event) {
    notesDirty = true
    notesDraft = (e.currentTarget as HTMLTextAreaElement).value
    if (notesTimer) clearTimeout(notesTimer)
    notesTimer = setTimeout(flushNotes, 500)
  }
  function flushNotes() {
    if (!c || !notesDirty) return
    notesDirty = false
    if (notesTimer) { clearTimeout(notesTimer); notesTimer = undefined }
    send({ type: 'updateCharacter', charId, patch: { notes: notesDraft } })
  }

  function setAttrsQuick(attr: any, val: any) {
    send({ type: 'setAttrVal', charId, attrId: attr.id, value: val })
  }

  let buffKey = $state<string | null>(null)
  let buffVal = $state('')
  let buffBase = $state(0)

  function formulaKey(f: any) { return (f.name || '').trim().toUpperCase() }
  function formulaBon(f: any): number { return Number(c?.formulaBuffs?.[formulaKey(f)]) || 0 }
  function formulaEquip(f: any): number { return Number(eqBon?.[formulaKey(f) as keyof ItemBonuses]) || 0 }
  function formulaTot(f: any): number { return Math.max(0, (Number(f.value) || 0) + formulaBon(f) + formulaEquip(f)) }
  function canEditFormula() { return canTouch(c) }

  function openBuff(f: any) {
    if (!canEditFormula()) return
    buffKey = formulaKey(f)
    buffBase = Number(f.value) || 0
    const b = formulaBon(f)
    buffVal = b === 0 ? '' : String(b)
  }
  function adjustBuff(d: number) {
    buffVal = String((Number(buffVal) || 0) + d)
  }
  function saveBuff() {
    const n = Math.floor(Number(buffVal) || 0)
    send({ type: 'setFormulaBuff', charId, name: buffKey, value: n })
    pushToast(n === 0 ? 'Bônus removido.' : `Bônus de ${buffKey} registrado.`)
    buffKey = null
  }

  function classOf() {
    const cls = (rpg?.schema?.classes || []).find((x: any) => x.id === c?.classId)
    return cls?.name || c?.classId || ''
  }

  function catOf(item: any): string {
    const ci = (rpg?.catalog || []).find((x: any) => x.id === item.src)
    return ci ? CAT_LABELS[ci.category] || ci.category : ''
  }
  function invItemCat(item: any) {
    return catOf(item)
  }

  function equipCat(itemId: string) {
    const item = (c?.inventory || []).find((i: any) => i.id === itemId)
    if (!item) return ''
    const ci = (rpg?.catalog || []).find((x: any) => x.id === item.src)
    return ci?.category || ''
  }
  function slotEquips(slot: string) {
    const entryId = c?.equipment?.[slot]
    if (!entryId) return null
    return (c?.inventory || []).find((i: any) => i.id === entryId) || null
  }
  function toggleEquip(slot: string, itemId: string) {
    if (c?.equipment?.[slot] === itemId) send({ type: 'unequip', charId, slot })
    else send({ type: 'setEquip', charId, slot, entryId: itemId })
  }

  let eqStars = $derived(equipAccStars(c, rpg))

  function canGiveBack(item: any) { return canManage() }

  let giveOpen = $state(false)
  let giveMode = $state<'cat' | 'free'>('cat')
  let giveCatId = $state('')
  let giveName = $state('')
  let giveQty = $state('1')
  let givePerSlot = $state('')
  function giveSubmit() {
    const qty = Math.max(1, Math.floor(Number(giveQty) || 1))
    if (giveMode === 'cat') {
      if (!giveCatId) { pushToast('Escolha um item do catálogo.', 'err'); return }
      send({ type: 'giveItem', charId, itemId: giveCatId, qty })
    } else {
      if (!giveName.trim()) { pushToast('Dê um nome ao item.', 'err'); return }
      send({ type: 'addItem', charId, name: giveName.trim(), qty, perSlot: Math.max(0.01, Number(givePerSlot) || 1) })
    }
    pushToast(`${qty}× ${giveMode === 'cat' ? 'item' : giveName.trim()} adicionado à mochila.`)
    giveOpen = false
  }

  let spr = $state<null | 'add' | 'edit'>(null)
  let sprId = $state('')
  let sprName = $state('')
  let sprCost = $state('')
  let sprDesc = $state('')
  function openSpell(sp?: any) {
    spr = sp ? 'edit' : 'add'
    sprId = sp?.id || ''
    sprName = sp?.name || ''
    sprCost = sp?.cost || ''
    sprDesc = sp?.description || ''
  }
  function canTouchSp(sp: any) { return canTouch(c, sp?.ownerId) }
  function saveSpell() {
    if (!sprName.trim()) { pushToast('Dê um nome à magia.', 'err'); return }
    if (spr === 'edit') send({ type: 'updateSpell', charId, spellId: sprId, name: sprName.trim(), cost: sprCost.trim(), description: sprDesc.trim() })
    else send({ type: 'addSpell', charId, name: sprName.trim(), cost: sprCost.trim(), description: sprDesc.trim() })
    pushToast(spr === 'edit' ? 'Magia atualizada.' : 'Magia adicionada.')
    spr = null
  }

  let runeForm = $state<null | 'add' | 'edit'>(null)
  let runeId = $state('')
  let runeName = $state('')
  let runeCircle = $state('')
  let runeDesc = $state('')
  function openRune(ru?: any) {
    runeForm = ru ? 'edit' : 'add'
    runeId = ru?.id || ''
    runeName = ru?.name || ''
    runeCircle = ru?.circle || ''
    runeDesc = ru?.description || ''
  }
  function canTouchRu(ru: any) { return canTouch(c, ru?.ownerId) }
  function saveRune() {
    if (!runeName.trim()) { pushToast('Dê um nome à runa.', 'err'); return }
    if (runeForm === 'edit') send({ type: 'updateRune', charId, runeId, name: runeName.trim(), circle: runeCircle.trim(), description: runeDesc.trim() })
    else send({ type: 'addRune', charId, name: runeName.trim(), circle: runeCircle.trim(), description: runeDesc.trim() })
    pushToast(runeForm === 'edit' ? 'Runa atualizada.' : 'Runa adicionada.')
    runeForm = null
  }

  function citIcon(it: any) {
    const ci = (rpg?.catalog || []).find((x: any) => x.id === it.src)
    if (!ci) return 'bag'
    if (['arma', 'cajado'].includes(ci.category)) return 'sword'
    if (ci.category === 'armadura' || ci.category === 'escudo') return 'shield'
    if (ci.category === 'grimorio') return 'sparkles'
    if (ci.category === 'consumivel') return 'gift'
    return 'bag'
  }
</script>

<svelte:head><title>Ficha</title></svelte:head>

{#if c && rpg}
  <div class="hero">
    <div class="avatar"><span class="av-inner">{#if c.photo}<img src={c.photo} alt="" />{:else}{initials(c.name)}{/if}</span></div>
    <div class="hero-info">
      <h1>{c.name}</h1>
      <div class="sub">{c.player || 'Sem jogador'}{c.ident ? ` · ${c.ident}` : ''}{classOf() ? ` · ${classOf()}` : ''}</div>
      {#if c.isMonster}
        <div class="m-meta">
          <span class="m-chip">MONSTRO</span>
          {#if c.monster?.desafio}<span class="m-chip alt">⚔ Desafio {c.monster.desafio}</span>{/if}
          {#if c.monster?.tipo}<span class="m-chip">{c.monster.tipo}</span>{/if}
          {#if c.monster?.habitat}<span class="m-chip">{c.monster.habitat}</span>{/if}
        </div>
      {/if}
      <div class="hero-badges">
        {#if c.cash != null}<span class="badge gold"><Icon name="cash" size={12} /> {c.cash.toLocaleString?.('pt-BR') || c.cash}</span>{/if}
        {#if formulas.length}
          {#each formulas as f (f.name)}
            <span
              class="badge formula"
              class:boost={formulaBon(f) !== 0}
              class:edit={canEditFormula()}
              role={canEditFormula() ? 'button' : undefined}
              tabindex={canEditFormula() ? 0 : undefined}
              onclick={() => openBuff(f)}
              onkeydown={(e) => { if (canEditFormula() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBuff(f) } }}
            >
              <b>{f.name}:</b> {formulaTot(f)}
              {#if formulaEquip(f) !== 0}<span class="bon" title="Bônus de itens equipados">{formulaEquip(f) > 0 ? '+' + formulaEquip(f) : formulaEquip(f)}</span>{/if}
              {#if formulaBon(f) !== 0}<span class="bon" title="Bônus manual">{formulaBon(f) > 0 ? '+' + formulaBon(f) : formulaBon(f)}</span>{/if}
              {#if canEditFormula()}<Icon name="plus" size={10} />{/if}
            </span>
          {/each}
        {/if}
        {#if eqBon.DANO}<span class="badge formula" title="Dano por itens equipados"><b>Dano:</b> {eqBon.DANO}</span>{/if}
        <span class="badge" class:full={c.status !== 'ativo'}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
      </div>
    </div>
  </div>

  <div class="shell-grid">
    <div class="col">
      {#each enSec as s (s.id)}
        {#if s.id === 'atributos'}
          <section class="card">
            <div class="card-head"><Icon name="dash" size={15} /> {s.label}</div>
            {#if attrs.length}
              <div class="attr-grid">
                {#each attrs as a (a.id)}
                  <div class="attr">
                    <span class="attr-name" title={a.desc || a.name}>{a.name}</span>
                    <AttrControl {c} attr={a} editable={canManage() || (a.type === 'number' && canEditChar(c))} />
                  </div>
                {/each}
              </div>
            {:else}
              <span class="muted">Sem atributos</span>
            {/if}
          </section>

        {:else if s.id === 'pericias'}
          <section class="card">
            <div class="card-head"><Icon name="sheets" size={15} /> {s.label}</div>
            {#each Object.entries(skillsByCat) as [cat, list] (cat)}
              <div class="cat-label">{cat}</div>
              <div class="skill-list">
                {#each list as sk (sk.id)}
                  <div class="skill-row">
                    <span class="skill-name">{sk.name}{#if sk.desc}<span class="skill-tag">{sk.desc}</span>{/if}</span>
                    <SkillControl {c} {sk} editable={canEditChar(c)} />
                  </div>
                {/each}
              </div>
            {/each}
            {#if !skills.length}<span class="muted">Sem perícias</span>{/if}
          </section>

        {:else if s.id === 'camposlivres' || s.type === 'custom'}
          <section class="card">
            <div class="card-head"><Icon name="pencil" size={15} /> {s.label}</div>
            {#if s.type === 'custom' && s.definition?.length}
              {#each s.definition as f (f.id)}
                <label class="field">
                  <span class="fname">{f.name}</span>
                  {#if f.editable && canEditChar(c)}
                    <input class="a-input" value={c.customSections?.[s.id]?.[f.id] || ''} onchange={(e) => send({ type: 'setCustomField', charId, sectionId: s.id, fieldId: f.id, value: e.currentTarget.value })} />
                  {:else}
                    <div class="fview">{c.customSections?.[s.id]?.[f.id] || '—'}</div>
                  {/if}
                </label>
              {/each}
            {:else}
              {#each (c.customAttrs || []) as ca (ca.id)}
                <div class="field"><span class="fname">{ca.name}</span><div class="fview">{ca.value || '—'}</div></div>
              {/each}
              {#if !(c.customAttrs || []).length}<span class="muted">Sem campos livres</span>{/if}
            {/if}
          </section>
        {/if}
      {/each}
    </div>

    <div class="col">
      {#each enSec as s (s.id)}
        {#if s.id === 'inventario'}
          <section class="card">
            <div class="card-head"><Icon name="bag" size={15} /> {s.label}{#if canManage()}<button type="button" class="btn-primary sm" onclick={() => (giveOpen = true)}><Icon name="plus" size={13} /> Adicionar</button>{/if}</div>
            <div class="cap-row">
              <div class="cap"><Icon name="bag" size={12} /> {fmt(slots)}/{cap} slots</div>
              <div class="bar"><div class="fill" class:full={pct(slots, cap) >= 100} class:warn={pct(slots, cap) >= 80 && pct(slots, cap) < 100} style="width:{pct(slots, cap)}%"></div></div>
            </div>
            {#if c.inventory?.length}
              <div class="inv-list">
                {#each c.inventory as it (it.id)}
                  <div class="inv-row">
                    <div class="inv-ic"><Icon name={it.src ? citIcon(it) : 'bag'} size={15} /></div>
                    <div class="inv-info">
                      <div class="inv-name">{it.name}</div>
                      <div class="inv-sub">{invItemCat(it)} · {fmt(it.qty)} un · {it.effect || ''}</div>
                    </div>
                    <button type="button" class="grow-btn" disabled={!canGiveBack(it)} title="Devolver ao estoque" onclick={() => send({ type: 'returnItem', charId, itemId: it.id })}>
                      <Icon name="up" size={15} />
                    </button>
                  </div>
                {/each}
              </div>
            {:else}
              <span class="muted">Mochila vazia</span>
            {/if}
          </section>

        {:else if s.id === 'equipamento'}
          <section class="card">
            <div class="card-head"><Icon name="shield" size={15} /> {s.label}
              {#if rpg?.equipStars}
                <span class="eq-stars" class:over={eqStars > MAX_EQUIP_STARS} title="Estrelas gastas em acessórios">★ {eqStars}/{MAX_EQUIP_STARS}</span>
              {/if}
            </div>
            <div class="equip-list">
              {#each equipSlots(rpg) as slot (slot)}
                {@const eq = slotEquips(slot)}
                <div class="equip-row">
                  <span class="slot-name">{EQUIP_SLOT_LABELS[slot]}</span>
                  {#if eq}
                    <span class="eq-item">{eq.name}{#if starOf(eq, rpg)} <span class="stars">{'★'.repeat(starOf(eq, rpg))}</span>{/if}</span>
                    {#if canEditChar(c)}
                      <button type="button" class="icon-sm" title="Desequipar" onclick={() => send({ type: 'unequip', charId, slot })}><Icon name="x" size={13} /></button>
                    {/if}
                  {:else if canEditChar(c)}
                    <select class="a-input sel mini" value="" onchange={(e) => { const id = e.currentTarget.value; if (id) toggleEquip(slot, id) }}>
                      <option value="">— equipar —</option>
                      {#each (c.inventory || []).filter((i: any) => EQUIP_SLOT_CATS[slot].includes(equipCat(i.id))) as i (i.id)}
                        <option value={i.id}>{i.name}{starOf(i, rpg) ? ` ★${starOf(i, rpg)}` : ''}</option>
                      {/each}
                    </select>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </div>
              {/each}
            </div>
            <p class="hint">Cajados e grimórios contam como armas (duas simultâneas). O escudo ocupa a mão secundária.{#if rpg?.equipStars} Acessórios: no máximo {MAX_EQUIP_STARS} estrelas no total (ex.: um ★3, ou ★2 + ★1, ou três ★1).{/if}</p>
          </section>

        {:else if s.id === 'magias'}
          <section class="card">
            <div class="card-head"><Icon name="sparkles" size={15} /> {s.label}</div>
            {#if c.spells?.length}
              <div class="spell-list">
                {#each c.spells as sp (sp.id)}
                  <div class="spell">
                    <div class="spell-top">
                      <span class="spell-name">{sp.name}</span>
                      {#if sp.cost}<span class="spell-cost">{sp.cost}</span>{/if}
                      {#if canTouchSp(sp)}
                        <span class="sp-acts">
                          <button type="button" class="icon-xx" title="Editar" onclick={() => openSpell(sp)}><Icon name="pencil" size={13} /></button>
                          <button type="button" class="icon-xx red" title="Excluir" onclick={() => { if (confirm('Excluir esta magia?')) send({ type: 'removeSpell', charId, spellId: sp.id }) }}><Icon name="trash" size={13} /></button>
                        </span>
                      {/if}
                    </div>
                    {#if sp.description}<div class="spell-desc">{sp.description}</div>{/if}
                  </div>
                {/each}
              </div>
            {:else}
              <span class="muted">Sem magias</span>
            {/if}
            {#if canEditChar(c)}<button type="button" class="btn-primary sm block" onclick={() => openSpell()}><Icon name="plus" size={13} /> Nova magia</button>{/if}
          </section>

        {:else if s.id === 'runas'}
          <section class="card">
            <div class="card-head"><Icon name="rune" size={15} /> {s.label}</div>
            {#if c.runes?.length}
              <div class="rune-list">
                {#each c.runes as ru (ru.id)}
                  <div class="rune">
                    <div class="spell-top">
                      <span class="rune-name">{ru.name}</span>
                      {#if ru.circle}<span class="rune-circle">{ru.circle}</span>{/if}
                      {#if canTouchRu(ru)}
                        <span class="sp-acts">
                          <button type="button" class="icon-xx" title="Editar" onclick={() => openRune(ru)}><Icon name="pencil" size={13} /></button>
                          <button type="button" class="icon-xx red" title="Excluir" onclick={() => { if (confirm('Excluir esta runa?')) send({ type: 'removeRune', charId, runeId: ru.id }) }}><Icon name="trash" size={13} /></button>
                        </span>
                      {/if}
                    </div>
                    {#if ru.description}<div class="rune-desc">{ru.description}</div>{/if}
                  </div>
                {/each}
              </div>
            {:else}
              <span class="muted">Sem runas</span>
            {/if}
            {#if canEditChar(c)}<button type="button" class="btn-primary sm block" onclick={() => openRune()}><Icon name="plus" size={13} /> Adicionar runa</button>{/if}
          </section>

        {:else if s.id === 'anotacoes'}
          <section class="card">
            <div class="card-head"><Icon name="pencil" size={15} /> {s.label}</div>
            {#if canEditChar(c)}
              <textarea class="a-long" rows="4" value={notesDraft} oninput={notesInput} onblur={flushNotes}></textarea>
            {:else}
              <div class="a-longview">{c.notes || '—'}</div>
            {/if}
          </section>

        {:else if s.id === 'historico'}
          <section class="card">
            <div class="card-head"><Icon name="history" size={15} /> {s.label}</div>
            {#if (st.movements || []).filter((m: any) => m.charId === charId).length}
              {#each (st.movements || []).filter((m: any) => m.charId === charId).slice(-6).reverse() as mv (mv.id)}
                <div class="his-row">
                  <span class="his-item">{mv.itemName}</span>
                  {#if mv.type === 'saida'}×{mv.qty} {/if}
                  <span class="his-meta">{mv.type} · {fmtDateTime(mv.at)}</span>
                </div>
              {/each}
            {:else}
              <span class="muted">Sem histórico</span>
            {/if}
          </section>
        {/if}
      {/each}
    </div>
  </div>

  {#if !enSec.filter((x: any) => ['atributos','pericias','camposlivres','inventario','equipamento','magias','runas','anotacoes','historico'].includes(x.id) || x.type === 'custom').length}
    <span class="muted">Ficha sem seções habilitadas.</span>
  {/if}

  {#if giveOpen && rpg}
    <div class="overlay" onclick={() => (giveOpen = false)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); giveSubmit() }}>
        <div class="modal-head"><h3>Adicionar itens à mochila</h3><button type="button" class="icon-close" onclick={() => (giveOpen = false)}><Icon name="x" size={16} /></button></div>
        <div class="tabs">
          <button type="button" class="tab" class:on={giveMode === 'cat'} onclick={() => (giveMode = 'cat')}>Catálogo</button>
          <button type="button" class="tab" class:on={giveMode === 'free'} onclick={() => (giveMode = 'free')}>Item livre</button>
        </div>
        {#if giveMode === 'cat'}
          <label class="field">Item <span class="req">*</span>
            <select bind:value={giveCatId}>
              <option value="">— escolher —</option>
              {#each rpg.catalog || [] as it (it.id)}
                <option value={it.id}>{it.name}{it.category === 'acessorio' && it.stars ? ` ★${Math.min(3, Math.max(1, Number(it.stars) || 1))}` : ''} · {it.qty} disp.</option>
              {/each}
            </select>
          </label>
        {:else}
          <label class="field">Nome do item <span class="req">*</span>
            <input bind:value={giveName} placeholder="Ex.: Poção de cura" />
          </label>
          <div class="form-row">
            <label class="field">Espaço por unidade<input type="number" bind:value={givePerSlot} min="0.01" step="0.01" placeholder="1" /></label>
          </div>
        {/if}
        <label class="field">Quantidade
          <input type="number" bind:value={giveQty} min="1" step="1" />
        </label>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (giveOpen = false)}>Cancelar</button>
          <button type="submit" class="btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  {/if}

  {#if spr}
    <div class="overlay" onclick={() => (spr = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveSpell() }}>
        <div class="modal-head"><h3>{spr === 'edit' ? 'Editar' : 'Nova'} magia</h3><button type="button" class="icon-close" onclick={() => (spr = null)}><Icon name="x" size={16} /></button></div>
        <label class="field">Nome <span class="req">*</span>
          <input bind:value={sprName} placeholder="Ex.: Bola de Fogo" />
        </label>
        <label class="field">Custo
          <input bind:value={sprCost} placeholder="2 PM" />
        </label>
        <label class="field">Descrição
          <textarea rows="4" bind:value={sprDesc}></textarea>
        </label>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (spr = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  {/if}

  {#if runeForm}
    <div class="overlay" onclick={() => (runeForm = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveRune() }}>
        <div class="modal-head"><h3>{runeForm === 'edit' ? 'Editar' : 'Nova'} runa</h3><button type="button" class="icon-close" onclick={() => (runeForm = null)}><Icon name="x" size={16} /></button></div>
        <label class="field">Nome <span class="req">*</span>
          <input bind:value={runeName} placeholder="Ex.: Runa de Fogo" />
        </label>
        <label class="field">Círculo
          <input bind:value={runeCircle} placeholder="1º Círculo" />
        </label>
        <label class="field">Descrição
          <textarea rows="4" bind:value={runeDesc}></textarea>
        </label>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (runeForm = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  {/if}

  {#if buffKey && c && rpg}
    <div class="overlay" onclick={() => (buffKey = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveBuff() }}>
        <div class="modal-head"><h3>Bônus — {buffKey}</h3><button type="button" class="icon-close" onclick={() => (buffKey = null)}><Icon name="x" size={16} /></button></div>
        <p class="hint">Aplica um bônus (buff) somado ao valor calculado de {buffKey}. Use 0 para remover.</p>
        <label class="field">Bônus <span class="req">*</span>
          <input type="number" bind:value={buffVal} placeholder="0" />
        </label>
        <div class="quick">
          {#each [5, 10, 25, 50] as q (q)}<button type="button" class="chip-btn" onclick={() => adjustBuff(q)}>+{q}</button>{/each}
          <button type="button" class="chip-btn" onclick={() => adjustBuff(-5)}>-5</button>
          <button type="button" class="chip-btn" onclick={() => (buffVal = '')}>0</button>
        </div>
        <div class="tot">Base: <b>{buffBase}</b> · Total: <b>{Math.max(0, buffBase + (Number(buffVal) || 0))}</b></div>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (buffKey = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">Salvar bônus</button>
        </div>
      </form>
    </div>
  {/if}
{:else}
  <Empty message="Personagem não encontrado" icon="alert" />
{/if}

<style>
  .hero { display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, var(--card-2), var(--card)); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow-md); }
  .avatar { width: 68px; height: 68px; flex-shrink: 0; background: linear-gradient(135deg, var(--accent2), var(--accent)); clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%); display: grid; place-items: center; }
  .av-inner { width: 58px; height: 58px; clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%); background: var(--card); display: grid; place-items: center; font-weight: 900; font-size: 1.5rem; color: var(--gold); overflow: hidden; }
  .av-inner img { width: 100%; height: 100%; object-fit: cover; }
  .hero-info h1 { margin: 0; font-size: 1.4rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .hero-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .m-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .m-chip {
    background: color-mix(in srgb, var(--red, #c1453f) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--red, #c1453f) 40%, transparent);
    color: var(--red, #c1453f);
    font-size: 0.68rem; font-weight: 800; letter-spacing: 0.04em;
    padding: 3px 9px; border-radius: 999px; text-transform: uppercase;
  }
  .m-chip.alt { color: var(--gold); border-color: var(--line); background: var(--card-2); }
  .badge { display: inline-flex; align-items: center; gap: 4px; background: var(--card-2); border: 1px solid var(--line); color: var(--ink-soft); font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; }
  .badge.gold { color: var(--gold); font-weight: 800; }
  .badge.full { color: var(--red,#c1453f); }
  .badge.formula { color: var(--ink); font-weight: 700; }
  .badge.formula.edit { cursor: pointer; }
  .badge.formula.edit:hover { border-color: var(--accent, var(--gold)); }
  .badge.formula.boost { border-style: dashed; border-color: var(--gold); }
  .bon { color: var(--gold); font-weight: 800; }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip-btn { border: 1px solid var(--line); background: var(--card-2); color: var(--ink); border-radius: 999px; padding: 5px 12px; cursor: pointer; font-weight: 700; font-family: inherit; font-size: 0.8rem; }
  .chip-btn:hover { border-color: var(--gold); color: var(--gold); }
  .tot { margin-top: 12px; color: var(--ink-soft); font-size: 0.85rem; }
  .shell-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; }
  .col { display: grid; gap: 12px; align-content: start; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: var(--shadow-sm); }
  .card-head { display: flex; align-items: center; gap: 7px; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 0.95rem; color: var(--gold); margin-bottom: 12px; }
  .attr-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .attr { display: flex; align-items: center; gap: 10px; }
  .attr-name { flex: 1; min-width: 0; font-weight: 700; font-size: 0.9rem; color: var(--ink); }
  .attr :global(.a-input) { width: 72px; }
  .cat-label { color: var(--ink-soft); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin: 10px 0 4px; }
  .skill-list { display: grid; gap: 6px; }
  .skill-row { display: flex; align-items: center; gap: 8px; }
  .skill-name { flex: 1; font-weight: 600; font-size: 0.88rem; color: var(--ink); }
  .skill-tag { margin-left: 6px; color: var(--gold); font-size: 0.64rem; font-weight: 800; border: 1px solid var(--line); background: var(--card-2); border-radius: 999px; padding: 1px 7px; letter-spacing: 0.03em; white-space: nowrap; }
  .field { display: grid; gap: 4px; margin-bottom: 10px; }
  .fname { font-size: 0.72rem; font-weight: 800; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
  .fview { color: var(--ink); font-size: 0.9rem; }
  .cap-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .cap { font-size: 0.78rem; color: var(--ink-soft); font-weight: 700; white-space: nowrap; }
  .bar { flex: 1; height: 8px; background: var(--track); border-radius: 999px; overflow: hidden; }
  .fill { height: 100%; background: var(--green,#4a9e7a); }
  .fill.warn { background: var(--gold,#c9a55a); }
  .fill.full { background: var(--red,#c1453f); }
  .inv-list { display: grid; gap: 6px; }
  .inv-row { display: flex; align-items: center; gap: 10px; background: var(--card-2); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
  .inv-ic { color: var(--gold); }
  .inv-info { flex: 1; min-width: 0; }
  .inv-name { font-weight: 700; font-size: 0.88rem; color: var(--ink); }
  .inv-sub { color: var(--ink-soft); font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grow-btn { width: 34px; height: 34px; border: 1px solid var(--line); background: var(--card); color: var(--green,#4a9e7a); border-radius: 8px; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
  .grow-btn:disabled { opacity: 0.35; cursor: default; }
  .equip-list { display: grid; gap: 6px; }
  .equip-row { display: flex; align-items: center; gap: 8px; }
  .slot-name { width: 96px; font-size: 0.78rem; font-weight: 700; color: var(--ink-soft); }
  .eq-item { flex: 1; color: var(--gold); font-weight: 700; font-size: 0.88rem; }
  .eq-stars { margin-left: auto; font-family: inherit; font-size: 0.75rem; color: var(--gold); font-weight: 800; }
  .eq-stars.over { color: var(--red, #c1453f); }
  .stars { color: var(--gold); letter-spacing: 0.05em; font-weight: 800; }
  .icon-sm { width: 30px; height: 30px; border: 1px solid var(--line); background: var(--card); color: var(--ink-soft); border-radius: 7px; cursor: pointer; display: grid; place-items: center; }
  .a-input.sel.mini { flex: 1; min-height: 32px; padding: 4px 8px; font-size: 0.8rem; }
  .spell-list, .rune-list { display: grid; gap: 8px; }
  .spell, .rune { background: var(--card-2); border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
  .spell-top { display: flex; align-items: center; gap: 8px; }
  .spell-name, .rune-name { font-weight: 800; color: var(--ink); }
  .spell-cost, .rune-circle { color: var(--gold); font-size: 0.72rem; font-weight: 800; margin-left: 2px; }
  .spell-desc, .rune-desc { color: var(--ink-soft); font-size: 0.78rem; margin-top: 3px; }
  .sp-acts { margin-left: auto; display: inline-flex; gap: 4px; }
  .icon-xx { width: 26px; height: 26px; border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink-soft); border-radius: 7px; cursor: pointer; display: grid; place-items: center; }
  .icon-xx.red { color: var(--red,#c1453f); }
  .btn-primary.sm { height: 30px; padding: 0 11px; font-size: 0.74rem; border-radius: 8px; }
  .btn-primary.block { width: 100%; justify-content: center; margin-top: 10px; }
  .card-head .btn-primary { margin-left: auto; }
  .tabs { display: flex; gap: 6px; background: var(--bg-soft); border: 1px solid var(--line); border-radius: 10px; padding: 4px; }
  .tab { flex: 1; border: none; background: none; color: var(--ink-soft); font-weight: 700; font-size: 0.8rem; padding: 8px; border-radius: 7px; cursor: pointer; font-family: inherit; }
  .tab.on { background: var(--card-2); color: var(--gold); }
  .a-long { width: 100%; background: var(--bg-soft); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); padding: 8px; font-family: inherit; resize: vertical; }
  .a-longview { color: var(--ink); font-size: 0.88rem; white-space: pre-wrap; }
  .his-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .his-row:last-child { border-bottom: none; }
  .his-item { font-weight: 700; color: var(--ink); font-size: 0.85rem; }
  .his-meta { color: var(--ink-soft); font-size: 0.7rem; margin-left: auto; }
  .muted { color: var(--ink-soft); font-size: 0.82rem; }

  @media (min-width: 900px) {
    .shell-grid { grid-template-columns: 1fr 1fr; }
    .attr-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
