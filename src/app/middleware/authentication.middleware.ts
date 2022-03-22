import {Request, Response} from "express";
import Logger from "../../config/logger";

import * as Auth from '../models/authentication.model';

/**
 * Check for authorization
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req:Request, res:Response, next: () => void) => {
    try {
        const authToken = req.header("X-Authorization");
        Logger.info(`AuthToken: ${authToken}`);
        const userId = await Auth.getUserIdFromAuthToken(authToken);
        if (userId != null && userId >= 0) {
            req.body.UserId = userId;
            next();
        } else {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send("Internal Server Error");
    }
};