import * as HttpErrors from 'http-errors';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { join } from 'path';
import * as _ from 'lodash';

import { ApiImpl } from '../../api/impl';
import { Params, Results, ResultsPromise } from '../../interfaces/common-front/public-events/api';

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

import CONFIG from '../../../config';
import { nj, readTemplateFile } from '../../utils/template-helpers';
import { PaginationResults } from '../../interfaces/common-front/index';
import { FilterQuery } from 'mongoose';
import { EventVisitorFullInfo } from '../../interfaces/common-front/public-events/visitor';
import {
  ANSWER_NO,
  ANSWER_YES,
  SurveyQuestionAnswersInfo,
} from '../../interfaces/common-front/public-events/index';

export class PublicEventsApiImpl extends ApiImpl {
  constructor() {
    super('/api/public-events', 'API.PEvents');
  }

  private async getEvent(id: string, ctx: IApiContext): Promise<IPublicEvent> {
    const event = await PublicEvent.findById(id);
    if (!event) {
      throw new HttpErrors.NotFound(`Мероприятие не найдено`);
    }

    checkObjectOwnership(ctx, event);

    return event;
  }

  handlers = {
    /**
     * Создание нового публичного мероприятия
     */
    createEvent: async (
      params: Params<'createEvent'>,
      ctx: IApiContext,
    ): ResultsPromise<'createEvent'> => {
      const lh = new LogHelper(this, `createEvent|${ctx.cid}`, 'info');
      const u = checkAuth(ctx);

      lh.onStart(`${ctx.userInfo} is creating event (${Utils.stringifyApiParams(params)})`);

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
      const lh = new LogHelper(this, `updateEvent|${ctx.cid}`, 'info');
      const { id } = params;

      lh.onStart(`${ctx.userInfo} is updating event (${Utils.stringifyApiParams(params)})`);

      const event = await this.getEvent(id, ctx);

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

        event.start = start.toDate();
        event.end = end.toDate();
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

      const { fromArchive, limit, offset } = params;

      let query: FilterQuery<IPublicEvent> = {
        $and: [{ user: u.id }],
      };

      const now = moment.utc();

      if (fromArchive) {
        query.$and!.push({ end: { $lt: now.toDate() } });
      } else {
        query.$and!.push({ end: { $gt: now.toDate() } });
      }

      const pgRes = await PublicEvent.paginate(query, {
        limit,
        offset,
        sort: {
          start: 'asc',
        },
      });

      return {
        ...(Utils.deleteProperties(pgRes, ['docs']) as PaginationResults),
        events: pgRes.docs.map(e => e.asPublicEventInfo()),
      };
    },
    /**
     * Получить анкету по ID
     * @param params
     * @param ctx
     */
    getEvent: async (params: Params<'getEvent'>, ctx: IApiContext): ResultsPromise<'getEvent'> => {
      const { id } = params;
      const event = await this.getEvent(id, ctx);

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
      const lh = new LogHelper(this, `createSurvey|${ctx.cid}`, 'info');

      const { name, description } = params;

      lh.onStart(`${ctx.userInfo} is creating survey (${Utils.stringifyApiParams(params)})`);

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
      const lh = new LogHelper(this, `updateSurvey|${ctx.cid}`, 'info');

      lh.onStart(`${ctx.userInfo} is updating survey (${Utils.stringifyApiParams(params)})`);

      const { id } = params;

      const survey = await Survey.findWithQuestions(id);
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

      const { limit, offset } = params;
      const pgRes = await Survey.paginate(
        { user: u.id },
        {
          limit,
          offset,
          sort: {
            // анкеты: desc по времени изменения
            updatedAt: -1,
          },
        },
      );

      return {
        ...(Utils.deleteProperties(pgRes, ['docs']) as PaginationResults),
        surveys: pgRes.docs.map(s => s.asSurveyInfo()),
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

      lh.onStart(
        `${ctx.userInfo} is creating survey question (${Utils.stringifyApiParams(params)})`,
      );

      const survey = await Survey.findById(surveyId);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }
      checkObjectOwnership(ctx, survey);

      const { text, description, answerType, answerVariants } = params;

      if (answerType !== 'YesNo') {
        if (!answerVariants || answerVariants.length < 2) {
          throw new HttpErrors.BadRequest(
            `Выбранный тип ответа на вопрос требует указания не менее двух вариантов ответа`,
          );
        }
      }

      await SurveyQuestion.getDisplayOrderForNewQuestion(surveyId);

      const sq = new SurveyQuestion({
        survey: survey.id,
        text,
        description,
        answerType,
        answerVariants,
        displayOrder: await SurveyQuestion.getDisplayOrderForNewQuestion(surveyId),
      });

      await sq.save();
      await Survey.onQuestionsChange(survey.id);

      lh.onSuccess(`questionId: ${sq.id}`);

      return {
        question: sq.asSurveyQuestionInfo(),
      };
    },
    /**
     * Получить вопрос анкеты по ID
     * @param params
     * @param ctx
     */
    getSurveyQuestion: async (
      params: Params<'getSurveyQuestion'>,
      ctx: IApiContext,
    ): ResultsPromise<'getSurveyQuestion'> => {
      const { id } = params;
      const sq = await SurveyQuestion.findWithSurvey(id);
      if (!sq) {
        throw new HttpErrors.NotFound('Вопрос анкеты не найден');
      }

      checkObjectOwnership(ctx, sq.survey);

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
      const lh = new LogHelper(this, `updateSurveyQuestion|${ctx.cid}`, 'info');

      lh.onStart(
        `${ctx.userInfo} is updating survey question (${Utils.stringifyApiParams(params)})`,
      );

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

      await sq.save();
      await Survey.onQuestionsChange(sq.survey.id);

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
      const lh = new LogHelper(this, `setSurveyQuestionsSortOrder|${ctx.cid}`, 'info');
      const { surveyId } = params;

      lh.onStart(
        `${ctx.userInfo} is setting survey questions order (${Utils.stringifyApiParams(params)})`,
      );

      const survey = await Survey.findWithQuestions(surveyId);
      if (!survey) {
        throw new HttpErrors.NotFound(`Анкета не найдена`);
      }
      checkObjectOwnership(ctx, survey);

      const { questionIDs } = params;

      for (let q of survey.questions) {
        q.displayOrder = questionIDs.indexOf(q.id);

        // лучше уж не проверять, а то бахнется на параллельном редактировании
        // оно в принципе всегда остается в более-менее годном состоянии

        // if (-1 === q.displayOrder) {
        //   throw new HttpErrors.BadRequest(
        //     `Invalid questionIDs array (existing question id is missing)`,
        //   );
        // }
      }

      for (let q of survey.questions) {
        await q.save();
      }

      await Survey.onQuestionsChange(survey.id);

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
      const lh = new LogHelper(this, `removeSurveyQuestion|${ctx.cid}`, 'info');

      lh.onStart(
        `${ctx.userInfo} is removing survey question (${Utils.stringifyApiParams(params)})`,
      );

      const { id } = params;
      const sq = await SurveyQuestion.findWithSurvey(id);
      if (!sq) {
        throw new HttpErrors.NotFound('Вопрос анкеты не найден');
      }

      checkObjectOwnership(ctx, sq.survey);

      await sq.remove();
      await Survey.onQuestionsChange(sq.survey.id);

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
        lastName,
        companyName,
        position,
        phone,
        email,
        birthday,
        gender,
      } = params.visitor;

      const middleName = params.visitor.middleName || '';

      let hashSrc = `${firstName}|${middleName}|${lastName}|${companyName}|${position}|${phone}|${email}`;

      if (birthday) {
        hashSrc += `|${birthday}`;
      }

      if (gender) {
        hashSrc += `|${gender}`;
      }

      const hash = Utils.md5(hashSrc);

      lh.write(`received from ${ctx.remoteAddress}: [${hashSrc}] -> ${hash}`);

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
                    event: event.id,
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
    /**
     * Получение иллюстративной сводки по публичным мероприятиям пользователя
     * @param params
     * @param ctx
     */
    getSummary: async (
      params: Params<'getSummary'>,
      ctx: IApiContext,
    ): ResultsPromise<'getSummary'> => {
      const summary: Results<'getSummary'>['summary'] = {
        eventCount: 0,
        actualEventCount: 0,
        totalVisitors: 0,
      };

      const u = checkAuth(ctx);

      // https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/

      let aggRes = await PublicEvent.aggregate<{
        name: string;
        end: Date;
        visitors: Array<{ count: number }>;
      }>([
        {
          $match: {
            user: mongoose.Types.ObjectId(u.id),
          },
        },
        {
          $lookup: {
            from: EventVisitor.collection.collectionName,
            as: 'visitors',
            let: { eventId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$event', '$$eventId'],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              _id: '$_id',
              end: '$end',
              name: '$name',
              visitors: '$visitors',
            },
          },
        },
      ]);

      const now = moment
        .utc()
        .toDate()
        .getTime();

      aggRes.forEach(entry => {
        const { visitors } = entry;

        summary.eventCount++;

        if (entry.end.getTime() >= now) {
          summary.actualEventCount++;
        }

        if (visitors && visitors.length > 0) {
          summary.totalVisitors += visitors[0].count;
        }
      });

      // console.log(JSON.stringify(aggRes, null, 2));

      return { summary };
    },
    /**
     * Получение ссылки для fast-track регистрации
     * @param params
     * @param ctx
     */
    getEventFastTrackLink: async (
      params: Params<'getEventFastTrackLink'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventFastTrackLink'> => {
      const { id } = params;
      const event = await this.getEvent(id, ctx);

      return {
        link: CONFIG.common.fastTrackUrlBase + `/start/${event.id}`,
      };
    },
    /**
     * Получение html-фрагмента с кодом виджета для конкр. мероприятия
     * @param params
     * @param ctx
     */
    getEventWidgetFragment: async (
      params: Params<'getEventWidgetFragment'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventWidgetFragment'> => {
      const { id } = params;
      const event = await this.getEvent(id, ctx);

      let fragments: string[] = [];

      try {
        // на фронте 0) button 1) triggers 2) embed

        for (let variant of ['button', 'triggers', 'embed']) {
          fragments.push(
            nj.renderString(
              await readTemplateFile(join(__dirname, `./widget/widget-fragment-${variant}.html`)),
              {
                eventId: event.id,
                loaderUrlBase: CONFIG.common.widgetLoadersUrlBase,
              },
            ),
          );
        }
      } catch (err) {
        this.logger.error('getEventWidgetFragment', err);
        throw new Error('Внутренняя ошибка');
      }

      return {
        fragments,
        widgetUrlBase: CONFIG.common.visitorRegWidgetUrlBase,
      };
    },
    /**
     * Получить кол-во зарегистрированных посетителей
     * @param params
     * @param ctx
     */
    getEventVisitorCount: async (
      params: Params<'getEventVisitorCount'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventVisitorCount'> => {
      const { id } = params;
      const event = await this.getEvent(id, ctx);

      return {
        count: await EventVisitor.countDocuments({ event: event.id }),
      };
    },
    /**
     * Получить зарегистрированных посетителей мероприятия
     * @param params
     * @param ctx
     */
    getEventVisitors: async (
      params: Params<'getEventVisitors'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventVisitors'> => {
      const { eventId } = params;
      const event = await this.getEvent(eventId, ctx);

      const { limit, offset, substring, sortOrder } = params;

      let query: FilterQuery<IEventVisitor> = {
        $and: [{ event: event.id }],
      };

      if (substring) {
        // $text - полнотекстовый поиск - не умеет то чего я хочу
        // надо тупо по подстроке

        const regExp = new RegExp(substring, 'i');
        query.$and!.push({
          $or: [
            { lastName: regExp },
            { firstName: regExp },
            { middleName: regExp },
            { companyName: regExp },
            { position: regExp },
            { email: regExp },
            { phone: regExp },
          ],
        });
      }

      let sort: object | undefined = undefined;

      switch (sortOrder) {
        case 'reg-timestamp-asc':
          sort = { createdAt: 'asc' };
          break;
        case 'reg-timestamp-desc':
          sort = { createdAt: 'desc' };
          break;
        case 'last-name-asc':
          sort = { lastName: 'asc' };
          break;
        case 'last-name-desc':
          sort = { lastName: 'desc' };
          break;
      }

      const pgRes = await EventVisitor.paginate(query, {
        limit,
        offset,
        sort,
      });

      return {
        ...(Utils.deleteProperties(pgRes, ['docs']) as PaginationResults),
        visitors: pgRes.docs.map(v => v.asVisitorInfo()),
      };
    },
    /**
     * Получение данных посетителя мероприятия
     * @param params
     * @param ctx
     */
    getEventVisitor: async (
      params: Params<'getEventVisitor'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventVisitor'> => {
      const { id } = params;
      const v = await EventVisitor.findById(id);
      if (!v) {
        throw new HttpErrors.NotFound(`Посетитель не найден`);
      }

      const event = await PublicEvent.findById(v.event);
      if (!event) {
        this.logger.error(`getEventVisitor: cannot find event ${v.event}`);
        throw new Error('Внутренняя ошибка');
      }

      checkObjectOwnership(ctx, event);

      const visitor: EventVisitorFullInfo = {
        ...v.asVisitorInfo(),
        eventName: event.name,
        regRemoteAddr: v.regRemoteAddress,
        uaInfo: v.uaInfo,
        surveyAnswers: [],
      };

      if (event.survey) {
        visitor.surveyAnswers = (await SurveyAnswer.findVisitorAnswers(v.id, event.survey)).map(a =>
          a.asSurveyAnswerInfo(),
        );
      }

      return {
        visitor,
      };
    },
    /**
     * Получение ответов на вопрос анкеты
     * @param params
     * @param ctx
     */
    getSurveyQuestionAnswers: async (
      params: Params<'getSurveyQuestionAnswers'>,
      ctx: IApiContext,
    ): ResultsPromise<'getSurveyQuestionAnswers'> => {
      const { surveyId, questionId } = params;

      const survey = await Survey.findWithQuestions(surveyId);
      if (!survey) throw new HttpErrors.NotFound(`Анкета не найдена`);
      checkObjectOwnership(ctx, survey);

      const answersInfo: SurveyQuestionAnswersInfo = {
        questionId,
        chosenVariants: {},
      };

      const question = survey.questions.find(q => q.id === questionId);
      if (question) {
        switch (question.answerType) {
          case 'YesNo':
            answersInfo.chosenVariants[ANSWER_YES] = 0;
            answersInfo.chosenVariants[ANSWER_NO] = 0;
            break;
          case 'OneOf':
          case 'SomeOf':
            question.answerVariants.forEach(v => (answersInfo.chosenVariants[v] = 0));
            break;
        }
      }

      let query: FilterQuery<ISurveyAnswer> = {
        survey: survey.id,
        question: mongoose.Types.ObjectId(questionId),
      };

      if (params.eventId) {
        query.event = mongoose.Types.ObjectId(params.eventId);
      }

      let answer: ISurveyAnswer | null;
      let tempValues: string[];

      const cursor = await SurveyAnswer.find(query).cursor();
      for (;;) {
        answer = await cursor.next();
        if (!answer) break;

        tempValues = [];

        if (typeof answer.value === 'boolean') {
          tempValues = [answer.value ? ANSWER_YES : ANSWER_NO];
        } else if (typeof answer.value === 'string') {
          tempValues = [answer.value];
        } else if (Array.isArray(answer.value)) {
          tempValues = answer.value.filter((v: any) => typeof v === 'string');
        }

        tempValues.forEach(v => {
          if (!answersInfo.chosenVariants[v]) {
            answersInfo.chosenVariants[v] = 1;
          } else {
            answersInfo.chosenVariants[v]++;
          }
        });
      }

      await cursor.close();

      return {
        answersInfo,
      };
    },
    /**
     * Получение информации о мероприятиях с некоторой анкетой
     * @param params
     * @param ctx
     */
    getEventsBySurvey: async (
      params: Params<'getEventsBySurvey'>,
      ctx: IApiContext,
    ): ResultsPromise<'getEventsBySurvey'> => {
      const { surveyId } = params;

      const survey = await Survey.findById(surveyId);
      if (!survey) throw new HttpErrors.NotFound(`Анкета не найдена`);
      checkObjectOwnership(ctx, survey);

      const events = await PublicEvent.find({ survey: survey.id }).sort({ start: 'asc' });

      return {
        events: events.map(e =>
          Utils.saveProperties(e.asPublicEventInfo(), ['id', 'name', 'start', 'end']),
        ),
      };
    },
  };
}
