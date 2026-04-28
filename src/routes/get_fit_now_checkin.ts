import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

const getFitNowCheckinRoutes = Router()

getFitNowCheckinRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        membership_id,
        check_in_date,
        check_in_time,
        check_out_time,
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

    const checkins = await prisma.get_fit_now_check_in.findMany({
        where,
        ...pagination,
    })

    return res.json(checkins)
})

export default getFitNowCheckinRoutes