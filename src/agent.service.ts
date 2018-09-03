
import * as agentDao from './agent.dao';
import { Queries } from './queries';
import { ConnectionPool, IResult, RequestError } from 'mssql';
import { SettledResult } from 'p-settle';

import * as pSettle from 'p-settle';
import * as notificationService from './notification';
import * as slackService from './slack';

/**
 * Executes sql scripts across all databases within a given RDS instance
 * @param {string} rdsInstanceEndpoint: The RDS instance endpoint
 */
export async function executeQueries(rdsInstanceEndpoint: string): Promise<void> {
    console.info('agentService.executeQueries');

    try {
        const databases = await listAvailableDatabases(rdsInstanceEndpoint);

        const databaseExecutions: Array<Promise<void>> = [];
        const databaseErrors: string[] = [];

        databases.forEach((database) => {
            const update = executeQueryOnDatabase(rdsInstanceEndpoint, database);

            update.catch((error) => {
                const errorMessage = `Database error. Instance Endpoint: ${rdsInstanceEndpoint} Database: ${database} Reason: ${error}`;
                console.error(errorMessage);
                databaseErrors.push(errorMessage);
                return error;
            });

            databaseExecutions.push(update);
        });

        await pSettle(databaseExecutions);

        if (databaseErrors.length > 0) {
            await notificationService.publishMessage(slackService.buildMessageAttachment(databaseErrors));
        }

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
        if (pool && pool.connected) {
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
        const executionErrors: string[] = [];

        Object.keys(Queries)
            .filter((name) => name !== 'database')
            .forEach((name) => {
               const invocation = agentDao.executeQuery(pool.transaction(), name, Queries[name]);

               // Preemptively handle error to allow other queries executions to go ahead.
               invocation.catch((error: RequestError) => {
                   const errorMessage = `Execution error. Query name: ${name} Database: ${database} Endpoint: ${rdsInstanceEndpoint}. Reason: ${error.message}`;
                   console.error(errorMessage);
                   executionErrors.push(errorMessage);
                   return error;
               });

               queryExecutions.push(invocation);
        });

        await pSettle(queryExecutions);

        if (executionErrors.length > 0) {
            await notificationService.publishMessage(slackService.buildMessageAttachment(executionErrors));
        }

    } catch (error) {
        throw error;
    } finally {
        if (pool && pool.connected) {
           // await pool.close();
        }
    }
}
