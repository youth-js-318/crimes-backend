import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const getFitNowCheckinRoutes = Router()

getFitNowCheckinRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
        membership_id,
        check_in_date,
        check_in_time,
        check_out_time,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(membership_id ? { membership_id: { contains: String(membership_id) } } : {}),
        ...(check_in_date ? { check_in_date: Number(check_in_date) } : {}),
        ...(check_in_time ? { check_in_time: Number(check_in_time) } : {}),
        ...(check_out_time ? { check_out_time: Number(check_out_time) } : {}),
    }

    const pagination = buildPagination({
        page: Number(page),
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['membership_id', 'check_in_date', 'check_in_time', 'check_out_time'],
    })

    const [data, total] = await Promise.all([
        prisma.get_fit_now_check_in.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.get_fit_now_check_in.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default getFitNowCheckinRoutes
