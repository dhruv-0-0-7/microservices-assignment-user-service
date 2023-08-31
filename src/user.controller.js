const { Router } = require("express");
const amqp = require('amqplib');

const userController = Router();

// Example Route
userController.get('/status', (req, res) => {
    res.send({ message: 'User Service Success' });
});

// Forgot Password Route
/*
    This will send a Message containing 'UserId'
    to 'SEND_MAIL' queue
    Which can later be handled by Auth Service
 */
userController.get('/forgotPassword', async (req, res) => {
    const url = process.env.RMQ_URL ?? 'amqp://localhost';
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    const queueName = 'SEND_MAIL';
    await channel.assertQueue(queueName, { durable: false });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify({
        userId: 'demo-user-id-12312'
    })));
    await channel.close();
    await connection.close();

    res.send({ message: 'Success' });
});

module.exports = userController;