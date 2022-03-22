import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as Users from '../models/users.model';

const register = async (req: Request, res: Response):Promise<void> => {
    // Check that the required headers exist
    if (!isBodyOk(["email", "firstName", "lastName", "password"], res, req)) return;
    Logger.http(`POST create a user with username: ${req.body.username}`)

    try {
        const result = await Users.registerUser(req.body.email, req.body.firstName, req.body.lastName, req.body.password);
        if (result.insertId != null) {
            res.header("Content-Type", 'application/json');
            res.statusMessage = "Created";
            res.status(201).send(JSON.parse("{\"userId\": " + result.insertId + "}"));
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send("Internal Server Error");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send("Internal Server Error");
    }
};

const login = async (req: Request, res: Response):Promise<void> => {
    // Check that the required headers exist
    if (!isBodyOk(["email", "password"], res, req)) return;
    Logger.http(`POST login user: ${req.body.email}`)

    const token = generateToken();

    try {
        const userId = await Users.loginUser(req.body.email, req.body.password, token);
        if (userId != null && userId >= 0) {
            res.header("Content-Type", 'application/json');
            res.statusMessage = "OK";
            res.status(200).send(JSON.parse(`{"userId": ${userId}, "token": "${token}"}`));
        } else {
            res.statusMessage = "Bad Request"
            res.status(400).send("Incorrect email or password");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send("Internal Server Error");
    }
};

const logout = async (req: Request, res: Response):Promise<void> => {
    // Check that the required headers exist
    if (!isBodyOk(["UserId"], res, req)) return;
    Logger.http(`POST logout user with id: ${req.body.UserId}`)

    try {
        const result = await Users.logoutUser(parseInt(req.body.UserId, 10));
        if (result.affectedRows > 0) {
            res.statusMessage = "OK";
            res.status(200).send("Successfully logged out user");
        } else {
            res.statusMessage = "Bad Request";
            res.status(400).send();
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send("Internal Server Error");
    }
};

const getUser = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST Get a user with id: ${req.params.id}`)
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;

    try {
        const result = await Users.getUser(parseInt(req.params.id, 10));
        res.statusMessage = "OK";
        res.status(200).send(result[0]);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

const setCookie = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`Setting cookie`)

    try {
        res.statusMessage = "OK";
        res.header("Set-Cookie", "X-Authorization=test")
        res.status(200).send();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
};

function isBodyOk(titles: string[], res: Response, req: Request) {
    for (const title of titles) {
        if (!(req.body.hasOwnProperty(title) || req.params.hasOwnProperty(title))) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Please provide " + title + " field");
            return false;
        }
    }
    return true;
}

function generateToken() {
    // TODO generate token
    return Math.random().toString();
}

export {register, getUser, login, logout, setCookie};