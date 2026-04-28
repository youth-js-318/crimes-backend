type PageArgs = {
    page?: number | string;
    limit?: number | string;
}

type Pagination = {} | {
    skip: number
    take: number
}

type SortArgs = {
    sortBy?: string | number
    sortOrder?: string | number
    allowedFields: string[]
}

type SortDirection = 'asc' | 'desc'

export const buildPagination = ({ page, limit }: PageArgs): Pagination => {
    const pageNumber = Number(page) || 1
    const limitNumber = Number(limit) || 10

    if (!page) {
        return {}
    }

    return {
        skip: (Number(pageNumber) - 1) * Number(limitNumber),
        take: Number(limitNumber)
    }
}

export const buildOrderBy = ({ sortBy, sortOrder, allowedFields }: SortArgs): Record<string, SortDirection> | undefined => {
    const field = String(sortBy || '').trim()

    if (!field || !allowedFields.includes(field)) {
        return undefined
    }

    const direction: SortDirection = String(sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

    return {
        [field]: direction,
    }
}