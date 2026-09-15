export type AttrKey = 'forca' | 'vigor' | 'agilidade' | 'inteligencia' | 'sabedoria' | 'influencia'

export type BonoNivel = {
  pontos: number
  nivel: number
  forca: string
  vigor: string
  agilidade: string
  inteligencia: string
  sabedoria: string
  influencia: string
}

export type Atributo = {
  key: AttrKey
  nome: string
  abrev: string
  icone: string
  descricao: string
  nivel: number
  pontos: number
}

export type Pericia = {
  id: string
  nome: string
  com: string
  atributos: AttrKey[]
  valor: number
  bonus?: number
}

export const ATRIBUTOS: Omit<Atributo, 'nivel' | 'pontos'>[] = [
  { key: 'forca', nome: 'Força', abrev: 'FOR', icone: '💪', descricao: '+2 Espaço por nível' },
  { key: 'vigor', nome: 'Vigor', abrev: 'VIG', icone: '❤️', descricao: '+2 HP por nível' },
  { key: 'agilidade', nome: 'Agilidade', abrev: 'AGI', icone: '💨', descricao: '+1 AC Movimento' },
  { key: 'inteligencia', nome: 'Inteligência', abrev: 'INT', icone: '🧠', descricao: '+1 slot de runa' },
  { key: 'sabedoria', nome: 'Sabedoria', abrev: 'SAB', icone: '🦉', descricao: '+1 slot de runa' },
  { key: 'influencia', nome: 'Influência', abrev: 'INF', icone: '👑', descricao: '+1 perícia' }
]

export const BONUS_NIVEL: BonoNivel[] = [
  { pontos: 10, nivel: 1, forca: '+2 Espaço', vigor: '-', agilidade: '-', inteligencia: '+1 slot de runa', sabedoria: '+1 slot de runa', influencia: '-' },
  { pontos: 20, nivel: 2, forca: '+2 Espaço', vigor: '+2 HP', agilidade: '-', inteligencia: '-', sabedoria: '-', influencia: '-' },
  { pontos: 30, nivel: 3, forca: '+2 Espaço', vigor: '-', agilidade: '+1 AC Movimento', inteligencia: '+1 slot de runa', sabedoria: '+1 slot de runa', influencia: '+1 perícia' },
  { pontos: 40, nivel: 4, forca: '+2 Espaço', vigor: '+2 HP', agilidade: '-', inteligencia: '-', sabedoria: '-', influencia: '-' },
  { pontos: 50, nivel: 5, forca: '+2 Espaço, Armaduras Médias sem debuff de desvio', vigor: '-', agilidade: '-', inteligencia: '+1 slot de runa', sabedoria: '+1 slot de runa', influencia: '-' },
  { pontos: 60, nivel: 6, forca: '+2 Espaço', vigor: '+2 HP', agilidade: '+1 AC Movimento', inteligencia: '-', sabedoria: '-', influencia: '+1 perícia' },
  { pontos: 70, nivel: 7, forca: '+2 Espaço', vigor: '-', agilidade: '-', inteligencia: '+1 slot de runa', sabedoria: '+1 slot de runa', influencia: '-' },
  { pontos: 80, nivel: 8, forca: '+2 Espaço', vigor: '+2 HP', agilidade: '-', inteligencia: '-', sabedoria: '-', influencia: '-' },
  { pontos: 90, nivel: 9, forca: '+2 Espaço', vigor: '-', agilidade: '-', inteligencia: '-', sabedoria: '-', influencia: '-' },
  { pontos: 100, nivel: 10, forca: '+2 Espaço', vigor: '+2 HP', agilidade: '+1 AC Movimento', inteligencia: '+1 slot de runa', sabedoria: '+1 slot de runa', influencia: '+1 perícia' }
]

export function bonusDe(nivel: number, key: AttrKey): string {
  const linha = BONUS_NIVEL[nivel - 1]
  if (!linha) return '-'
  return linha[key]
}

export const PERICIAS: Omit<Pericia, 'valor' | 'bonus'>[] = [
  { id: 'intimidacao', nome: 'Intimidação', com: '(FOR & SAB)', atributos: ['forca', 'sabedoria'] },
  { id: 'resistencia', nome: 'Resistência', com: '(FOR & VIG)', atributos: ['forca', 'vigor'] },
  { id: 'mecanica', nome: 'Mecânica', com: '(FOR & INT)', atributos: ['forca', 'inteligencia'] },
  { id: 'luta', nome: 'Luta', com: '(FOR & AGI)', atributos: ['forca', 'agilidade'] },
  { id: 'vontade', nome: 'Vontade', com: '(VIG & INF)', atributos: ['vigor', 'influencia'] },
  { id: 'sanidade', nome: 'Sanidade', com: '(VIG & SAB)', atributos: ['vigor', 'sabedoria'] },
  { id: 'atletismo', nome: 'Atletismo', com: '(VIG & AGI)', atributos: ['vigor', 'agilidade'] },
  { id: 'movimentacao', nome: 'Movimentação', com: '(AGI & FOR)', atributos: ['agilidade', 'forca'] },
  { id: 'pontaria', nome: 'Pontaria', com: '(AGI & INT)', atributos: ['agilidade', 'inteligencia'] },
  { id: 'reflexo', nome: 'Reflexo', com: '(AGI)', atributos: ['agilidade'] },
  { id: 'musica', nome: 'Música', com: '(INF & SAB)', atributos: ['influencia', 'sabedoria'] },
  { id: 'comunicacao', nome: 'Comunicação', com: '(INF)', atributos: ['influencia'] },
  { id: 'seducao', nome: 'Sedução', com: '(INF)', atributos: ['influencia'] },
  { id: 'conhecimento', nome: 'Conhecimento', com: '(SAB)', atributos: ['sabedoria'] },
  { id: 'magia', nome: 'Magia', com: '(INT & SAB)', atributos: ['inteligencia', 'sabedoria'] },
  { id: 'conjuracao', nome: 'Conjuração', com: '(INT & SAB)', atributos: ['inteligencia', 'sabedoria'] },
  { id: 'percepcao', nome: 'Percepção', com: '(INT & INF)', atributos: ['inteligencia', 'influencia'] },
  { id: 'sobrevivencia', nome: 'Sobrevivência', com: '(SAB & VIG)', atributos: ['sabedoria', 'vigor'] }
]

export type Recurso = {
  key: 'vida' | 'mana' | 'esforco'
  nome: string
  abrev: string
  icone: string
  valor: number
  max: number
}

export type Character = {
  nome: string
  classe: string
  nivel: number
  reil: number
  espaco: number
  foto?: string
  atributos: Record<AttrKey, number>
  recursos: Record<Recurso['key'], { valor: number; max: number }>
  pericias: Record<string, number>
  slotsRuna: number
  runas: string[]
}
