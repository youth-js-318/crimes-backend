import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const incomeRoutes = Router()

incomeRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
        ssn,
        annual_income,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(ssn ? { ssn: { contains: String(ssn) } } : {}),
        ...(annual_income ? { annual_income: Number(annual_income) } : {}),
    }

    const pagination = buildPagination({
        page: Number(page),
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['ssn', 'annual_income'],
    })

    const [data, total] = await Promise.all([
        prisma.income.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.income.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default incomeRoutes
