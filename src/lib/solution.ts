import { prisma } from './prisma'

export type SolutionRole = 'assassino' | 'mandante'

export type ValidationResult = {
    correct: boolean
    message: string
    hint?: string
    role?: SolutionRole
}

const EMPTY_NAME: ValidationResult = {
    correct: false,
    message: 'Voce precisa enviar o campo "name" com o nome do suspeito para validar a solucao.',
}

const SOLUTION_NOT_REGISTERED: ValidationResult = {
    correct: false,
    message: 'As respostas corretas ainda nao foram cadastradas no banco. Adicione uma entrevista com "I was hired" para o assassino e tres check-ins no SQL Symphony Concert em dezembro de 2017 para a mandante.',
}

const HINT = 'Dica: investigue as entrevistas das testemunhas (para o assassino) e os check-ins do Facebook no SQL Symphony Concert em dezembro de 2017 (para a mandante).'

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

export const findMastermindName = async (): Promise<string | null> => {
    const matchingLicenses = await prisma.drivers_license.findMany({
        where: {
            hair_color: 'red',
            gender: 'female',
            car_make: 'Tesla',
            car_model: 'Model S',
        },
        select: { id: true },
    })

    const matchingLicenseIds = matchingLicenses.map((l) => l.id)
    if (matchingLicenseIds.length === 0) {
        return null
    }

    const candidates = await prisma.person.findMany({
        where: {
            license_id: { in: matchingLicenseIds },
            facebook_event_checkin: {
                some: {
                    event_name: { contains: 'SQL Symphony' },
                },
            },
        },
        select: {
            name: true,
            _count: {
                select: {
                    facebook_event_checkin: {
                        where: {
                            event_name: { contains: 'SQL Symphony' },
                        },
                    },
                },
            },
        },
    })

    const ranked = candidates
        .filter((c) => c._count.facebook_event_checkin >= 3)
        .sort((a, b) => b._count.facebook_event_checkin - a._count.facebook_event_checkin)

    return ranked[0]?.name ?? null
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

    const [murderer, mastermind] = await Promise.all([
        findMurdererName(),
        findMastermindName(),
    ])

    if (!murderer && !mastermind) {
        return SOLUTION_NOT_REGISTERED
    }

    if (murderer && isCorrectAnswer(normalized, murderer)) {
        return {
            correct: true,
            role: 'assassino',
            message: `Parabens! Voce identificou o assassino: ${murderer}. Mas ha mais — descubra quem o contratou para resolver o caso por completo.`,
        }
    }

    if (mastermind && isCorrectAnswer(normalized, mastermind)) {
        return {
            correct: true,
            role: 'mandante',
            message: `Parabens! Voce descobriu a mandante: ${mastermind}, que contratou o assassino. Caso encerrado.`,
        }
    }

    return {
        correct: false,
        message: 'Quase la! O nome submetido nao corresponde ao assassino nem a mandante.',
        hint: HINT,
    }
}