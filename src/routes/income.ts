import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const incomeRoutes = Router()

incomeRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
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

    const incomes = await prisma.income.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(incomes)
})

export default incomeRoutes