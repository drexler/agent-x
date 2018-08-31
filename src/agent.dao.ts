import {ConnectionPool, Transaction, ISOLATION_LEVEL, IResult} from 'mssql';

/**
 * Creates a database connection pool
 * @param {string} user: The username to associated with the database
 * @param {string} password: The user's password
 * @param {string} server: The database server instance URI
 * @param {string} [database]: The database name
 * @returns {ConnectionPool}: The connection pool to the database
 */
export function createConnectionPool(user: string, password: string, server: string, database?: string): Promise<ConnectionPool> {
    console.info('agentDao.createConnectionPool');

    const config: any = {
        user,
        password,
        server,
        database,
        port: 1433,
        options: {
            encrypt: false,
            abortTransactionOnError: true,
        },
    };

    if (database) {
        config.database = database;
    }

    return new ConnectionPool(config).connect();

}

/**
 * Executes a SQL query on a given database connection
 * @param {Transaction} transaction: The connection to the database
 * @param {string} queryName: The name of the SQL script to be executed
 * @param {string} sqlQuery: The SQL script to be executed
 * @returns {Promise<IResult<{}>>}: Promise of the query's execution result set
 */
export function executeQuery(transaction: Transaction, queryName: string, sqlQuery: string): Promise<IResult<{}>> {
    console.info('agentDao.executeQuery');

    transaction.on('begin', () => console.info(`transaction begun: ${queryName}`));
    transaction.on('commit', () => console.info(`transaction committed: ${queryName}`));
    transaction.on('rollback', () => console.info(`transaction rolledback ${queryName}`));

    return new Promise((resolve, reject) => {
        transaction.begin(ISOLATION_LEVEL.READ_COMMITTED, (err) => {
            if (err) {
                reject(err);
            } else {

                const request = transaction.request();
                request.query(sqlQuery, (cmdExecutionError, results) => {
                    if (cmdExecutionError) {
                        reject(cmdExecutionError);
                    } else {
                        transaction.commit((commitError) => {
                            if (commitError) {
                                reject(commitError);
                            } else {
                                console.log(`Success: ${queryName}`);
                                console.log(`${results.rowsAffected[0]} rows affected`);
                                resolve(results);
                            }
                        });
                    }
                });
            }
        });

    });
}
