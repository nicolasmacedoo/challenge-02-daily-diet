import type { FastifyInstance } from 'fastify'
import { v7 as uuidv7 } from 'uuid'

import z from 'zod'
import { knex } from '../database'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string({ message: 'Name is required!' }),
      email: z.string({ message: 'Email is required!' }).email(),
    })

    // const { name, email } = createUserBodySchema.parse(request.body)
    const { success, data, error } = createUserBodySchema.safeParse(
      request.body,
    )

    if (!success) {
      return reply.status(401).send({
        success: false,
        message: {},
        error: error.flatten().fieldErrors,
      })
    }

    const { name, email } = data

    const userByEmail = await knex('users').select().where({ email })

    if (userByEmail) {
      return reply.status(400).send({
        message: 'User already exists',
      })
    }

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = uuidv7()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('users').insert({
      id: uuidv7(),
      session_id: sessionId,
      name,
      email,
    })

    return reply.status(201).send()
  })
}
