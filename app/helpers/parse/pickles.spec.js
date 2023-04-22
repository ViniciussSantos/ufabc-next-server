const app = require('@/app')
const assert = require('assert')
const pickles = require('./pickles')

describe('helpers/parse/pickles', async function () {
  describe('should return valid fields', async function () {
    it('with plain object', async function () {
      const payload = {
        valid: 'valid',
        invalid: 'invalid',
      }

      const fields = { public: ['valid'] }

      const afterPickPayload = pickles(payload, fields)

      assert(afterPickPayload.valid)
      assert(!afterPickPayload.invalid)
    })
    it('with nested object', async function () {
      const payload = {
        valid: 'valid',
        nested: {
          valid: 'valid',
          invalid: 'invalid',
        },
        invalid: 'invalid',
      }

      const fields = { public: ['valid', 'nested.valid'] }

      const afterPickPayload = pickles(payload, fields)

      assert(afterPickPayload.valid)
      assert(!afterPickPayload.invalid)
      assert(afterPickPayload.nested.valid)
      assert(!afterPickPayload.nested.invalid)
    })
    it('with nested array object', async function () {
      const payload = {
        valid: 'valid',
        nested: {
          valid: 'valid',
          invalid: 'invalid',
          array: [
            {
              valid: 'valid',
              invalid: 'invalid',
            },
          ],
        },
        invalid: 'invalid',
      }

      const fields = {
        public: ['valid', 'nested'],
        nested: { public: ['valid', 'array'], array: { public: ['valid'] } },
      }

      const afterPickPayload = pickles(payload, fields)

      assert(afterPickPayload.valid)
      assert(!afterPickPayload.invalid)
      assert(afterPickPayload.nested.valid)
      assert(!afterPickPayload.nested.invalid)
      assert(afterPickPayload.nested.array[0].valid)
      assert(!afterPickPayload.nested.array[0].invalid)
    })
    it('with an array', async function () {
      const payload = [
        {
          valid: 'valid',
          nested: {
            valid: 'valid',
            invalid: 'invalid',
            array: [
              {
                valid: 'valid',
                invalid: 'invalid',
              },
            ],
          },
          invalid: 'invalid',
        },
      ]

      const fields = {
        public: ['valid', 'nested'],
        nested: { public: ['valid', 'array'], array: { public: ['valid'] } },
      }

      const afterPickPayload = pickles(payload, fields)

      assert(afterPickPayload[0].valid)
      assert(!afterPickPayload[0].invalid)
      assert(afterPickPayload[0].nested.valid)
      assert(!afterPickPayload[0].nested.invalid)
      assert(afterPickPayload[0].nested.array[0].valid)
      assert(!afterPickPayload[0].nested.array[0].invalid)
    })
    it('with an mongoose object', async function () {
      const Disciplinas = app.models.disciplinas
      const disciplina = new Disciplinas({
        alunos_matriculados: [1, 2, 3, 4, 5],
      })

      const fields = { public: ['requisicoes'] }

      const afterPickPayload = pickles(disciplina, fields)

      assert.equal(
        afterPickPayload.requisicoes,
        disciplina.alunos_matriculados.length
      )
      assert(!afterPickPayload.alunos_matriculados)
    })
  })
})
