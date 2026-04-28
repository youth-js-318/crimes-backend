import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

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
        limit: Number(page)
    })

    const crimes = await prisma.person.findMany({
        where,
        ...pagination,
    })

    return res.json(crimes)
})

export default pessoasRoutes