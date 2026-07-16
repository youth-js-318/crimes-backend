import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const getFitNowMembersRoutes = Router()

getFitNowMembersRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
        id,
        person_id,
        name,
        membership_start_date,
        membership_status,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(id ? { id: { contains: String(id) } } : {}),
        ...(person_id ? { person_id: Number(person_id) } : {}),
        ...(name ? { name: { contains: String(name) } } : {}),
        ...(membership_start_date ? { membership_start_date: Number(membership_start_date) } : {}),
        ...(membership_status ? { membership_status: { contains: String(membership_status) } } : {}),
    }

    const pagination = buildPagination({
        page: Number(page),
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['id', 'person_id', 'name', 'membership_start_date', 'membership_status'],
    })

    const [data, total] = await Promise.all([
        prisma.get_fit_now_member.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.get_fit_now_member.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default getFitNowMembersRoutes
