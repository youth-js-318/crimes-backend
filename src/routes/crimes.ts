import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const crimesRoutes = Router()

crimesRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
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

    const [data, total] = await Promise.all([
        prisma.crime_scene_report.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.crime_scene_report.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default crimesRoutes
