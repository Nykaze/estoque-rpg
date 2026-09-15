# Estoque RPG

<div align="center">

**🇺🇸 English** · [Português (Brasil) 🇧🇷](README.pt-BR.md)

</div>

> **Full documentation** — from the motivation to the architecture, rules, user manual and deployment.
> Project version: **3.2.0** · Status: **in active use** ("Desajustados" campaign).

---

## 1. The problem (why this project exists)

Tabletop RPG campaigns usually rely on a **paper character sheet, a spreadsheet, and a physical or text-based inventory**, scattered between the game master and the players. This creates a set of well-known pain points:

- **Decentralized inventory**: items, coins, potions and materials live in the game master's head or in loose notes; nobody really knows "how much we have".
- **Outdated character sheets**: attributes, health/mana/effort and equipment live on paper — every change must be "rewritten by hand" and re-synced with the group.
- **Manual calculations**: formulas (health, mana, defense), bonuses from equipped items and skill stat-typing require repeated math every session.
- **Nothing happens in real time**: when the master hands out an item, players don't see their bag change — only on the next refresh or when read out loud.
- **No audit trail**: there is no record of who took what, when and why.

**Estoque RPG** was born to solve exactly that for the campaign's *own rule set* ("Desajustados"): a tool for **real-time inventory, character sheets and equipment**, accessible from any device in the group, with the game master in control and players managing what is theirs.

### The pitch in one sentence

> A "digital inventory and character sheet" for your RPG table: item catalog, individual bags, equipment with mechanical effects, spells/runes, and a movement history — all synced instantly between every player.

---

## 2. Overview

| | |
|---|---|
| **Name** | Estoque RPG (boot screen: "Carregando o Grimório…") |
| **Type** | Web app to support an RPG table (inventory + character sheets) |
| **Audience** | Game master (admin/manager) and players of a specific campaign |
| **Frontend** | Svelte 5 + TypeScript + Vite (SPA with internal routing) |
| **Backend** | Node.js (Express + Socket.IO), single server, single bundle |
| **Persistence** | JSON files (`data.json`, `users.json`, `runas.json`) |
| **Real time** | Socket.IO — every action is validated server-side and re-broadcast to everyone |
| **Auth** | Session (express-session, cookie `estoque.sid`) + bcrypt |
| **Current infra** | Docker on Umbrel, with Tailscale (+ Funnel) for external access |
| **Port** | 3000 (default) |

### Key features

- **RPG tables**: each table has its own item catalog, character schema, rules and character sheets.
- **Digital character sheet** with sections for attributes, skills, custom fields, inventory, equipment, spells & techniques, runes, notes and item history.
- **Central item catalog** with categories, weight, value and effect; stock quantity is **tracked automatically** (what items sit in player bags is deducted from the available total).
- **Audited movements**: entry, exit, return, write-off, removal and clear — with who, when and why (capped at 800 records).
- **Equipment with mechanics**: equipped items **boost attributes/formulas** (Health, Mana, Defense, Effort, Damage).
- **Spells & techniques and Runes** editable per sheet, with add/edit/remove modals.
- **Equipment rules**: main/secondary hand (weapon/staff/grimoire), accessory, shield, armor — with the *shield × secondary-hand weapon* conflict validated on the server.
- **Skills with visible stat-typing** (e.g. `(FOR & AGI)`, `(AGI)`) + a value per sheet.
- **Monster Sheets**: a dedicated tab per table (managers only) — a monster's sheet reuses the full character sheet (attributes, skills, inventory, equipment…) and **players never receive** these sheets or their movements.
- **Star-rated accessories** (optional per table): with the `equipStars` flag the sheet gains 3 accessory slots and the **sum of stars is capped**; badges in the inventory and on the sheet.
- **Notes with autosave**: they save as you type (≈500ms debounce + immediate save when you leave the field) — no text lost when navigating away.
- **6 visual themes**, **mobile-ready** layout (hamburger menu).
- **3 roles**: administrator, manager and player, with distinct permissions.

---

## 3. The challenges

### 3.1 Rules challenges (game design)

The system uses a **custom ruleset** — it is neither D&D nor an off-the-shelf system. Translating the paper rules into structured data was the biggest modeling challenge:

