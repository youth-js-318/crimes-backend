const ok = (description: string, schemaRef: string) => ({
    description,
    content: {
        'application/json': {
            schema: { type: 'array', items: { $ref: schemaRef } },
        },
    },
})

const error = (description: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
        },
    },
})

export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Murder Mistery API',
        version: '1.0.0',
        description: 'API para investigação de dados do caso Murder Mystery',
    },
    servers: [
        {
            url: 'https://crimes-backend-production.up.railway.app',
        },
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
        schemas: {
            Error: {
                type: 'object',
                description: 'Resposta de erro padrao',
                required: ['error'],
                properties: {
                    error: { type: 'string', description: 'Mensagem descrevendo o erro' },
                },
            },
            CrimeSceneReport: {
                type: 'object',
                description: 'Relatorio da cena do crime',
                required: ['date', 'type', 'description', 'city'],
                properties: {
                    date: { type: 'integer', description: 'Data do crime em formato YYYYMMDD' },
                    type: { type: 'string', description: 'Tipo do crime' },
                    description: { type: 'string', description: 'Descricao do crime' },
                    city: { type: 'string', description: 'Cidade onde ocorreu o crime' },
                },
            },
            DriversLicense: {
                type: 'object',
                description: 'Carteira de motorista',
                required: ['id', 'plate_number'],
                properties: {
                    id: { type: 'integer', description: 'Identificador da carteira' },
                    age: { type: 'integer', nullable: true, description: 'Idade do portador' },
                    height: { type: 'integer', nullable: true, description: 'Altura em polegadas' },
                    eye_color: { type: 'string', nullable: true, description: 'Cor dos olhos' },
                    hair_color: { type: 'string', nullable: true, description: 'Cor do cabelo' },
                    gender: { type: 'string', nullable: true, description: 'Genero' },
                    plate_number: { type: 'string', description: 'Placa do veiculo' },
                    car_make: { type: 'string', nullable: true, description: 'Marca do veiculo' },
                    car_model: { type: 'string', nullable: true, description: 'Modelo do veiculo' },
                },
            },
            Person: {
                type: 'object',
                description: 'Pessoa cadastrada',
                required: ['id'],
                properties: {
                    id: { type: 'integer', description: 'Identificador da pessoa' },
                    name: { type: 'string', nullable: true, description: 'Nome completo' },
                    license_id: { type: 'integer', nullable: true, description: 'Id da carteira de motorista' },
                    address_number: { type: 'integer', nullable: true, description: 'Numero do endereco' },
                    address_street_name: { type: 'string', nullable: true, description: 'Rua do endereco' },
                    ssn: { type: 'string', nullable: true, description: 'Social Security Number' },
                },
            },
            Interview: {
                type: 'object',
                description: 'Entrevista realizada com uma pessoa',
                required: ['person_id', 'transcript'],
                properties: {
                    person_id: { type: 'integer', description: 'Id da pessoa entrevistada' },
                    transcript: { type: 'string', description: 'Transcricao da entrevista' },
                },
            },
            Income: {
                type: 'object',
                description: 'Renda anual de uma pessoa',
                required: ['ssn'],
                properties: {
                    ssn: { type: 'string', description: 'Social Security Number' },
                    annual_income: { type: 'integer', nullable: true, description: 'Renda anual em dolares' },
                },
            },
            GetFitNowMember: {
                type: 'object',
                description: 'Membro da academia Get Fit Now',
                required: ['id'],
                properties: {
                    id: { type: 'string', description: 'Identificador do membro' },
                    person_id: { type: 'integer', nullable: true, description: 'Id da pessoa associada' },
                    name: { type: 'string', nullable: true, description: 'Nome do membro' },
                    membership_start_date: { type: 'integer', nullable: true, description: 'Data de inicio da matricula' },
                    membership_status: { type: 'string', nullable: true, description: 'Status da matricula' },
                },
            },
            GetFitNowCheckIn: {
                type: 'object',
                description: 'Check-in na academia Get Fit Now',
                required: ['membership_id', 'check_in_date', 'check_in_time', 'check_out_time'],
                properties: {
                    membership_id: { type: 'string', description: 'Id do membro' },
                    check_in_date: { type: 'integer', description: 'Data do check-in' },
                    check_in_time: { type: 'integer', description: 'Hora do check-in em minutos desde 00:00' },
                    check_out_time: { type: 'integer', description: 'Hora do check-out em minutos desde 00:00' },
                },
            },
            FacebookEventCheckin: {
                type: 'object',
                description: 'Check-in em evento do Facebook',
                required: ['person_id', 'event_id', 'date'],
                properties: {
                    person_id: { type: 'integer', description: 'Id da pessoa' },
                    event_id: { type: 'integer', description: 'Id do evento' },
                    event_name: { type: 'string', nullable: true, description: 'Nome do evento' },
                    date: { type: 'integer', description: 'Data do check-in' },
                },
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
                responses: {
                    '200': ok('Lista de crimes', '#/components/schemas/CrimeSceneReport'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                    { name: 'id', in: 'query', schema: { type: 'integer' } },
                    { name: 'age', in: 'query', schema: { type: 'integer' } },
                    { name: 'height', in: 'query', schema: { type: 'integer' } },
                    { name: 'eye_color', in: 'query', schema: { type: 'string' } },
                    { name: 'hair_color', in: 'query', schema: { type: 'string' } },
                    { name: 'gender', in: 'query', schema: { type: 'string' } },
                    { name: 'plate_number', in: 'query', schema: { type: 'string' } },
                    { name: 'car_make', in: 'query', schema: { type: 'string' } },
                    { name: 'car_model', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': ok('Lista de carteiras', '#/components/schemas/DriversLicense'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de pessoas', '#/components/schemas/Person'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de entrevistas', '#/components/schemas/Interview'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de renda', '#/components/schemas/Income'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de membros', '#/components/schemas/GetFitNowMember'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de check-ins', '#/components/schemas/GetFitNowCheckIn'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
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
                responses: {
                    '200': ok('Lista de check-ins do Facebook', '#/components/schemas/FacebookEventCheckin'),
                    '400': error('Parametros de consulta invalidos'),
                    '500': error('Erro interno do servidor'),
                },
            },
        },
    },
}
