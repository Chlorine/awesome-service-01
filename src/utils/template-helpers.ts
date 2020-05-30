import { readFile } from 'fs';

import * as NJ from 'nunjucks';

export const nj = new NJ.Environment(null, { autoescape: true });

export const readTemplateFile = async (file: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    readFile(file, (err, data) => {
      if (err) return reject(err);
      resolve(data.toString());
    });
  });
};

export const readOptionalTemplateFile = async (file: string): Promise<string | null> => {
  try {
    return await readTemplateFile(file);
  } catch (err) {
    // nothing
  }

  return null;
};
