import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { openApiSpec } from './openapi'

const REQUIRED_SCHEMAS = [
    'CrimeSceneReport',
    'DriversLicense',
    'Person',
    'Interview',
    'Income',
    'GetFitNowMember',
    'GetFitNowCheckIn',
    'FacebookEventCheckin',
    'Error',
] as const

type PathKey =
    | '/crimes'
    | '/carteiras'
    | '/pessoas'
    | '/entrevistas'
    | '/saldo'
    | '/academia-membros'
    | '/academia-checkin'
    | '/facebook-checkin'

const ENDPOINT_SCHEMAS: Record<PathKey, string> = {
    '/crimes': 'CrimeSceneReport',
    '/carteiras': 'DriversLicense',
    '/pessoas': 'Person',
    '/entrevistas': 'Interview',
    '/saldo': 'Income',
    '/academia-membros': 'GetFitNowMember',
    '/academia-checkin': 'GetFitNowCheckIn',
    '/facebook-checkin': 'FacebookEventCheckin',
}

type Components = {
    parameters?: Record<string, unknown>
    schemas?: Record<string, { type?: string; properties?: Record<string, unknown>; required?: string[] }>
}

type Operation = {
    responses?: Record<string, { description?: string; content?: { 'application/json'?: { schema?: unknown } } }>
}

type OpenApiSpec = {
    openapi: string
    paths: Record<string, { get?: Operation }>
    components?: Components
}

const spec = openApiSpec as unknown as OpenApiSpec
const schemas = spec.components?.schemas ?? {}

describe('openapi spec', () => {
    it('declares openapi 3.0.3', () => {
        assert.equal(spec.openapi, '3.0.3')
    })

    it('defines every required resource schema as an object with properties', () => {
        for (const name of REQUIRED_SCHEMAS) {
            const schema = schemas[name]
            assert.ok(schema, `Schema ${name} nao definido em components.schemas`)
            assert.equal(schema.type, 'object', `Schema ${name} deve ser type=object`)
            assert.ok(
                schema.properties && Object.keys(schema.properties).length > 0,
                `Schema ${name} precisa ter properties`,
            )
        }
    })

    it('declares a 200 array response with the correct schema for every endpoint', () => {
        for (const [path, expectedSchema] of Object.entries(ENDPOINT_SCHEMAS) as [PathKey, string][]) {
            const operation = spec.paths[path]?.get
            assert.ok(operation, `Operacao GET ausente em ${path}`)

            const response200 = operation.responses?.['200']
            assert.ok(response200, `Resposta 200 ausente em ${path}`)

            const jsonSchema = response200.content?.['application/json']?.schema as
                | { type?: string; items?: { $ref?: string } }
                | undefined
            assert.ok(jsonSchema, `Schema JSON ausente em ${path} 200`)
            assert.equal(jsonSchema.type, 'array', `${path} deve retornar array`)
            assert.equal(
                jsonSchema.items?.$ref,
                `#/components/schemas/${expectedSchema}`,
                `${path} deve referenciar ${expectedSchema}`,
            )
        }
    })

    it('declares 400 and 500 responses with the Error schema for every endpoint', () => {
        for (const path of Object.keys(ENDPOINT_SCHEMAS) as PathKey[]) {
            const operation = spec.paths[path]?.get
            assert.ok(operation, `Operacao GET ausente em ${path}`)

            const response400 = operation.responses?.['400']
            const response500 = operation.responses?.['500']
            assert.ok(response400, `Resposta 400 ausente em ${path}`)
            assert.ok(response500, `Resposta 500 ausente em ${path}`)

            const schema400 = response400.content?.['application/json']?.schema as { $ref?: string } | undefined
            const schema500 = response500.content?.['application/json']?.schema as { $ref?: string } | undefined
            assert.equal(schema400?.$ref, '#/components/schemas/Error', `${path} 400 deve referenciar Error`)
            assert.equal(schema500?.$ref, '#/components/schemas/Error', `${path} 500 deve referenciar Error`)
        }
    })

    it('every $ref in the spec resolves to a defined component', () => {
        const serialized = JSON.stringify(openApiSpec)
        const refRegex = /"\$ref":\s*"#\/components\/([^/]+)\/([^"]+)"/g
        const matches = [...serialized.matchAll(refRegex)]
        assert.ok(matches.length > 0, 'Nenhum $ref encontrado no spec')

        const components = spec.components ?? {}
        for (const [, section, name] of matches) {
            const sectionContainer = (components as Record<string, Record<string, unknown> | undefined>)[section]
            assert.ok(
                sectionContainer?.[name],
                `$ref nao resolvido: #/components/${section}/${name}`,
            )
        }
    })
})
