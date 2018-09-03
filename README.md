### Agent-X

[SQL Server on Amazon RDS](https://aws.amazon.com/rds/sqlserver/) currently supports SQL Server Agent on the Web, Enterprise and Standard editions. Thus, for situations where there is the need for the agent, clients are presented with the option of upgrading to a more pricier edition of the database to maintain parity with the existing installation or reworking their database tier logic to handle it. However, it is possible rewrite SQL Server Agent job as a Serverless function and this is what *Agent-X* attempts to show. 

##### Prerequisites
* [Serverless](https://serverless.com/)
* [Node 6.0 + ](https://nodejs.org/en/)
* An existing [Slack Webhook Integration](https://api.slack.com/incoming-webhooks)
* IAM permissions to allow for the creation of the pertinent AWS resources needed for this project.


##### Usage
* Update the `development.serverless.variables.json` file with the relevant AWS resource IDs and the Slack Webhook URL
* Commands:
    * Install dependencies: `npm install`
    * Deployment: `sls deploy --variables development.serverless.variables.json`
    * Removal: `sls remove --variables development.serverless.variables.json`


*Note: When removing a deployment of Agent-X in an existing custom VPC using the `sls remove` command, it sometimes hangs - refer to: https://github.com/serverless/serverless/issues/5252  .The workaround is for the user to log into the AWS Console to manually detach and delete the [Elastic Network Interface](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html) associated with the deployed lambda*


