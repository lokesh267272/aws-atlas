import { quizById, quizQuestions } from './quizQuestions'
import { shuffle } from './shuffle'

/** One attempt at the quiz. */
export interface QuizRun {
  /** Question ids in this run (all 12, or only the ones missed last time) */
  ids: string[]
  /** Option ids per question, in the shuffled order shown to the learner */
  optionOrder: Record<string, string[]>
  /** Chosen option id per question */
  answers: Record<string, string>
  index: number
  finished: boolean
}

export const allQuestionIds = quizQuestions.map((q) => q.id)

/** Starts a fresh attempt. Option order is reshuffled every time. */
export function newRun(ids: string[]): QuizRun {
  return {
    ids,
    optionOrder: Object.fromEntries(ids.map((id) => [id, shuffle(quizById[id].options.map((o) => o.id))])),
    answers: {},
    index: 0,
    finished: false,
  }
}

export const isAnswered = (run: QuizRun, id: string) => run.answers[id] !== undefined

export const isRight = (run: QuizRun, id: string) => run.answers[id] === quizById[id].answer
