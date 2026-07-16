import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";
import { buildResponse } from "../utils/response";

const pessoasRoutes = Router()

pessoasRoutes.get('/', async (req, res) => {
    const {
        page,
        limit,
        name,
        license_id,
        address_number,
        address_street_name,
        ssn,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(license_id ? { license_id: Number(license_id) } : {}),
        ...(address_number ? { address_number: Number(address_number) } : {}),
        ...(name ? { name: { contains: String(name) } } : {}),
        ...(address_street_name ? { address_street_name: { contains: String(address_street_name) } } : {}),
        ...(ssn ? { ssn: { contains: String(ssn) } } : {}),
    }

    const pagination = buildPagination({
        page: Number(page),
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['id', 'name', 'license_id', 'address_number', 'address_street_name', 'ssn'],
    })

    const [data, total] = await Promise.all([
        prisma.person.findMany({
            where,
            ...(orderBy ? { orderBy } : {}),
            ...pagination,
        }),
        prisma.person.count({ where }),
    ])

    return res.json(buildResponse({ data, page, limit, total }))
})

export default pessoasRoutes
