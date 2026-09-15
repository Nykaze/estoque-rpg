import type { Character } from './data'

export const personagemMock: Character = {
  nome: 'Kaelen Vale',
  classe: 'Mago',
  nivel: 3,
  reil: 240,
  espaco: 24,
  foto: '',
  atributos: {
    forca: 1,
    vigor: 1,
    agilidade: 2,
    inteligencia: 3,
    sabedoria: 2,
    influencia: 1
  },
  recursos: {
    vida: { valor: 18, max: 24 },
    mana: { valor: 14, max: 20 },
    esforco: { valor: 3, max: 5 }
  },
  pericias: {
    intimidacao: 0,
    resistencia: 1,
    mecanica: 0,
    luta: 0,
    vontade: 2,
    sanidade: 1,
    atletismo: 0,
    movimentacao: 1,
    pontaria: 1,
    reflexo: 2,
    musica: 0,
    comunicacao: 1,
    seducao: 0,
    conhecimento: 1,
    magia: 2,
    conjuracao: 2,
    percepcao: 1,
    sobrevivencia: 0
  },
  slotsRuna: 3,
  runas: ['Runa de Fogo', 'Runa de Água', 'Runa de Bola']
}