- **Dynamic formulas**: Health/Mana/Defense/Effort derive from attributes using formulas editable per table (e.g. `VIDA = 10 + NIVEL * 5`). The app evaluates the formula and shows the computed result on the sheet.
- **Equipment bonuses in natural language**: effects were written "by hand" into the catalog ("Defesa +1d10", "Dano 1d6", "Recupera +7 de VIDA", "+5 de Espaço"). This required building an **effects parser** (`parseItemBonuses`) that understands the various formats, normalizes accents, converts dice to their average value and maps *ESTAMINA → ESFORÇO*.
- **Equipment rules with exceptions**: two hands, but the shield occupies the secondary one; equipping a weapon in the secondary hand unequips the shield and vice versa; staves/grimoires also occupy a hand. These validations live **on the server**, not just in the UI.
- **Attribute scales**: `level`-type attributes have an NPC scale of 0–10 with "subdivisions" (configurable divisor), used for weapon requirements and formulas.
- **Digitized game content**: a catalog of ~130 items (potions, herbs, accessories, weapons, shields, armors, staves, grimoires) and the **elementary rune combinations** (Fire/Water/Ice/Lightning/Earth/Wood/Wind) were transcribed from rule documents (PDFs) and structured as JSON.

### 3.2 Technical challenges

- **Reliable real time**: every action goes through a single `apply(action, user)` function on the server; on each action the state is **persisted and broadcast to everyone**. This guarantees that any conflict (e.g. two managers equipping the same weapon) is resolved server-side, not client-side.
- **Multi-device at the table**: players use their phones. A genuinely responsive layout was required — not just "shrinking the CSS".
- **Database-free persistence**: data lives in versioned JSON (schema migrations: `migrateOwnership`, section/schema normalization) with atomic file saving.
- **Deploy to Umbrel (home server)**: the app runs inside a **Docker container** with Tailscale embedded — an `entrypoint` starts `tailscaled`, authenticates with an auth key and enables *Funnel* on port 3000 so the group can reach it from outside the local network.
- **Classic production bug**: the frontend sent `itemId` for the `setEquip` action, but the server expected `entryId` — **equipping in the UI never worked until the regression test caught it**. It was fixed and covered by a test.
- **Global vs. local styles**: new screens (Estoque/Ficha) had no styling because modal/button/field components were defined *inside* other screens (e.g. Usuarios/Config). Solution: a global UI kit in `app.css`.
- **Encoding (Windows)**: manipulating JSON/UTF-8 with PowerShell `Set-Content` corrupts accents (e.g. `Poção` → `PoÃ§Ã£o`). Every command that touches files needs encoding care.

---

## 4. Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │             Browser (jogadores)              │
                    │  Svelte 5 SPA · socket.io-client            │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP (login/me) + Socket.IO
                                           ▼
        ┌───────────────────────────────────────────────────────────┐
        │  Node.js (um único bundle: server.js → deploy-app.js)     │
        │                                                            │
        │  express-session  →  cookie estoque.sid  →  io middleware │
        │                                                            │
        │  io.on('action')  →  apply(action, user)  ──►  mutate     │
        │                          │                                 │
        │                          ├── save()        (data.json)    │
        │                          ├── saveUsers()   (users.json)   │
        │                          └── broadcast()   → state p/ todos│
        └───────────────────────────────────────────────────────────┘
                             │
          ├───────────────────┼─────────────────────────┤
     data.json          users.json                runas.json
   (rpgs/chars/movs/  (contas bcrypt)         (runas do sistema)
    catalog/settings)
