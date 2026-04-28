export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Murder Mistery API',
        version: '1.0.0',
        description: 'API para investigação de dados do caso Murder Mystery',
    },
    servers: [
        {
            url: 'http://localhost:3000',
        },
    ],
    tags: [
        { name: 'Crimes' },
        { name: 'Carteiras' },
        { name: 'Pessoas' },
        { name: 'Entrevistas' },
        { name: 'Renda' },
        { name: 'Academia' },
        { name: 'Facebook' },
    ],
    components: {
        parameters: {
            Page: {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 },
                description: 'Numero da pagina',
            },
            Limit: {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                description: 'Quantidade de registros por pagina',
            },
            SortBy: {
                name: 'sort_by',
                in: 'query',
                schema: { type: 'string' },
                description: 'Campo permitido para ordenacao da rota',
            },
            SortOrder: {
                name: 'sort_order',
                in: 'query',
                schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
                description: 'Direcao da ordenacao',
            },
        },
    },
    paths: {
        '/crimes': {
            get: {
                tags: ['Crimes'],
                summary: 'Lista crimes',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'city', in: 'query', schema: { type: 'string' } },
                    { name: 'type', in: 'query', schema: { type: 'string' } },
                    { name: 'description', in: 'query', schema: { type: 'string' } },
                    { name: 'date', in: 'query', schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'Lista de crimes' } },
            },
        },
        '/carteiras': {
            get: {
                tags: ['Carteiras'],
                summary: 'Lista carteiras de motorista',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'age', in: 'query', schema: { type: 'integer' } },
                    { name: 'height', in: 'query', schema: { type: 'integer' } },
                    { name: 'eye_color', in: 'query', schema: { type: 'string' } },
                    { name: 'gender', in: 'query', schema: { type: 'string' } },
                    { name: 'plate_number', in: 'query', schema: { type: 'string' } },
                    { name: 'car_make', in: 'query', schema: { type: 'string' } },
                    { name: 'car_model', in: 'query', schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Lista de carteiras' } },
            },
        },
        '/pessoas': {
            get: {
                tags: ['Pessoas'],
                summary: 'Lista pessoas',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'name', in: 'query', schema: { type: 'string' } },
                    { name: 'license_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'address_number', in: 'query', schema: { type: 'integer' } },
                    { name: 'address_street_name', in: 'query', schema: { type: 'string' } },
                    { name: 'ssn', in: 'query', schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Lista de pessoas' } },
            },
        },
        '/entrevistas': {
            get: {
                tags: ['Entrevistas'],
                summary: 'Lista entrevistas',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'transcript', in: 'query', schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Lista de entrevistas' } },
            },
        },
        '/saldo': {
            get: {
                tags: ['Renda'],
                summary: 'Lista renda',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'ssn', in: 'query', schema: { type: 'string' } },
                    { name: 'annual_income', in: 'query', schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'Lista de renda' } },
            },
        },
        '/academia-membros': {
            get: {
                tags: ['Academia'],
                summary: 'Lista membros da academia',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'id', in: 'query', schema: { type: 'string' } },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'name', in: 'query', schema: { type: 'string' } },
                    { name: 'membership_start_date', in: 'query', schema: { type: 'integer' } },
                    { name: 'membership_status', in: 'query', schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Lista de membros' } },
            },
        },
        '/academia-checkin': {
            get: {
                tags: ['Academia'],
                summary: 'Lista check-ins da academia',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'membership_id', in: 'query', schema: { type: 'string' } },
                    { name: 'check_in_date', in: 'query', schema: { type: 'integer' } },
                    { name: 'check_in_time', in: 'query', schema: { type: 'integer' } },
                    { name: 'check_out_time', in: 'query', schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'Lista de check-ins' } },
            },
        },
        '/facebook-checkin': {
            get: {
                tags: ['Facebook'],
                summary: 'Lista check-ins de eventos do Facebook',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'event_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'event_name', in: 'query', schema: { type: 'string' } },
                    { name: 'date', in: 'query', schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'Lista de check-ins do Facebook' } },
            },
        },
    },
}