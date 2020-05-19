import { Request as ExpressRequest } from 'express';
import { UAParser } from 'ua-parser-js';

export type UserAgentInfo = IUAParser.IResult;

export const tryGetUAInfo = (req?: ExpressRequest): UserAgentInfo | null => {
  let res: UserAgentInfo | null = null;

  if (req) {
    try {
      res = new UAParser(req.headers['user-agent']).getResult();
    } catch (err) {
      // oops
    }
  }

  return res;
};
