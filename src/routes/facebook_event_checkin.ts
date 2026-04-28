import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const facebookEventCheckinRoutes = Router()

facebookEventCheckinRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        person_id,
        event_id,
        event_name,
        date,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(person_id ? { person_id: Number(person_id) } : {}),
        ...(event_id ? { event_id: Number(event_id) } : {}),
        ...(event_name ? { event_name: { contains: String(event_name) } } : {}),
        ...(date ? { date: Number(date) } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['person_id', 'event_id', 'event_name', 'date'],
    })

    const checkins = await prisma.facebook_event_checkin.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(checkins)
})

export default facebookEventCheckinRoutes