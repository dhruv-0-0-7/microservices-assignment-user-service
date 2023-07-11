const express = require('express');
const axios = require('axios');
const userController = require('./user.controller');

let app = express();

/*
  Applying Auth Middleware so that
  Only the Gateway can Interact with this Service
*/

if (process.env.NODE_ENV === 'production' || process.env.MODE === 'RUN_AS_SERVICE')
    app.use((req, res, next) => {
        if (!req.headers?.authorization)
            return res.status(404).send();
        const [username, password] = Buffer
            .from(req.headers.authorization.replace('Basic ', ''), 'base64')
            .toString()
            .split(':');

        if (
            username !== process.env.HTTP_AUTH_USERNAME
            ||
            password !== process.env.HTTP_AUTH_PASSWORD
        )
            return res.status(404).send();

        next();
    });

// Applying Main Controller to App
app.use(userController);

// Bootstrap function for Standalone Express Application
function bootstrapApp() {
    const PORT = process.env.PORT;

    // Express Server starts to Listen on prefixed Port
    app.listen(PORT, () => {
        console.log(`User App is up on PORT: ${PORT}`);
    });
}

// Bootstrap function for Running Express Server as a Service
function bootstrapService() {

    // Express Server starts to Listen
    app = app.listen(0, () => {
        const PORT = app.address().port;
        const [, , KEY = process.env.DEFAULT_KEY, VERSION = process.env.DEFAULT_VERSION] = process.argv;

        console.log(`User Service is up on PORT: ${PORT}`);
        registerService();

        // Sends heartBeat to Gateway
        const heartBeat = setInterval(() => {
            registerService();
        }, parseInt(process.env.HEARTBEAT_INTERVAL) * 1000);


        // Register, this service to Gateway
        async function registerService() {
            return axios({
                method: 'PUT',
                url: `${process.env.GATEWAY_URL}/service/${KEY}/${VERSION}/${PORT}`
            });
        }

        /*
            Cleanup function to...
            - Clear the Heartbeat Interval
            - Un-Register Service from Gateway
            - Terminate process
         */
        async function cleanup(err) {
            clearInterval(heartBeat);
            try {
                await axios({
                    method: 'DELETE',
                    url: `${process.env.GATEWAY_URL}/service/${KEY}/${VERSION}`
                });
            } catch (err) {
                console.error(err);
            }
            process.exit(0);
        }

        // Process listeners to handle non-programmable interruputs
        process.on('uncaughtException', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    });
}

/*
    If NODE_ENV is set to "production"
    then we can run the server as Service only
    and if it is set to "development" or it is not provided
    then we would consider the Development Environment
    and we can run the server as standalone application
    as well
 */
if (process.env.NODE_ENV === 'production')

    // Always Run As Service in Production Environment
    bootstrapService();

else {

    // If MODE is set to...
    switch (process.env.MODE) {

        case 'RUN_AS_APP':
            // Start as Standalone Express Application
            bootstrapApp();
            break;

        case 'RUN_AS_SERVICE':
            // Initialize a Service
            bootstrapService();
            break;

        default:
            console.log('Invalid environment variable "MODE".');
            break;
    }
}