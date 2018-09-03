import * as fs from 'fs';
import * as path from 'path';

export const Queries = {
    // DB queries executed by Job
    update: fs.readFileSync(path.join(__dirname, 'db-queries/update.sql')).toString(),

   // Database Information
   database: fs.readFileSync(path.join(__dirname, 'db-queries/database.sql')).toString(),
};
