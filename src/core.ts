import { createExpressApp } from './express-app/app';
import { Database, db } from './db/db';

import { API } from './api';
import { routeApi } from './express-app/route-api';
import { Env } from './utils/env';

export class Core {
  db: Database;
  api: API;

  constructor() {
    this.db = db;
    this.api = new API(this.db);
  }

  async init() {
    await this.db.init();

    const expressApp = createExpressApp({
      httpPort: Env.getInt('PORT', 3000),
      cookieSecret: 'Awesome01@$^!',
      routes: [{ path: '/api', routeMatcher: routeApi(this.api) }],
    });

    // TODO: добавить офигенной логики на вебсокет

    console.log('Service init complete');
  }
}
