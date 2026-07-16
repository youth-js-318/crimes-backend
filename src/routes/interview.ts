import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const interviewRoutes = Router()

interviewRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
        person_id,
        transcript,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(person_id ? { person_id: Number(person_id) } : {}),
        ...(transcript ? { transcript: { contains: String(transcript) } } : {}),
    }

    const pagination = buildPagination({
        page: Number(page),
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['person_id', 'transcript'],
    })

    const [data, total] = await Promise.all([
        prisma.interview.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.interview.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default interviewRoutes
