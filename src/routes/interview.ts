import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

const interviewRoutes = Router()

interviewRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        person_id,
        transcript,
    } = req.query

    const where = {
        ...(person_id ? { person_id: Number(person_id) } : {}),
        ...(transcript ? { transcript: { contains: String(transcript) } } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(limit)
    })

    const interviews = await prisma.interview.findMany({
        where,
        ...pagination,
    })

    return res.json(interviews)
})

export default interviewRoutes