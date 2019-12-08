export class Database {
  constructor() {}

  async init() {
    console.log('Database init complete');
  }
}

export const db = new Database();
