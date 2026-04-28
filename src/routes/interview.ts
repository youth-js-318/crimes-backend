import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const interviewRoutes = Router()

interviewRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
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

    const interviews = await prisma.interview.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(interviews)
})

export default interviewRoutes