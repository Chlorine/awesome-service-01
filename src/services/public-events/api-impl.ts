import * as HttpErrors from 'http-errors';
import * as moment from 'moment';

import { ApiImpl } from '../../api/impl';
import { Params, ResultsPromise } from '../../interfaces/common-front/public-events/api';

import { IApiContext } from '../../api/index';
import { tryGetUAInfo } from '../../utils/user-agent-info';

import { checkAuth, checkObjectOwnership } from '../../api/impl-utils';

import PublicEvent, { IPublicEvent } from './models/event';
import Survey, { ISurvey } from './models/survey';
import SurveyQuestion, { ISurveyQuestion } from './models/survey-question';
import EventVisitor, { IEventVisitor } from './models/visitor';
import SurveyAnswer, { ISurveyAnswer } from './models/survey-answer';

import { LogHelper } from '../../utils/logger';
import { getUser } from '../users/utils';
import { Utils } from '../../utils/utils';

import { SurveyQuestionInfo } from '../../interfaces/common-front/public-events/survey-question';

export class PublicEventsApiImpl extends ApiImpl {
  constructor() {
    super('/api/public-events', 'API.PEvents');
  }

  handlers = {
    /**
     * Создание нового публичного мероприятия
     */
    createEvent: async (
      params: Params<'createEvent'>,
      ctx: IApiContext,
    ): ResultsPromise<'createEvent'> => {
      const lh = new LogHelper(this, `createEvent|${ctx.cid}`);
      const u = checkAuth(ctx);

      const { name, description, place, surveyId } = params;

      const start = moment.utc(params.start);
      const end = moment.utc(params.end);

      lh.write(`start: ${start.toISOString()} end: ${end.toISOString()}`);

      if (start.isSameOrAfter(end)) {
        throw new HttpErrors.BadRequest(`Время начала должно быть раньше времени окончания`);
      }

      const minStart = moment.utc().startOf('day');
      if (start.isBefore(minStart)) {
        throw new HttpErrors.BadRequest(`Дата начала не может быть раньше сегодняшнего дня`);
      }

      const e = new PublicEvent({
        user: u.id,

        name,
        description,
        place: { ...place },

        start: start.toDate(),
        end: end.toDate(),
      });

      if (surveyId) {
        const survey = await Survey.findById(surveyId);
        if (!survey) {
          throw new HttpErrors.BadRequest(`Неверный ID анкеты (анкета не найдена)`);
        }

        checkObjectOwnership(ctx, survey);

        e.survey = surveyId;
      }

      await e.save();

      lh.onSuccess(`eventId: ${e.id}`);

      return {
        event: e.asPublicEventInfo(),
      };
    },
    /**
     * Изменение публичного мероприятия
     * @param params
     * @param ctx
     */
    updateEvent: async (
      params: Params<'updateEvent'>,
      ctx: IApiContext,
    ): ResultsPromise<'updateEvent'> => {
      const lh = new LogHelper(this, `updateEvent|${ctx.cid}`);

      const u = checkAuth(ctx);
      const { id } = params;

      const event = await PublicEvent.findById(id);
      if (!event) {
        throw new HttpErrors.NotFound(`Мероприятие не найдено`);
      }

      checkObjectOwnership(ctx, event);

      Utils.setEntityProperty(event, 'name', params.name);
      Utils.setEntityProperty(event, 'description', params.description);

      const { place, surveyId } = params;

      if (place !== undefined) {
        Utils.setEntityProperty(event.place, 'name', place.name);
        Utils.setEntityProperty(event.place, 'address', place.address);
        Utils.setEntityProperty(event.place, 'location', place.location);
      }

      if (params.start || params.end) {
        const start = moment.utc(params.start || event.start);
        const end = moment.utc(params.end || event.end);

        if (start.isSameOrAfter(end)) {
          throw new HttpErrors.BadRequest(`Время начала должно быть раньше времени окончания`);
        }
      }

      if (surveyId !== undefined) {
        if (!surveyId) {
          event.survey = null;
        } else {
          const survey = await Survey.findById(surveyId);
          if (!survey) {
            throw new HttpErrors.BadRequest(`Неверный ID анкеты (анкета не найдена)`);
          }
          checkObjectOwnership(ctx, survey);
          event.survey = survey.id;
        }
      }

      await event.save();

      lh.onSuccess();

      return {
        event: event.asPublicEventInfo(),
      };
    },
    /**
     * Получение мероприятий пользователя
     * @param params
     * @param ctx
     */
    getEvents: async (
      params: Params<'getEvents'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEvents'> => {
      const u = await getUser(ctx, params.userId);
      const events = await PublicEvent.findUserEvents(u.id);

      return {
        events: events.map(e => e.asPublicEventInfo()),
      };
    },
    /**
     * Получить анкету по ID
     * @param params
     * @param ctx
     */
    getEvent: async (params: Params<'getEvent'>, ctx: IApiContext): ResultsPromise<'getEvent'> => {
      const u = checkAuth(ctx);

      const { id } = params;
      const event = await PublicEvent.findById(id);
      if (!event) {
        throw new HttpErrors.NotFound(`Мероприятие не найдено`);
      }
      checkObjectOwnership(ctx, event);

      return {
        event: event.asPublicEventInfo(),
      };
    },
    /**
     * Получить полную инфу по мероприятию (с анкетой) по ID
     * @param params
     * @param ctx
     */
    getEventFullInfo: async (
      params: Params<'getEventFullInfo'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventFullInfo'> => {
      const { id } = params;
      const event = await PublicEvent.findWithSurvey(id);
      if (!event) {
        throw new HttpErrors.NotFound(`Мероприятие не найдено`);
      }

      return {
        event: event.asPublicEventFullInfo(),
      };
    },
    /**
     * Создать анкету
     * @param params
     * @param ctx
     */
    createSurvey: async (
      params: Params<'createSurvey'>,
      ctx: IApiContext,
    ): ResultsPromise<'createSurvey'> => {
      const lh = new LogHelper(this, `createSurvey|${ctx.cid}`);

      const { name, description } = params;

      const u = checkAuth(ctx);
      const survey = new Survey({
        user: u.id,
        name,
        description,
      });

      await survey.save();

      lh.onSuccess(`surveyId: ${survey.id}`);

      return {
        survey: survey.asSurveyInfo(),
      };
    },
    /**
     * Изменить анкету
     * @param params
     * @param ctx
     */
    updateSurvey: async (
      params: Params<'updateSurvey'>,
      ctx: IApiContext,
    ): ResultsPromise<'updateSurvey'> => {
      const lh = new LogHelper(this, `updateSurvey|${ctx.cid}`);

      const u = checkAuth(ctx);
      const { id } = params;

      const survey = await Survey.findById(id);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }

      checkObjectOwnership(ctx, survey);

      Utils.setEntityProperty(survey, 'name', params.name);
      Utils.setEntityProperty(survey, 'description', params.description);

      await survey.save();

      lh.onSuccess();

      return {
        survey: survey.asSurveyInfo(),
      };
    },
    /**
     * Получить все анкеты
     * @param params
     * @param ctx
     */
    getSurveys: async (
      params: Params<'getSurveys'>,
      ctx: IApiContext,
    ): ResultsPromise<'getSurveys'> => {
      const u = await getUser(ctx, params.userId);
      const surveys = await Survey.findUserSurveys(u.id);

      return {
        surveys: surveys.map(s => s.asSurveyInfo()),
      };
    },
    /**
     * Получить анкету по ID
     * @param params
     * @param ctx
     */
    getSurvey: async (
      params: Params<'getSurvey'>,
      ctx: IApiContext,
    ): ResultsPromise<'getSurvey'> => {
      const u = checkAuth(ctx);

      const { id } = params;
      const survey = await Survey.findWithQuestions(id);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }

