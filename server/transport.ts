import * as nodemailer from 'nodemailer';
import * as aws from 'aws-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

// Setup Nodemailer transport
const transport = nodemailer.createTransport({
    SES: new aws.SES({
        apiVersion: '2010-12-01',
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
});

export default transport;
