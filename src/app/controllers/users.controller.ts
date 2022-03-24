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
        res.status(500).send(err);
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
        res.status(500).send(err);
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
        res.status(500).send(err);
    }
};

const getUser = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST Get a user with id: ${req.params.id}`)
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;
    const authToken = req.header("X-Authorization");

    try {
        const user = await Users.getUser(parseInt(req.params.id, 10));

        // If no user is found
        if (user === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Not Found")
        }

        let email = `, "email": "${user.email}" `;
        // Hide email if not authenticated
        if (authToken === null || user.auth_token !== authToken) {
            email = " ";
        }

        res.statusMessage = "OK";
        res.status(200).send(JSON.parse(
            `{ "firstName": "${user.first_name}", "lastName": "${user.last_name}"${email}}`
        ));
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const updateUser = async (req: Request, res: Response):Promise<void> => {
    Logger.http(`POST Update a user with id: ${req.params.id}`)
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;
    let firstName;
    let lastName;
    let email;
    let password;
    let currentPassword;

    try {
        // Check the user is trying to update only their own info
        if (parseInt(req.body.UserId, 10) !== parseInt(req.params.id, 10)) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot update details of another user");
            return;
        }

        if (req.body.hasOwnProperty("firstName")) {
            firstName = req.body.firstName;
        }
        if (req.body.hasOwnProperty("lastName")) {
            lastName = req.body.lastName;
        }
        if (req.body.hasOwnProperty("email")) {
            email = req.body.email;
        }
        if (req.body.hasOwnProperty("password")) {
            password = req.body.password;
        }
        if (req.body.hasOwnProperty("currentPassword")) {
            currentPassword = req.body.currentPassword;
        }

        const success = await Users.updateUser(parseInt(req.params.id, 10), firstName, lastName, email, password, currentPassword);
        if (success === null) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Did not update user.");
        } else if (success) {
            res.statusMessage = "OK";
            res.status(200).send("Updated user with id: " + req.params.id);
        } else {
            res.statusMessage = "Forbidden";
            res.status(403).send("Password does not match.");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
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

export {register, getUser, updateUser, login, logout};