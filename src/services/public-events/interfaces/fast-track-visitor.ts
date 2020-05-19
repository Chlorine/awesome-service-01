import { BasicVisitorInfo } from '../../../interfaces/common-front/public-events/index';
import { UserAgentInfo } from '../../../utils/user-agent-info';

export type FastTrackVisitorRecord = {
  hash: string;
  info: BasicVisitorInfo;
  uaInfo: UserAgentInfo | null;
  submits: number;
  ip: string | null;
};
