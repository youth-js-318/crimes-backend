import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const pessoasRoutes = Router()

pessoasRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
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

    const crimes = await prisma.person.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(crimes)
})

export default pessoasRoutes