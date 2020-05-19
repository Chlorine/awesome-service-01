import * as fs from 'fs';
import * as path from 'path';
import * as juice from 'juice';

const srcFolder = './src/services/mailer/templates';

(async () => {
  console.log(`Preparing email templates...`);

  let files = await new Promise<string[]>((resolve, reject) => {
    fs.readdir(srcFolder, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });

  files = files.filter(f => f.substr(-5).toUpperCase() === '.HTML');

  console.log(`${files.length} file(s) to process...`);

  let resHtml: string;
  let jOpts: juice.Options = {};

  for (let f of files) {
    console.log(`Working with [${f}]...`);
    resHtml = await new Promise<string>((resolve, reject) => {
      juice.juiceFile(path.join(srcFolder, f), jOpts, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    fs.writeFileSync(path.join(srcFolder, '/prepared', f), resHtml);
  }

  console.log(`Preparing email templates FINISHED`);
})();
