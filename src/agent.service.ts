
import * as agentDao from './agent.dao';
import { Queries } from './queries';
import { ConnectionPool, IResult } from 'mssql';

import * as pSettle from 'p-settle';

/**
 * Executes sql scripts across all databases within a given RDS instance
 * @param {string} rdsInstanceEndpoint: The RDS instance endpoint
 */
export async function executeQueries(rdsInstanceEndpoint: string): Promise<void> {
    console.info('agentService.executeQueries');

    try {
        const databases = await listAvailableDatabases(rdsInstanceEndpoint);

        const databaseAlertUpdates: Array<Promise<void>> = [];
        databases.forEach((database) => {
            const update = executeQueryOnDatabase(rdsInstanceEndpoint, database);

            // Preemptively handle error to allow other database updates executions to go ahead.
            update.catch((error) => {
                console.error(`Database error. Instance Endpoint: ${rdsInstanceEndpoint} Database: ${database}`);
                console.error(error);
                return error;
            });

            databaseAlertUpdates.push(update);
        });

        await pSettle(databaseAlertUpdates);

    } catch (error) {
       throw error;
    }
}

/**
 * List all client databases with the exception of restricted system-only versions
 * within a given RDS instance. System-only databases are: master, model,
 * tempdb, msdb and rdsadmin
 * @param {string} rdsInstanceEndpoint: The RDS instance endpoint
 * @returns {Promise<string[]>}: Promise of an array of database names
 */
async function listAvailableDatabases(rdsInstanceEndpoint: string): Promise<string[]> {
    console.info('agentService.listAvailableDatabases');

    const restrictedDatabases = ['master', 'model', 'tempdb', 'msdb', 'rdsadmin'];
    let databaseList: string[] = [];
    let pool: ConnectionPool;

    // Filter out restricted databases
    try {
        pool = await agentDao.createConnectionPool(
            process.env.dbUsername,
            process.env.dbPassword,
            rdsInstanceEndpoint,
        );

        const results: IResult<{}> = await agentDao.executeQuery(pool.transaction(), 'listDatabases', Queries.database);
        const recordSet = results.recordset;
        databaseList = Object.keys(recordSet)
            .map((key) =>  recordSet[key].name)
            .filter((database) => !restrictedDatabases.includes(database));
    } catch (error) {
        console.error('unable to list databases');
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }

    return databaseList;
}

/**
 * Executes all queries against specified database.
 * @param {string} rdsInstanceEndpoint: The RDS instance endpoint
 * @param {string} database: The target database against which to execute queries
 */
async function executeQueryOnDatabase(rdsInstanceEndpoint: string, database: string): Promise<void> {
    console.info('agentService.executeQueryOnDatabase');

    let pool: ConnectionPool;

    try {
        pool = await agentDao.createConnectionPool(
            process.env.dbUsername,
            process.env.dbPassword,
            rdsInstanceEndpoint,
            database,
        );

        const queryExecutions: Array<Promise<IResult<{}>>> = [];

        Object.keys(Queries)
            .filter((name) => name !== 'database')
            .forEach((name) => {
               const invocation = agentDao.executeQuery(pool.transaction(), name, Queries[name]);

               // Preemptively handle error to allow other queries executions to go ahead.
               invocation.catch((error) => {
                   console.error(`Execution error. Query name: ${name} Database: ${database} Endpoint: ${rdsInstanceEndpoint}`);
                   console.error(error);
                   return error;
               });

               queryExecutions.push(invocation);
        });

        await pSettle(queryExecutions);

    } catch (error) {
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}
