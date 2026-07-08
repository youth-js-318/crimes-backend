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
    'Validation',
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
    | '/solucao'

const ARRAY_ENDPOINTS: Record<PathKey, string> = {
    '/crimes': 'CrimeSceneReport',
    '/carteiras': 'DriversLicense',
    '/pessoas': 'Person',
    '/entrevistas': 'Interview',
    '/saldo': 'Income',
    '/academia-membros': 'GetFitNowMember',
    '/academia-checkin': 'GetFitNowCheckIn',
    '/facebook-checkin': 'FacebookEventCheckin',
}

const OBJECT_ENDPOINTS: Record<PathKey, string> = {
    '/solucao': 'Validation',
}

const ALL_ENDPOINTS: Record<PathKey, string> = {
    ...ARRAY_ENDPOINTS,
    ...OBJECT_ENDPOINTS,
}

type Components = {
    parameters?: Record<string, unknown>
    schemas?: Record<string, { type?: string; properties?: Record<string, unknown>; required?: string[] }>
}

type Operation = {
    requestBody?: { required?: boolean; content?: { 'application/json'?: { schema?: unknown } } }
    responses?: Record<string, { description?: string; content?: { 'application/json'?: { schema?: unknown } } }>
}

type OpenApiSpec = {
    openapi: string
    paths: Record<string, { get?: Operation; post?: Operation }>
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

    it('declares a 200 array response with the correct schema for array endpoints', () => {
        for (const [path, expectedSchema] of Object.entries(ARRAY_ENDPOINTS) as [PathKey, string][]) {
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

    it('declares a 200 object response with the correct schema for object endpoints', () => {
        for (const [path, expectedSchema] of Object.entries(OBJECT_ENDPOINTS) as [PathKey, string][]) {
            const operation = spec.paths[path]?.get ?? spec.paths[path]?.post
            assert.ok(operation, `Operacao ausente em ${path}`)

            const response200 = operation.responses?.['200']
            assert.ok(response200, `Resposta 200 ausente em ${path}`)

            const jsonSchema = response200.content?.['application/json']?.schema as
                | { $ref?: string }
                | undefined
            assert.ok(jsonSchema, `Schema JSON ausente em ${path} 200`)
            assert.equal(jsonSchema.$ref, `#/components/schemas/${expectedSchema}`, `${path} deve referenciar ${expectedSchema}`)
        }
    })

    it('declares 400 and 500 responses with the Error schema for every endpoint', () => {
        for (const path of Object.keys(ALL_ENDPOINTS) as PathKey[]) {
            const operation = spec.paths[path]?.get ?? spec.paths[path]?.post
            assert.ok(operation, `Operacao ausente em ${path}`)

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

    it('declares POST /solucao with a required requestBody and POST operation', () => {
        const operation = spec.paths['/solucao']?.post
        assert.ok(operation, 'Operacao POST ausente em /solucao')

        const requestBody = operation.requestBody
        assert.ok(requestBody, 'requestBody ausente em POST /solucao')
        assert.equal(requestBody.required, true, 'requestBody de POST /solucao deve ser obrigatorio')

        const bodySchema = requestBody.content?.['application/json']?.schema as
            | { type?: string; required?: string[]; properties?: Record<string, unknown> }
            | undefined
        assert.ok(bodySchema, 'Schema JSON do requestBody ausente em POST /solucao')
        assert.equal(bodySchema.type, 'object', 'Body de POST /solucao deve ser object')
        assert.ok(
            bodySchema.required?.includes('name'),
            'Body de POST /solucao deve exigir o campo "name"',
        )
        assert.ok(bodySchema.properties?.name, 'Body de POST /solucao deve declarar a propriedade "name"')
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
