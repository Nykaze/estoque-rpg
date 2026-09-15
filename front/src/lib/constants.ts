export const THEMES = [
  { id: 'default', label: 'Bordô', accent: '#c9a55a', accent2: '#7a2e3a' },
  { id: 'pergaminho', label: 'Pergaminho', accent: '#d4a843', accent2: '#8a6520' },
  { id: 'carvao', label: 'Carvão', accent: '#8a8a8a', accent2: '#4a4a4a' },
  { id: 'verdigris', label: 'Verdigris', accent: '#5aaa8a', accent2: '#2a6b5a' },
  { id: 'noturno', label: 'Noturno', accent: '#6a8ac0', accent2: '#3a4a7a' },
  { id: 'sangue', label: 'Sangue', accent: '#c04050', accent2: '#7a1a2a' }
]

export const CAT_LABELS: Record<string, string> = {
  consumivel: 'Consumível',
  acessorio: 'Acessório',
  material: 'Material',
  combinacao: 'Combinação',
  arma: 'Arma',
  armadura: 'Armadura',
  cajado: 'Cajado',
  grimorio: 'Grimório',
  escudo: 'Escudo',
  magico: 'Mágico'
}
export const CAT_ORDER = ['consumivel', 'acessorio', 'material', 'combinacao', 'arma', 'armadura', 'cajado', 'grimorio', 'escudo', 'magico']

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  jogador: 'Jogador'
}

export const ATTR_TYPE_LABELS: Record<string, string> = {
  number: 'Numérico',
  text: 'Texto',
  level: 'Nível',
  bool: 'Sim/Não',
  select: 'Seleção',
  counter: 'Contador',
  moeda: 'Moeda',
  longtext: 'Texto longo',
  vinculo: 'Vínculo'
}

export const EQUIP_SLOTS = ['mao1', 'mao2', 'acessorio', 'escudo', 'armadura']
export const EQUIP_SLOTS_STARS = ['mao1', 'mao2', 'acessorio1', 'acessorio2', 'acessorio3', 'escudo', 'armadura']
export const EQUIP_SLOT_CATS: Record<string, string[]> = {
  mao1: ['arma', 'cajado', 'grimorio'],
  mao2: ['arma', 'cajado', 'grimorio'],
  acessorio: ['acessorio'],
  acessorio1: ['acessorio'],
  acessorio2: ['acessorio'],
  acessorio3: ['acessorio'],
  escudo: ['escudo'],
  armadura: ['armadura']
}
export const EQUIP_SLOT_LABELS: Record<string, string> = {
  mao1: 'Mão Principal',
  mao2: 'Mão Secundária',
  acessorio: 'Acessório',
  acessorio1: 'Acessório 1',
  acessorio2: 'Acessório 2',
  acessorio3: 'Acessório 3',
  escudo: 'Escudo',
  armadura: 'Armadura'
}
export const MAX_EQUIP_STARS = 3

export const BUILTIN_SECS = ['atributos', 'pericias', 'camposlivres', 'inventario', 'equipamento', 'magias', 'runas', 'anotacoes', 'historico']
export const SEC_DEFAULT_COL: Record<string, 'left' | 'right'> = { atributos: 'left', pericias: 'left', camposlivres: 'left' }
export const SEC_META: Record<string, { label: string; icon: string }> = {
  atributos: { label: 'Atributos', icon: 'dash' },
  pericias: { label: 'Perícias', icon: 'sheets' },
  camposlivres: { label: 'Campos Livres', icon: 'pencil' },
  inventario: { label: 'Inventário', icon: 'bag' },
  equipamento: { label: 'Equipamento', icon: 'shield' },
  magias: { label: 'Magias', icon: 'sparkles' },
  runas: { label: 'Runas', icon: 'rune' },
  anotacoes: { label: 'Anotações', icon: 'pencil' },
  historico: { label: 'Histórico de Itens', icon: 'history' }
}

export const MV_META: Record<string, { label: string; cls: string; color: string }> = {
  saida: { label: 'Saída', cls: 'mv-saida', color: 'var(--blue)' },
  devolucao: { label: 'Devolução', cls: 'mv-devolucao', color: 'var(--green)' },
  entrada: { label: 'Entrada', cls: 'mv-entrada', color: 'var(--green)' },
  baixa: { label: 'Baixa', cls: 'mv-baixa', color: 'var(--red)' },
  remocao: { label: 'Removido', cls: 'mv-remocao', color: 'var(--faint)' },
  limpeza: { label: 'Limpeza', cls: 'mv-limpeza', color: 'var(--red)' }
}
export const MV_TYPES = Object.keys(MV_META)

export const ATTR_DEFAULTS = { min: null, max: 10, options: [], required: false, active: true, hasSub: false }
export const SKILL_DEFAULTS = { cat: 'Geral', max: 5, desc: '', active: true }
export const CLASS_DEFAULTS = { name: '', desc: '' }

export const NAV = {
  dashboard: ['Dashboard', 'Visão geral das mesas'],
  mesa: ['Mesa', 'Visão geral da mesa'],
  fichas: ['Fichas', 'Personagens da mesa'],
  ficha: ['Ficha', 'Detalhes do personagem'],
  estoque: ['Estoque', 'Catálogo e movimentações'],
  config: ['Configuração da ficha', 'Atributos, perícias e funções'],
  usuarios: ['Usuários', 'Gerenciar contas'],
  ajustes: ['Ajustes', 'Preferências do sistema']
}