```

Principles:

1. **The server is the source of truth** — the client never applies an action before validation; everything goes through `apply()`.
2. **Single, broadcast state** — after every action, all sockets receive `state` (filtered per profile).
3. **Per-user view** — `stateFor(user)` only includes the user list for those who can manage; players never see accounts.
4. **One action = persist + broadcast** — no background jobs; the file is the database.

### Stack and versions

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 · TypeScript · Vite 8 · `svelte-check` |
| Backend | Node.js ≥ 16 (container: 20-slim) · Express 4 · Socket.IO 4 |
| Security | bcryptjs · express-session · cookie |
| Build | esbuild (single server bundle) |
| Infra | Docker + docker compose · Tailscale (funnel) · supervisor |
| Deploy utility | PowerShell (Windows): `deploy-umbrel.ps1` |

---

## 5. Data model

Persistence in **JSON** (files in the local root; in production: the `app-data` volume at `/data`).

### `data.json`

```
settings    { systemName }
users       []          // mirror of the accounts (state) — real accounts live in users.json
rpgs        []          // tables
characters  []          // character sheets
movements   []          // movement audit (cap 800)
```

#### `rpg` (table)
- `id`, `name`, `updatedAt`
- `catalog`: stock items (`.id, .name, .category, .description, .weight, .value, .effect, .qty`)
- `schema`: `{ attrs[], skills[], classes[], sections[], rules{ subDivisor }, classLabel }`
- `settings/theme` (table look)
- `equipStars`: enables the star-rated accessory system for the table (3 slots + sum cap)

#### `character` (sheet)
- `id`, `rpgId`, `name`, `status`, `ownerId`, `updatedAt`
- `attrs`: map id → value
- `skills`: map id → value
- `classes`: map id → value
- `custom`: free fields (id → value)
- `inventory[]`: `{ id, name, qty, src (catalog id), category, weight, value, effect, perSlot, note }`
- `equipment`: map slot → bag item id (`mao1, mao2, acessorio, escudo, armadura`; with `equipStars`: `acessorio1..acessorio3`)
- `spells[]`: spells/techniques
- `runes[]`: equipped runes
- `notes`, `formulaBuffs` (temporary buff per formula), `history[]`
- `isMonster` + `monster{ desafio, tipo, habitat }`: monster sheet (manager-restricted access)

### `users.json`
Accounts with `username, name, role (admin|gestor|jogador), active, passHash`.

### Item categories
`consumivel, acessorio, material, combinacao, arma, armadura, cajado, grimorio, escudo, magico`.

---

## 6. Roles and permissions

| Action | admin | manager | player |
|---|---|---|---|
| View tables/sheets/movements | ✅ | ✅ | ✅ |
| Manage item catalog / stock | ✅ | ✅ | ❌ |
| Create/edit/delete anyone's sheets | ✅ | ✅ | ❌ |
| Manage **monster sheets** (Monsters tab) | ✅ | ✅ | ❌ |
| Edit **own sheet** (inventory/equip/spells/runes) | ✅ | ✅ | ✅ (own) |
| Touch another person's bag items | ✅ | ✅ (with owner permission) | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Global settings (theme/title) | ✅ | ❌ | ❌ |

Rules in code (`server.js`):
- `canManage(u)` = `admin || gestor`
- `canEditChar(u, c)` = `canManage(u) || c.ownerId === u.id`
- `canTouchItem(u, c, ownerId)` = `canEditChar`, and for non-managers only items of their own user.

---

## 7. User manual (screens)

Navigation uses **internal routes** (`Dashboard, Mesa, Fichas, Ficha, Estoque, Config, Usuarios, Ajustes`). On mobile the top bar becomes a **hamburger menu**.

### Login
Enter-screen with username/password. Without a valid session the app loads nothing.

### Dashboard (overview)
Lists the tables with a summary; access to Table and Inventory of each.

### Table (table view)
Table overview: sheets, items and recent movements.

### Sheets (sheet list)
Lists the table's characters; opens the detailed sheet.

### Monsters (managers only)
Lists the table's **monster sheets** as cards (name, type, habitat, **challenge**, status, item/slot counts), with search and **create/edit/remove** buttons. Opening a card loads the same sheet used for characters — the whole table schema applies (attributes, formulas, inventory, equipment, spells/runes, notes). Players neither see the tab nor monster movements (the server filters them).

### Sheet (the main screen)
Two columns (stacked on mobile), with configurable sections:
- **Attributes**: VIDA, MANA, ESFORÇO and `level` attributes (FORÇA, AGILIDADE, INTELIGÊNCIA…) with values and subdivisions.
- **Skills**: each skill shows its **stat-typing** (`(FOR & AGI)`, `(AGI)`, …) and a numeric value (max. 5).
- **Formulas**: badges with computed values (Health, Mana, Defense, Effort) adding **equipped-item bonuses** (gold chip) plus **Damage** when a damage item is equipped.
- **Custom fields**: free sheet fields.
- **Inventory**: the character's bag; with permission, the **Add** button opens a modal with two tabs:
  - *Catalog*: pick a stock item and a quantity (the `giveItem` action validates availability);
  - *Free item*: name, quantity and "per slot", not bound to the catalog.
- **Equipment**: hands, accessory, shield, armor — equip/remove bag items (the *shield × secondary-hand weapon* rule is enforced by the server). Rule tips on the side.
- **Spells & techniques**: list with add/edit/delete via modal.
- **Runes**: same (dedicated modal).
- **Notes**: free text with **autosave** as you type (no text lost when leaving the page).
- **Item history**: the sheet's movements.

### Inventory (catalog + movements)
- **Catalog** table grouped by category, with weight/value/effect and available (quantity minus what is in bags).
- Managers **add/update/remove items** (field modal).
- The **Give** button per item opens a modal: pick a sheet and a quantity → `giveItem`.
- **Stars**: accessory items can have 1–3 stars (star badge in the list) — they only count against the cap when the table uses `equipStars`.
- **Movements**: timeline with type (entry/exit/return/write-off/removal/clear), who did it, for whom and why.

### Sheet configuration (per table)
Managers define the table's *schema*:
- **Attributes**: create/edit/remove/reorder; types: number, text, level, yes/no, select, counter, currency, long text, link; min/max; active/required.
- **Skills**: name, category, max, description (typing, e.g. `(FOR & AGI)`).
- **Classes/Roles**: create and describe.
- **Formulas**: define how values derive (e.g. Health = f(VIDA) + level bonus).
- **Rules**: subdivision divisor (`subDivisor`).
- **Sections**: which sheet sections appear and in which column; custom sections.

### Users
Admins create/edit/deactivate accounts and set roles. Managers **cannot** access.

### Adjustments
Global theme (6 themes: Bordô, Pergaminho, Carvão, Verdigris, Noturno, Sangue) and system name.

---

## 8. Modeled game rules

### Default attributes of a new table
`VIDA, MANA, ESFORÇO` (numeric) and `FORÇA, AGILIDADE, INTELIGÊNCIA, RESISTÊNCIA` (level 0–10).

### Default skills (18) with stat-typing
`Intimidação (FOR&SAB) · Luta (FOR&AGI) · Resistência (FOR&VIG) · Atletismo (VIG&AGI) · Movimentação (AGI&FOR) · Mecânica (FOR&INT) · Pontaria (AGI&INT) · Reflexo (AGI) · Comunicação (INF) · Sedução (INF) · Música (INF&SAB) · Vontade (VIG&INF) · Sanidade (VIG&SAB) · Conhecimento (SAB) · Magia (INT&SAB) · Conjuração (INT&SAB) · Percepção (INT&INF) · Sobrevivência (SAB&VIG)`

### Equipment rules
- Slots: **Main Hand** (`mao1`), **Secondary Hand** (`mao2`), **Accessory**, **Shield**, **Armor**.
- `mao1`/`mao2` accept the `arma`, `cajado`, `grimorio` categories; `escudo` accepts only `escudo`; etc.
- **Conflict**: equipping a weapon in `mao2` removes the `escudo`; equipping a `escudo` removes the weapon in `mao2`. (the server validates and applies the automatic unequip)
- **Star-rated accessories** (tables with `equipStars`): 3 slots (`acessorio1`..`acessorio3`) and a **capped star sum** (max. 3); the server validates the cap in `setEquip`. Tables without the flag keep the single `acessorio` slot.

### Item effects parser
`parseItemBonuses` understands (real catalog examples):
- `Defesa +1d10` → defense += 5.5 (average)
- `Dano 1d6` → damage += 3.5
- `Recupera +7 de VIDA` → health += 7
- `+5 de Espaço`, `+5 de Esforço`, `-1 em Desvio`, `+12 de Espaço`
- `ESTAMINA` is treated as `ESFORÇO` (the rule's alternative name).

### Elementary runes (game reference)
From the rule docs: 1st/2nd circle runes (Fire, Water, Ice, Lightning, Earth, Wood, Wind) with damage/mana/armor values (e.g. Fire 1d3/2/2 turns; Barrier, Explosive, Multi…) and the **elementary combinations** cataloged as items (`Água+Fogo`, `Vento+Madeira`, `Raio+Gelo`, …) with effects in the catalog — ready to use and consult at the table.

---

## 9. API (actions via Socket.IO, `action` event)

Every mutation goes through the `action: { type, ...payload }` event; the server replies via `state` (to everyone) or `actionError`.

**System/accounts**: `updateSettings, changeOwnPassword, createUser, updateUser, deleteUser`

**Table/catalog**: `createRpg, updateRpg, deleteRpg, setAttr, removeAttr, reorderAttr, setSkill, removeSkill, reorderSkill, setClass, removeClass, setFormula, removeFormula, setRpgRule, setSchemaLabel, setSections, addCatalogItem, updateCatalogItem, removeCatalogItem`

**Sheets**: `createCharacter, deleteCharacter, updateCharacter, setAttrVal, setFormulaBuff, setSkillVal, addCustomAttr, updateCustomAttr, removeCustomAttr, setCustomField`

**Inventory**: `giveItem, returnItem, addItem, updateItem, removeItem, clearCharHistory`

**Spells/Runes/Equipment**: `addSpell, updateSpell, removeSpell, addRune, updateRune, removeRune, setEquip, unequip`

Example flow (the regression test does this end to end):
```js
socket.emit('action', { type: 'giveItem', charId, itemId, qty: 1 })
socket.emit('action', { type: 'setEquip', charId, slot: 'mao1', entryId: espada.id })
```

### HTTP routes
- `POST /api/login` · `POST /api/logout` · `GET /api/me`
- `GET` static files (SPA and the legacy `login.html/login.js`)

---

## 10. File structure

```
./
├── back\                # backend (Node.js/Express/Socket.IO)
│   ├── server.js          # server source
│   ├── deploy-app.js      # single bundle built with esbuild (used on Umbrel) — git-ignored
│   ├── package.json       # server deps + node_modules\ (together)
│   ├── docker-compose.yml # Umbrel compose (volume /data + tailscale + funnel)
│   ├── deploy-umbrel.ps1  # current deploy pipeline (Windows → Umbrel)
│   ├── data\              # local data (git-ignored — never version)
│   ├── umbrel\
│   │   ├── Containerfile    # image: node 20-slim + tailscale + supervisor
│   │   ├── entrypoint.sh    # boots tailscaled/funnel and supervisord
│   │   ├── supervisord.conf # runs `node server.js`
│   │   ├── setup-umbrel.sh  # Umbrel bootstrap (.env → build → up)
│   │   └── .env.example
│   └── scripts\           # tests and tools (rt-test, rt-equip-test, seed-users, ...)
├── front\                # frontend source (Svelte 5) — formerly `dev/`
│   ├── src\
│   │   ├── App.svelte · main.ts · app.css
│   │   ├── lib\AppShell.svelte · router.ts · stores.ts · socket.ts · api.ts
│   │   ├── lib\screens\  (Login, Dashboard, Mesa, Fichas, Ficha, Monstros, Estoque, Config, Usuarios, Ajustes)
│   │   └── lib\components\ (AttrControl, SkillControl, MovementRow, Tile, Toasts, Icon, Empty)
│   ├── fixtures\ · dist\ · node_modules\
│   └── vite.config.ts      # proxies /api and /socket.io → :3001
├── public\               # compiled frontend (served by the back; bind mount on Umbrel)
│   ├── index.html · favicon.svg · icons.svg
│   └── assets\*.js|*.css  (versioned Vite bundles)
├── referencias\          # game rule/sheet documents (PDF + TXT)
├── adicionado\           # content already imported into the system (weapons/armors/staves)
└── to-add\               # content pending import
```

---

## 11. Running locally

Prerequisite: Node.js ≥ 16 (18+ recommended).

Backend (folder `back/`):

```
cd back
npm install            # server dependencies
npm start              # starts the server on port 3000 (server.js)
```

Frontend for development (folder `front/`):

```
cd front
npm install
npm run dev            # Vite dev server on port 5173
npm run check          # svelte-check + tsc (types)
npm run build          # generates dist/ → copy to public/
```

Data: without `data.json`/`users.json`, the server creates them blank on first run (`loadState`). For full gameplay, use a seeded `users.json` (`back/scripts/seed-users.js`) and optionally a campaign `data.json`.

`front/vite.config.ts` defines a proxy for `/api` and `/socket.io` (with `ws: true`) pointing to `http://localhost:3001` — in short, for full development run the server on port **3001** (`PORT=3001 node server.js` in `back/`) and Vite in parallel on port 5173.

