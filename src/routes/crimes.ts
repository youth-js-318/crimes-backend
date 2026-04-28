import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

const crimesRoutes = Router()

crimesRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        city,
        type,
        description,
        date
    } = req.query

    const where = {
        ...(city ? { city: { contains: String(city) } } : {}),
        ...(type ? { type: { contains: String(type) } } : {}),
        ...(description ? { description: { contains: String(description) } } : {}),
        ...(date ? { date: Number(date) } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(page)
    })

    const crimes = await prisma.crime_scene_report.findMany({
        where,
        ...pagination,
    })

    return res.json(crimes)
})

export default crimesRoutes