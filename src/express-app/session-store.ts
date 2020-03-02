import { MemoryStore } from 'express-session';
import * as session from 'express-session';

export function createSessionStore() {
  return new MemoryStore();
}