---

## 12. Deployment

### Current — Umbrel (production)
Pipeline: `back/deploy-umbrel.ps1` (from Windows) → scp of `back/deploy-app.js`, `public/` and container files → `docker compose build && up -d --force-recreate`.

- Container `estoque-rpg`: Node 20-slim + **Tailscale** + **supervisor**.
- `entrypoint.sh`: boots `tailscaled`, authenticates (`TS_AUTHKEY`), enables **Funnel** on port 3000 (group access from outside the local network).
- Volume `app-data:/data` stores `data.json`/`users.json`/`runas.json` (data survives rebuilds).
- Bind `./public:/app/public` → frontend = just `scp`; backend = container rebuild.

Quick frontend update:
```
# local build + copy
npm run build (in front/) and copy dist/* → public/
scp public/index.html and public/assets/* user@host-umbrel:/home/USER/estoque-rpg/public/
```
(note: assets live in `public/assets/`.)

### Legacy — VPS (discontinued)
An old pipeline published the bundle via SFTP (Posh-SSH/Passenger) on a VPS; it was **removed from the repository** because it contained hardcoded credentials. Current production is Umbrel.

---

## 13. Tests

- `node back/scripts/rt-test.cjs` — realtime smoke test: logs in as admin, fires an action and checks state propagation (expected: `ACTION+RT OK`).
- `node back/scripts/rt-equip-test.cjs` — inventory/equipment regression test: creates catalog and sheet, gives items, equips 2 weapons + shield + armor, validating the *shield × secondary hand* conflict (expected: `EQUIP+ITEM OK`).
- `npm run check` (in `front/`) — Svelte/TS type check.

