import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildOrderBy, buildPagination } from "../utils";

const carteirasRoutes = Router()

carteirasRoutes.get('/', async (req, res) => {
    const {
        page,
        limit = 10,
        age,
        height,
        eye_color,
        gender,
        plate_number,
        car_make,
        car_model,
        sort_by,
        sort_order,
    } = req.query

    const where = {
        ...(age ? { age: Number(age) } : {}),
        ...(height ? { height: Number(height) } : {}),
        ...(eye_color ? { eye_color: { contains: String(eye_color) } } : {}),
        ...(gender ? { gender: { contains: String(gender) } } : {}),
        ...(plate_number ? { plate_number: { contains: String(plate_number) } } : {}),
        ...(car_make ? { car_make: { contains: String(car_make) } } : {}),
        ...(car_model ? { car_model: { contains: String(car_model) } } : {}),
    }

    const pagination = buildPagination({ 
        page: Number(page), 
        limit: Number(limit)
    })

    const orderBy = buildOrderBy({
        sortBy: String(sort_by || ''),
        sortOrder: String(sort_order || 'asc'),
        allowedFields: ['id', 'age', 'height', 'eye_color', 'hair_color', 'gender', 'plate_number', 'car_make', 'car_model'],
    })

    const crimes = await prisma.drivers_license.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        ...pagination,
    })

    return res.json(crimes)
})

export default carteirasRoutes