import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const crimesRoutes = Router()

crimesRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        city,
        type,
        description,
        date,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(city ? { city: { contains: String(city) } } : {}),
        ...(type ? { type: { contains: String(type) } } : {}),
        ...(description ? { description: { contains: String(description) } } : {}),
        ...(date ? { date: Number(date) } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['date', 'type', 'description', 'city'],
    })

    const crimes = await prisma.crime_scene_report.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(crimes)
})

export default crimesRoutes