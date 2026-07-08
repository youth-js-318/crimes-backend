import { prisma } from './prisma'

export type ValidationResult = {
    correct: boolean
    message: string
    hint?: string
}

const SOLUTION_NOT_REGISTERED: ValidationResult = {
    correct: false,
    message: 'A resposta correta ainda nao foi cadastrada no banco. Adicione uma entrevista com "I was hired" para uma pessoa da tabela person.',
}

const EMPTY_NAME: ValidationResult = {
    correct: false,
    message: 'Voce precisa enviar o campo "name" com o nome do suspeito para validar a solucao.',
}

const HINT = 'Dica: comece pelas entrevistas das testemunhas e cruze os detalhes com os check-ins da academia Get Fit Now e as carteiras de motorista. O assassino frequentava a academia.'

export const findMurdererName = async (): Promise<string | null> => {
    const murderer = await prisma.person.findFirst({
        where: {
            interview: {
                some: {
                    transcript: { contains: 'I was hired' },
                },
            },
        },
        select: { name: true },
    })
    return murderer?.name ?? null
}

export const isCorrectAnswer = (submitted: string, expected: string | null): boolean => {
    if (!expected) return false
    return submitted.trim().toLowerCase() === expected.trim().toLowerCase()
}

export const validateSolution = async (submittedName: string): Promise<ValidationResult> => {
    const normalized = submittedName?.trim() ?? ''
    if (!normalized) {
        return EMPTY_NAME
    }

    const expected = await findMurdererName()
    if (!expected) {
        return SOLUTION_NOT_REGISTERED
    }

    if (isCorrectAnswer(normalized, expected)) {
        return {
            correct: true,
            message: `Parabens! Voce identificou o assassino: ${expected}. Caso encerrado.`,
        }
    }

    return {
        correct: false,
        message: 'Quase la! O nome submetido nao corresponde ao assassino.',
        hint: HINT,
    }
}
