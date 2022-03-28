import {Request, Response} from "express";
import Logger from "../../config/logger";

import * as Auth from '../models/authentication.model';

/**
 * Check that a user is authorized to access an endpoint.
 * @param req Request
 * @param res Response
 * @param next Next function
 */
const authenticateUserMatch = async (req:Request, res:Response, next: () => void) => {
    try {
        const authToken = req.header("X-Authorization");
        const userId = await Auth.getUserIdFromAuthToken(authToken);
        if (userId != null && userId >= 0) {
            if (!req.params.hasOwnProperty("id")) {
                res.statusMessage = "Bad Request";
                res.status(400).send("Please supply a user id in URL");
                return;
            }
            if (userId !== parseInt(req.params.id, 10)) {
                res.statusMessage = "Forbidden";
                res.status(403).send("Forbidden");
                return;
            }
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

/**
 * Check that a user is logged in
 * @param req Request
 * @param res Response
 * @param next Next funciton to run
 */
const authenticateUserLoggedIn = async (req:Request, res:Response, next: () => void) => {
    try {
        const authToken = req.header("X-Authorization");
        const userId = await Auth.getUserIdFromAuthToken(authToken);
        if (userId != null && userId >= 0) {
            req.body.UserId = userId;
            next();
        } else {
            res.statusMessage = "Unauthorized";
            res.status(401).send("Must supply a X-Authorization header");
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send("Internal Server Error");
    }
};

export {authenticateUserLoggedIn, authenticateUserMatch};

