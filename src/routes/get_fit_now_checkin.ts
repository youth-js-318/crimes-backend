import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const getFitNowCheckinRoutes = Router()

getFitNowCheckinRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
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

    const checkins = await prisma.get_fit_now_check_in.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(checkins)
})

export default getFitNowCheckinRoutes