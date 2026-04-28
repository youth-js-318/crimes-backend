import { Router } from "express";
import { prisma } from '../lib/prisma'
import { buildPagination } from "../utils";

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
    } = req.query

    const pageNumber = Number(page) || 1
    const limitNumber = Number(limit) || 10

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
        limit: Number(page)
    })

    const crimes = await prisma.drivers_license.findMany({
        where,
        ...pagination,
    })

    return res.json(crimes)
})

export default carteirasRoutes