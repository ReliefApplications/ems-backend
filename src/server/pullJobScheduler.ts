import { authType } from '../const/enumTypes';
import { ApiConfiguration, Form, Notification, PullJob, Record } from '../models';
import pubsub from './pubsub';
import cron from 'node-cron';
import fetch from 'node-fetch';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import NodeCache from 'node-cache';
dotenv.config();
const cache = new NodeCache();
const taskMap = {};

/* Global function called on server start to initialize all the pullJobs
*/
export default async function pullJobScheduler() {

    const pullJobs = await PullJob.find({ status: 'active' }).populate({
        path: 'apiConfiguration',
        model: 'ApiConfiguration',
    });

    for (const pullJob of pullJobs) {
        scheduleJob(pullJob);
    }
}

/* Edit an existing pullJob if authorized
*/
export function scheduleJob(pullJob: PullJob) {
    const task = taskMap[pullJob.id];
    if (task) {
        task.stop();
    }
    taskMap[pullJob.id] = cron.schedule(pullJob.schedule, () => {
        console.log('📥 Starting a pull from job ' + pullJob.name);
        const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
        if (apiConfiguration.authType === authType.serviceToService) {

            const tokenID = `bearer-token-${apiConfiguration.id}`;
            const token: string = cache.get(tokenID);
            const settings: { authTargetUrl: string, apiClientID: string, safeSecret: string, safeID: string }
            = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));
            // If token is not found from cache, retrieve it
            if (!token) {
    
                // Set up authentication request
                const details = {
                    'grant_type': 'client_credentials',
                    'client_id': settings.apiClientID,
                    'client_secret': settings.safeSecret,
                    'resource': 'https://servicebus.azure.net'
                };
                const formBody = [];
                for (const property in details) {
                const encodedKey = encodeURIComponent(property);
                const encodedValue = encodeURIComponent(details[property]);
                formBody.push(encodedKey + '=' + encodedValue);
                }
                const body = formBody.join('&');
    
                fetch(settings.authTargetUrl, {
                    method: 'post',
                    body,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': `${body.length}`
                    },
                })
                .then(res => res.json())
                .then(json => {
                    cache.set(tokenID, json.access_token, json.expires_in - 60);
                    fetchRecordsServiceToService(pullJob, settings, json.access_token);
                });
            } else {
                fetchRecordsServiceToService(pullJob, settings, token);
            }
        }
    });
    console.log('📅 Scheduled job ' + pullJob.name);
}

export function unscheduleJob(pullJob: PullJob): void {
    const task = taskMap[pullJob.id];
    if (task) {
        task.stop();
        console.log('📆 Unscheduled job ' + pullJob.name);
    }
}

function fetchRecordsServiceToService(pullJob: PullJob, settings: {
    authTargetUrl: string,
    apiClientID: string,
    safeSecret: string,
    safeID: string
}, token: string): void {
    const apiConfiguration: ApiConfiguration = pullJob.apiConfiguration;
    // === HARD CODED ENDPOINTS ===
    const boardsUrl = 'GetBoards?tags=signal';
    const articlesUrl = 'GetPinnedArticles';
    // === HARD CODED ENDPOINTS ===

    fetch(apiConfiguration.endpoint + boardsUrl, {
        method: 'get',
        headers: {
            'Authorization': 'Bearer ' + token,
            'ConsumerId': settings.safeID
        }
    })
    .then(res => res.json())
    .then(json => {
        const boardIds = json.result.map(x => x.id);
        fetch(`${apiConfiguration.endpoint}${articlesUrl}?boardIds=${boardIds}`, {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + token,
                'ConsumerId': settings.safeID
            }
        })
        .then(res => res.json())
        .then(json => {
            insertRecords(json.result, pullJob);
        });
    });
}

export async function insertRecords(data: any[], pullJob: PullJob): Promise<void> {
    const form = await Form.findById(pullJob.convertTo);
    if (form) {
        const records = [];
        const publisher = await pubsub();
        data.forEach(element => {
            records.push(new Record({
                form: pullJob.convertTo,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data: mapData(pullJob.mapping, element),
                resource: form.resource ? form.resource : null
            }));
        });
        Record.insertMany(records, {}, async () => {
            if (pullJob.channel) {
                const notification = new Notification({
                    action: `${records.length} ${form.name} created from ${pullJob.name}`,
                    content: '',
                    createdAt: new Date(),
                    channel: pullJob.channel.toString(),
                    seenBy: []
                });
                await notification.save();
                publisher.publish(pullJob.channel.toString(), { notification });
            }
        });
    }
}

export function mapData(mapping: any, data: any): any {
    return data;
}