      checkObjectOwnership(ctx, survey);

      return {
        survey: survey.asSurveyInfo(),
      };
    },
    /**
     * Создать вопрос анкеты
     * @param params
     * @param ctx
     */
    createSurveyQuestion: async (
      params: Params<'createSurveyQuestion'>,
      ctx: IApiContext,
    ): ResultsPromise<'createSurveyQuestion'> => {
      const lh = new LogHelper(this, `createSurveyQuestion|${ctx.cid}`);
      const { surveyId } = params;

      const survey = await Survey.findById(surveyId);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }
      checkObjectOwnership(ctx, survey);

      const { text, description, answerType, answerVariants, displayOrder } = params;

      if (answerType !== 'YesNo') {
        if (!answerVariants || answerVariants.length < 2) {
          throw new HttpErrors.BadRequest(
            `Выбранный тип ответа на вопрос требует указания не менее двух вариантов ответа`,
          );
        }
      }

      const sq = new SurveyQuestion({
        survey: survey.id,
        text,
        description,
        answerType,
        answerVariants,
        displayOrder,
      });

      await sq.save();

      lh.onSuccess(`questionId: ${sq.id}`);

      return {
        question: sq.asSurveyQuestionInfo(),
      };
    },
    /**
     * Изменить вопрос анкеты
     * @param params
     * @param ctx
     */
    updateSurveyQuestion: async (
      params: Params<'updateSurveyQuestion'>,
      ctx: IApiContext,
    ): ResultsPromise<'updateSurveyQuestion'> => {
      const lh = new LogHelper(this, `updateSurveyQuestion|${ctx.cid}`);

      const { id } = params;
      const sq = await SurveyQuestion.findWithSurvey(id);
      if (!sq) {
        throw new HttpErrors.NotFound('Вопрос анкеты не найден');
      }

      checkObjectOwnership(ctx, sq.survey);

      Utils.setEntityProperty(sq, 'text', params.text);
      Utils.setEntityProperty(sq, 'description', params.description);

      if (params.answerType || params.answerVariants) {
        const answerType: SurveyQuestionInfo['answerType'] = params.answerType || sq.answerType;
        let answerVariants: SurveyQuestionInfo['answerVariants'] =
          params.answerVariants || sq.answerVariants.slice();

        if (answerType !== 'YesNo') {
          if (answerVariants.length < 2) {
            throw new HttpErrors.BadRequest(
              `Выбранный тип ответа на вопрос требует указания не менее двух вариантов ответа`,
            );
          }
        } else {
          answerVariants = [];
        }

        sq.answerType = answerType;
        sq.answerVariants = answerVariants;
      }

      Utils.setEntityProperty(sq, 'displayOrder', params.displayOrder);

      await sq.save();

      lh.onSuccess();

      return {
        question: sq.asSurveyQuestionInfo(),
      };
    },
    /**
     * Установить порядок сортировки вопросов в анкете
     * @param params
     * @param ctx
     */
    setSurveyQuestionsSortOrder: async (
      params: Params<'setSurveyQuestionsSortOrder'>,
      ctx: IApiContext,
    ): ResultsPromise<'setSurveyQuestionsSortOrder'> => {
      const lh = new LogHelper(this, `setSurveyQuestionsSortOrder|${ctx.cid}`);
      const { surveyId } = params;

      const survey = await Survey.findWithQuestions(surveyId);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }
      checkObjectOwnership(ctx, survey);

      const { questionIDs } = params;

      for (let q of survey.questions) {
        q.displayOrder = questionIDs.indexOf(q.id);
        if (-1 === q.displayOrder) {
          throw new HttpErrors.BadRequest(
            `Invalid questionIDs array (existing question id is missing)`,
          );
        }
      }

      for (let q of survey.questions) {
        await q.save();
      }

      lh.onSuccess();

      return {};
    },
    /**
     * Удаление вопроса анкеты
     * @param params
     * @param ctx
     */
    removeSurveyQuestion: async (
      params: Params<'removeSurveyQuestion'>,
      ctx: IApiContext,
    ): ResultsPromise<'removeSurveyQuestion'> => {
      const lh = new LogHelper(this, `removeSurveyQuestion|${ctx.cid}`);

      const { id } = params;
      const sq = await SurveyQuestion.findWithSurvey(id);
      if (!sq) {
        throw new HttpErrors.NotFound('Вопрос анкеты не найден');
      }

      checkObjectOwnership(ctx, sq.survey);

      await sq.remove();

      lh.onSuccess(`question ${id} was removed`);

      return {};
    },
    /**
     * Регистрация посетителя публичного мероприятия
     * @param params
     * @param ctx
     */
    registerEventVisitor: async (
      params: Params<'registerEventVisitor'>,
      ctx: IApiContext,
    ): ResultsPromise<'registerEventVisitor'> => {
      const lh = new LogHelper(this, `registerEventVisitor|${ctx.cid}`, 'info');

      const { eventId } = params;
      const event = await PublicEvent.findById(eventId);
      if (!event) {
        throw new HttpErrors.BadRequest(`Неверный идентификатор события (событие не найдено)`);
      }

      const uaInfo = tryGetUAInfo(ctx.req);

      const {
        firstName,
        middleName,
        lastName,
        companyName,
        position,
        phone,
        email,
        birthday,
        gender,
      } = params.visitor;

      let hashSrc = `${firstName}|${middleName}|${lastName}|${companyName}|${position}|${phone}|${email}`;

      if (birthday) {
        hashSrc += `|${birthday}`;
      }

      if (gender) {
        hashSrc += `|${gender}`;
      }

      const hash = Utils.md5(hashSrc);

      lh.write(`received: [${hashSrc}] -> ${hash}`);

      const { sourceType, sourceData } = params;

      const fields: Partial<IEventVisitor> = {
        lastName,
        firstName,
        middleName,
        companyName,
        position,
        phone,
        email,
        gender,
        sourceType,
        sourceData,
        regRemoteAddress: ctx.remoteAddress,
        uaInfo,
      };

      if (birthday) {
        fields.birthday = moment(birthday, 'YYYY-MM-DD').toDate();
      }

      // на случай повторных сабмитов регистрационных форм с теми же данными

      const visitor = await EventVisitor.findOneAndUpdate(
        {
          hash,
          event: event.id,
        },
        { $set: fields, $inc: { regSubmits: 1 } },
        { upsert: true, new: true },
      );

      if (!visitor) {
        throw new Error('Внутренняя ошибка');
      }

      const { surveyAnswers } = params;

      if (surveyAnswers) {
        if (event.survey) {
          const survey = await Survey.findWithQuestions(event.survey);
          if (survey) {
            let q: ISurveyQuestion | undefined;

            for (let a of surveyAnswers) {
              q = survey.questions.find(q => q.id === a.questionId);
              if (q) {
                await SurveyAnswer.updateOne(
                  {
                    survey: survey.id,
                    question: q.id,
                    visitor: visitor.id,
                  },
                  { $set: { value: a.value } },
                  { upsert: true },
                );
              }
            }
          }
        }
      }

      lh.onSuccess(`visitorId: ${visitor.id} regSubmits: ${visitor.regSubmits}`);

      return {
        visitor: visitor.asVisitorInfo(),
      };
    },
  };
}
