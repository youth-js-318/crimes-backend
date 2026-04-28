import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

const incomeRoutes = Router()

incomeRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        ssn,
        annual_income,
    } = req.query

    const where = {
        ...(ssn ? { ssn: { contains: String(ssn) } } : {}),
        ...(annual_income ? { annual_income: Number(annual_income) } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(limit)
    })

    const incomes = await prisma.income.findMany({
        where,
        ...pagination,
    })

    return res.json(incomes)
})

export default incomeRoutes