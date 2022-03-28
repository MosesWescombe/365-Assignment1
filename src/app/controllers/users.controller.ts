import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as Users from '../models/users.model';
import fs from "mz/fs";
import { uid } from 'rand-token';
import * as passwords from "../passwords/passwords";

const register = async (req: Request, res: Response):Promise<void> => {
    // Check that the required headers exist
    if (!isBodyOk(["email", "firstName", "lastName", "password"], res, req)) return;

    try {
        // Check email and password
        if (!emailOk(req.body.email)) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Incorrect email format");
            return;
        }
        if (await emailExists(req.body.email)) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Email already exists");
            return;
        }
        if (req.body.password.length <= 0) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Password must be at least one character long");
            return;
        }

        const result = await Users.registerUser(req.body.email, req.body.firstName, req.body.lastName, await passwords.hash(req.body.password));
        Logger.info(await passwords.hash(req.body.password) + ", " + await passwords.hash(req.body.password));
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

    const token = generateToken();

    try {
        // Check email
        const user = await Users.getUserByEmail(req.body.email);
        if (user === undefined || user == null) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Incorrect email");
            return;
        }

        // Check password
        const bcrypt = require("bcrypt");
        if (!bcrypt.compareSync(req.body.password, user.password)) {
            res.statusMessage = "Bad Request"
            res.status(400).send("Incorrect password");
            return;
        }

        const loggedIn = await Users.loginUser(req.body.email, token);
        if (loggedIn) {
            res.header("Content-Type", 'application/json');
            res.statusMessage = "OK";
            res.status(200).send(JSON.parse(`{"userId": ${user.id}, "token": "${token}"}`));
        } else {
            res.statusMessage = "Bad Request"
            res.status(400).send("Incorrect email");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const logout = async (req: Request, res: Response):Promise<void> => {
    try {
        const token = req.header("X-Authorization");
        if (token === null || token === undefined) {
            res.statusMessage = "Unauthorized";
            res.status(401).send("Need to supply an X-Authorization header");
            return;
        }
        await Users.logoutUser(token);
        res.statusMessage = "OK";
        res.status(200).send("Successfully logged out user");
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const getUser = async (req: Request, res: Response):Promise<void> => {
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;
    const authToken = req.header("X-Authorization");

    try {
        const user = await Users.getUser(parseInt(req.params.id, 10));

        // If no user is found
        if (user === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Not Found")
            return;
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
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;
    let firstName;
    let lastName;
    let email;
    let password;
    let currentPassword;

    try {
        if (req.body.hasOwnProperty("firstName")) {
            firstName = req.body.firstName;
        }
        if (req.body.hasOwnProperty("lastName")) {
            lastName = req.body.lastName;
        }
        if (req.body.hasOwnProperty("email")) {
            // Check email and password
            if (!emailOk(req.body.email)) {
                res.statusMessage = "Bad Request"
                res.status(400).send("Incorrect email format");
                return;
            }
            if (await emailExists(req.body.email)) {
                res.statusMessage = "Bad Request"
                res.status(400).send("Email already exists");
                return;
            }
            email = req.body.email;
        }
        if (req.body.hasOwnProperty("password")) {
            if (req.body.password.length <= 0) {
                res.statusMessage = "Bad Request"
                res.status(400).send("Password must be at least one character long");
                return;
            }
            password = await passwords.hash(req.body.password);
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

const setUserImage = async (req: Request, res: Response):Promise<void> => {
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;

    try {
        const extension = req.header("Content-Type").replace("image/", ".")

        // Check extension
        if (![".png", ".gif", ".jpg", ".jpeg"].includes(extension)) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Cannot upload this image type");
            return;
        }

        const fileSystemPath = "./storage/images/user_" + req.params.id + extension;
        const buff = req.body;
        await fs.writeFile(fileSystemPath, buff);

        if (!await Users.setUserImage(parseInt(req.params.id, 10), extension)) {
            res.statusMessage = "Ok";
            res.status(200).send("Image updated");
            return;
        }

        res.statusMessage = "Created";
        res.status(201).send("Added image to database");
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const getUserImage = async (req: Request, res: Response):Promise<void> => {
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;

    try {
        // tslint:disable-next-line:no-shadowed-variable
        const fs = require("mz/fs");
        const fileSystemPath = "./storage/images/"
        const fileName: string = await Users.getUserImage(parseInt(req.params.id, 10));
        if (fileName === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("No user was found with Id: " + req.params.id);
            return;
        }

        if (await fs.exists(fileSystemPath + fileName)) {
            const file = await fs.readFile(fileSystemPath + fileName, fs.binaryType);
            res.contentType("image/jpeg")
            res.statusMessage = "OK";
            res.status(200).send(file);
        } else {
            res.statusMessage = "Not Found";
            res.status(404).send("File not found.");
            Logger.error("File '" + fileName + "' not found");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const deleteUserImage = async (req: Request, res: Response):Promise<void> => {
    // Check that the required body headers exist
    if (!isBodyOk(["id"], res, req)) return;

    try {
        const fileSystemPath = "./storage/images/"
        const fileName: string = await Users.getUserImage(parseInt(req.params.id, 10));
        if (fileName === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("No user was found with Id: " + req.params.id);
            return;
        }

        if (await fs.exists(fileSystemPath + fileName)) {
            await fs.unlink(fileSystemPath + fileName);
            await Users.deleteUserImage(parseInt(req.params.id, 10));
            res.statusMessage = "OK";
            res.status(200).send("Image deleted");
        } else {
            res.statusMessage = "Not Found";
            res.status(404).send("File not found.");
            Logger.error("File '" + fileName + "' not found");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

function emailOk(email: string) {
    return email.includes("@");
}

const emailExists = async (email: string): Promise<boolean> => {
    const user = await Users.getUserByEmail(email);
    return !(user === undefined || user === null);
}

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
    const token = uid(12);
    return token;
}

export {register, getUser, updateUser, login, logout, getUserImage, setUserImage, deleteUserImage};