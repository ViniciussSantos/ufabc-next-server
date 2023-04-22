const app = require('@/app')
const errors = require('@/errors')
const _ = require('lodash')

module.exports = async (context) => {
  const { aluno_id, ra, login } = context.body

  if (!aluno_id) {
    throw new errors.BadRequest.MissingParameter('aluno_id')
  }

  const season = app.helpers.season.findSeasonKey()
  const Alunos = app.models.alunos.bySeason(season)
  const Disciplinas = app.models.disciplinas.bySeason(season)

  // check if already passed, if so does no update this user anymore
  const isPrevious = await Disciplinas.count({
    before_kick: { $exists: true, $ne: [] },
  })
  if (isPrevious) {
    return await Alunos.findOne({ aluno_id: aluno_id })
  }

  if (
    (context.body.cursos || []).some(
      (curso) => (!curso.curso_id || curso.curso_id == 'null') && (curso.curso != 'Bacharelado em CIências e Humanidades' && 'Bacharelado em Ciências e Humanidades')
    ) ||
    !ra
  ) {
    return await Alunos.findOne({
      aluno_id: aluno_id,
    })
  }

  const cursos = (context.body.cursos || []).map(async (c) => {
    let courseCleaned = c.curso.trim().replace('↵', '').replace(/\s+/g, ' ')
    if(courseCleaned == 'Bacharelado em CIências e Humanidades') {
      courseCleaned = 'Bacharelado em Ciências e Humanidades'
    }
    
    const history = await app.models.historiesGraduations.findOne({
      ra: ra,
      curso: courseCleaned,
    }).sort({
      updatedAt: -1,
    })

    let cpBeforePandemic = _.get(history, 'coefficients.2019.3.cp_acumulado', null)
    // Sum cp before pandemic + cp after freezed
    let cpFreezed = _.get(history, 'coefficients.2021.2.cp_acumulado', null)

    const lastSeason = app.helpers.season.findLastSeason()
    let cpLastQuad = _.get(history, `coefficients.${lastSeason.year}.${lastSeason.quad}.cp_acumulado`, null)
    
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const twoQuadAgoSeason = app.helpers.season.findLastSeason(threeMonthsAgo)
    let cpTwoQuadAgo = _.get(history, `coefficients.${twoQuadAgoSeason.year}.${twoQuadAgoSeason.quad}.cp_acumulado`, null)

    let cpTotal = null
    if((cpLastQuad || cpTwoQuadAgo) && cpFreezed) {
      cpTotal = (cpLastQuad || cpTwoQuadAgo) - cpFreezed
    }

    let finalCP = null
    // If student enter after 2019.3
    if(!cpBeforePandemic) {
      if(!cpTotal) {
        cpTotal = c.cp
      }
      finalCP = Math.min(Number((cpTotal).toFixed(3)), 1)
    } else {
      finalCP = Math.min(Number((cpBeforePandemic + cpTotal).toFixed(3)), 1)
    }
    
    c.cr = _.isFinite(c.cr) ? app.helpers.parse.toNumber(c.cr) : 0
    c.cp = _.isFinite(c.cp) ? app.helpers.parse.toNumber(finalCP) : 0
    c.quads = _.isFinite(c.quads) ? app.helpers.parse.toNumber(c.quads) : 0
    c.nome_curso = courseCleaned
    c.ind_afinidade = 0.07 * c.cr + 0.63 * c.cp + 0.005 * c.quads
    if(!c.curso_id && c.curso == 'Bacharelado em Ciências e Humanidades') {
      c.id_curso = 25
    } else {
      c.id_curso = c.curso_id
    }
    return c
  })

  return await Alunos.findOneAndUpdate(
    {
      aluno_id: aluno_id,
    },
    {
      cursos: await Promise.all(cursos),
      ra: ra,
      login: login,
    },
    {
      new: true,
      upsert: true,
    }
  )
}