> Adjust `PORT`/paths in the scripts if needed (tests use an isolated instance in a temporary folder).

---

## 14. Improvements and next steps (roadmap)

Ideas spotted in the code and content folders:

- [ ] Import the rest of `to-add/` (complementary skills, attribute bonuses per level).
- [ ] Apply **per-level bonuses** (`to-add/bonus_por_nivel_atributos.json`): +Space, +HP, rune slots, extra skills based on points.
- [ ] Rune slots limited by Intelligence/Wisdom (referenced in the rules).
- [ ] Clearer "available" display in the Inventory (quantity vs. assignment).
- [ ] Export the item catalog to a file (backup/offline editing).
- [ ] Replace `express-session` MemoryStore with persistence before scaling to multiple processes.
- [ ] Move tests to a fixed runner (no dynamic prints).

---

## 15. Changelog (summary)

- **3.2.0 (current)**
  - **Monster Sheets**: new per-table tab (managers only) — full sheet reused, challenge/type/habitat up top, and the server filters monster sheets/movements for players.
  - **Star-rated accessories**: optional per-table system (`equipStars`) with 3 slots and a star-sum cap.
  - **Notes autosave**: ≈500ms debounce and immediate save when leaving the field.
  - Publication cleanup: root `.gitignore`, removal of legacy scripts with credentials, updated README.
- **3.0.0**
  - Global UI kit (`app.css`) — fixes unstyled screens (modals/buttons/fields).
  - Mobile hamburger menu in the app shell.
  - Fix of the Users bug (action methods) and `setEquip` (`entryId`).
  - Equipment rules: hands 1/2, shield × secondary weapon (server validation).
  - Equipped-item bonuses in formulas (effects parser) + Damage badge.
  - Adding items to inventory via Inventory and Sheet (`giveItem`/`addItem`).
  - Spells & techniques and Runes: add/edit/delete.
  - Skills with visible stat-typing.
  (Earlier history was never versioned.)

---

## 16. License and usage

This project is licensed under the **PolyForm NonCommercial 1.0.0** (see `LICENSE`): the code is **source-available** — you may view, use, modify and distribute it for **non-commercial purposes** (study, hobby, your own campaigns, non-profit organizations). **Commercial use** (selling, paid hosting, using it in a business) is **not permitted** under this license and requires an explicit agreement with the author.

---

*Documentation generated from the source code, rule documents and deployment history. Last reviewed: Sep 2026.*