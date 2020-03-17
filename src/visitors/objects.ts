import 'ua-parser-js';

import { MinimalVisitorInfo } from '../interfaces/common-front';

export type UserAgentInfo = IUAParser.IResult;

export type VisitorInformationRecord = {
  hash: string;
  baseInfo: MinimalVisitorInfo;
  phone: string;
  email: string;
  uaInfo: UserAgentInfo | null;
  submits: number;
  ip: string | null;
};
