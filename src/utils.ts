type PageArgs = {
    page?: number | string;
    limit?: number | string;
}

type Pagination = {} | {
    skip: number
    take: number
}

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