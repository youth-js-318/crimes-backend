export type Pagination = {
    page: number | null
    limit: number | null
    total: number
    total_pages: number | null
    has_next: boolean | null
    has_prev: boolean | null
}

export type ApiResponse<T> = {
    data: T
    pagination: Pagination
    status: 'success'
}

type BuildResponseArgs<T> = {
    data: T
    page?: unknown
    limit?: unknown
    total: number
}

const toOptionalNumber = (value: unknown): number | null => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

export const buildResponse = <T>({
    data,
    page,
    limit,
    total,
}: BuildResponseArgs<T>): ApiResponse<T> => {
    const pageNumber = toOptionalNumber(page)
    const limitNumber = toOptionalNumber(limit)

    const totalPages =
        pageNumber != null && limitNumber != null && limitNumber > 0
            ? Math.ceil(total / limitNumber)
            : null

    const hasNext =
        pageNumber != null && limitNumber != null && totalPages != null
            ? pageNumber < totalPages
            : null

    const hasPrev =
        pageNumber != null && limitNumber != null
            ? pageNumber > 1
            : null

    return {
        data,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            total_pages: totalPages,
            has_next: hasNext,
            has_prev: hasPrev,
        },
        status: 'success',
    }
}
