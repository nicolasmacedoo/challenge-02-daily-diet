import type { FastifyInstance } from 'fastify'
import z from 'zod'
import { knex } from '../database'
import { v7 as uuidv7 } from 'uuid'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { user } = request

      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        date: z.string(), // z.coerce.date()
        isOnDiet: z.boolean(),
      })

      const { data, error } = createMealBodySchema.safeParse(request.body)

      if (error) {
        return reply.status(401).send({
          success: false,
          message: {},
          error: error.flatten().fieldErrors,
        })
      }

      const { name, description, date, isOnDiet } = data

      await knex('meals').insert({
        id: uuidv7(),
        name,
        description,
        date,
        is_on_diet: isOnDiet,
        user_id: user?.id,
      })

      reply.status(201).send()
    },
  )

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const editMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = editMealParamsSchema.parse(request.params)

      const meal = await knex('meals').select().where({ id }).first()

      if (!meal) {
        return reply.status(400).send({
          message: 'Meal not found!',
        })
      }

      const editMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        date: z.string(),
        isOnDiet: z.boolean(),
      })

      const { name, description, date, isOnDiet } = editMealBodySchema.parse(
        request.body,
      )

      await knex('meals')
        .update({
          name,
          description,
          date,
          is_on_diet: isOnDiet,
        })
        .where({ id })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = deleteMealParamsSchema.parse(request.params)

      const meal = await knex('meals').select().where('id', id)

      if (!meal) {
        return reply.status(400).send({
          message: 'Meal not found',
        })
      }

      await knex('meals').where({ id }).delete()

      return reply.status(204).send()
    },
  )

  app.get(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { user } = request

      const meals = await knex('meals')
        .where('user_id', user?.id)
        .select()
        .orderBy('date', 'asc')

      return reply.status(200).send({ meals })
    },
  )

  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamSchema.parse(request.params)

      const meal = await knex('meals').where('id', id).select().first()

      return reply.status(200).send({ meal })
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { user } = request

      const meals = await knex('meals')
        .where('user_id', user?.id)
        .select()
        .orderBy('date', 'asc')

      const totalMealsOnDiet = meals.filter((meal) => meal.is_on_diet).length

      const totalMealsNotOnDiet = meals.length - totalMealsOnDiet

      const { longestStreak } = meals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentStreak += 1
            acc.longestStreak = Math.max(acc.longestStreak, acc.currentStreak)
          } else {
            acc.currentStreak = 0
          }
          return acc
        },
        { currentStreak: 0, longestStreak: 0 },
      )

      // const totalMealsOnDiet = await knex('meals')
      //   .where({ user_id: request.user?.id, is_on_diet: true })
      //   .count('id', { as: 'total' })
      //   .first()

      // const totalMealsOffDiet = await knex('meals')
      //   .where({ user_id: request.user?.id, is_on_diet: false })
      //   .count('id', { as: 'total' })
      //   .first()

      // const totalMeals = await knex('meals')
      //   .count('id', { as: 'total' })
      //   .where({ user_id: request.user?.id })
      //   .orderBy('date', 'desc')

      // console.log(totalMealsOffDiet, totalMealsOnDiet, totalMeals)

      // const { bestOnDietSequence } = totalMeals.reduce(
      //   (acc, meal) => {
      //     if (meal.is_on_diet) {
      //       acc.currentSequence += 1
      //     } else {
      //       acc.currentSequence = 0
      //     }

      //     if (acc.currentSequence > acc.bestOnDietSequence) {
      //       acc.bestOnDietSequence = acc.currentSequence
      //     }

      //     return acc
      //   },
      //   { bestOnDietSequence: 0, currentSequence: 0 },
      // )

      return reply.status(200).send({
        totalMeals: meals.length,
        totalMealsOnDiet,
        totalMealsNotOnDiet,
        longestStreak,
      })
    },
  )
}
