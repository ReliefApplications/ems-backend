import * as dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import errors from '../../const/errors';

/*  For CORS, ALLOWED-ORIGINS param of .env file should have a format like that:
    ALlOWED_ORIGINS="<origin-1>, <origin-2>"
    Ex:
    ALLOWED_ORIGINS="http://localhost:4200, http://localhost:3000"
*/
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(', ');

export const corsMiddleware = cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = errors.invalidCORS;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
});
