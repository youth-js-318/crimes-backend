import { Router } from "express";
import { prisma } from '../lib/prisma'

const crimesRoutes = Router()

crimesRoutes.get('/', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        city,
        type,
        description,
        date
    } = req.query

    const pageNumber = Number(page) || 1
    const limitNumber = Number(limit) || 10

    const where = {
        ...(city ? { city: { contains: String(city) } } : {}),
        ...(type ? { type: { contains: String(type) } } : {}),
        ...(description ? { description: { contains: String(description) } } : {}),
        ...(date ? { date: Number(date) } : {}),
    }

    const crimes = await prisma.crime_scene_report.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
    })

    return res.json(crimes)
})

export default crimesRoutes