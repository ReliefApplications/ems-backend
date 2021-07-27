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

/* Global function called on server start to initialize all the pullJobs.
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

/* Schedule or re-schedule a pullJob.
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
                    cache.set(tokenID, json.access_token, json.expires_in - 180);
                    fetchRecordsServiceToService(pullJob, settings, json.access_token);
                });
            } else {
                fetchRecordsServiceToService(pullJob, settings, token);
            }
        }
    });
    console.log('📅 Scheduled job ' + pullJob.name);
}

/* Unschedule an existing pullJob from its id.
*/
export function unscheduleJob(id: string, name?: string): void {
    const task = taskMap[id];
    if (task) {
        task.stop();
        console.log(`📆 Unscheduled job ${name ? name : id}`);
    }
}

/* FetchRecords using the hardcoded workflow for service-to-service API type (EIOS).
*/
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
        if (json && json.result) {
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
                if (json && json.result) {
                    insertRecords(json.result, pullJob);
                }
            });
        }
    });
}

/* Use the fetched data to insert records into the dB if needed.
*/
export async function insertRecords(data: any[], pullJob: PullJob): Promise<void> {
    const form = await Form.findById(pullJob.convertTo);
    if (form) {
        const records = [];
        const unicityConditions = pullJob.uniqueIdentifiers;
        // Map unicity conditions to check if we already have some corresponding records in the DB 
        const mappedUnicityConditions = unicityConditions.map(x => Object.keys(pullJob.mapping).find(key => pullJob.mapping[key] === x));
        const filters = [];
        data.forEach(element => {
            const filter = {};
            for (let index = 0; index < unicityConditions.length; index ++ ) {
                const identifier = unicityConditions[index];
                const mappedIdentifier = mappedUnicityConditions[index];
                const value = accessFieldIncludingNested(element, identifier);
                // Prevent adding new records without unique identifiers
                if (!value || typeof value !== 'string') {
                    element.__notValid = true;
                }
                Object.assign(filter, { [`data.${mappedIdentifier}`]: value });
            }
            filters.push(filter);
        });
        // Find records already existing if any
        const selectedFields = mappedUnicityConditions.map(x => `data.${x}`);
        const duplicateRecords = await Record.find({ form: pullJob.convertTo, $or: filters}).select(selectedFields);
        data.forEach(element => {
            const mappedElement = mapData(pullJob.mapping, element, form.fields);
            // Check if element is already stored in the DB and if it has unique identifiers correctly set up
            const isDuplicate = element.__notValid ? true : duplicateRecords.some(record => {
                for (const mappedIdentifier of mappedUnicityConditions) {
                    if (record.data[mappedIdentifier] !== mappedElement[mappedIdentifier]) {
                        return false;
                    }
                }
                return true;
            });
            if (!isDuplicate) {
                records.push(new Record({
                    form: pullJob.convertTo,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    data: mappedElement,
                    resource: form.resource ? form.resource : null
                }));
            }
        });
        Record.insertMany(records, {}, async () => {
            if (pullJob.channel && records.length > 0) {
                const notification = new Notification({
                    action: `${records.length} ${form.name} created from ${pullJob.name}`,
                    content: '',
                    createdAt: new Date(),
                    channel: pullJob.channel.toString(),
                    seenBy: []
                });
                await notification.save();
                const publisher = await pubsub();
                publisher.publish(pullJob.channel.toString(), { notification });
            }
        });
    }
}

/* Map the data retrieved so it match with the target Form.
*/
export function mapData(mapping: any, data: any, fields: any): any {
    const out = {};
    if (mapping) {
        for (const key of Object.keys(mapping)) {
            const identifier = mapping[key];
            if (identifier.startsWith('$$')) {
                // Put the raw string passed if it begins with $$
                out[key] = identifier.substring(2);
            } else {
                // Access field
                let value = accessFieldIncludingNested(data, identifier);
                if (Array.isArray(value) && fields.find(x => x.name === key).type === 'text') {
                    value = value.toString();
                }
                out[key] = value;
            }
        }
        return out;
    } else {
        return data;
    }
}

/* Access property of passed object including nested properties and map properties on array if needed.
*/
function accessFieldIncludingNested(data: any, identifier: string) {
    if (identifier.includes('.')) {
        // Loop to access nested elements if we have .
        const fields: any[] = identifier.split('.');
        const firstField = fields.shift();
        let value = data[firstField];
        for (const field of fields) {
            if (value) {
                if (Array.isArray(value) && isNaN(field)) {
                    value = value.flatMap(x => x ? x[field] : null);
                } else {
                    value = value[field];
                }
            } else {
                return null;
            }
        }
        return value;
    } else {
        // Map to corresponding property
        return data[identifier];
    }
}
