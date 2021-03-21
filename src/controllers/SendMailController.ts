import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";
import { resolve } from 'path';
import { SurveyUser } from "../models/SurveyUser";
import { AppError } from "../errors/AppError";

class SendEmailController {
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body

    const usersRepository = getCustomRepository(UsersRepository)
    const surveysRepository = getCustomRepository(SurveysRepository)
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

    const user = await usersRepository.findOne({ email })
    const survey = await surveysRepository.findOne({ id: survey_id })

    const npsPath = resolve(__dirname, '..', 'views', 'emails', 'npsMail.hbs')

    const surveysUsersalreadyExists = await surveysUsersRepository.findOne({
      where: { user_id: user.id, value: null },
      relations: ['user', 'survey']
    })

    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      id: '',
      link: process.env.URL_MAIL
    }
    
    if (!user || !survey) {
      throw new AppError('User doesn\'t exists')
    }

    if (surveysUsersalreadyExists) {
      variables.id = surveysUsersalreadyExists.id
      await SendMailService.execute(email, survey.title, variables, npsPath)
      return response.json(surveysUsersalreadyExists)
    }

    const surveyUser = surveysUsersRepository.create({
      user_id: user.id,
      survey_id
    })

    variables.id = surveyUser.id

    await surveysUsersRepository.save(surveyUser)

    await SendMailService.execute(email, survey.title, variables, npsPath)

    return response.json(surveyUser)
  }
}

export { SendEmailController }