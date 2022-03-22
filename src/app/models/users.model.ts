import {getPool} from "../../config/db";
import fs from 'mz/fs';
import * as defaultUsers from "../resources/default_users.json"

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";
import logger from "../../config/logger";

const registerUser = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    Logger.info("Adding user to database " + email);
    const registerSQL = 'INSERT INTO user (`email`, `first_name`, `last_name`, `image_filename`, `password`) VALUES (?)';

    try {
        const [ result ] = await getPool().query(registerSQL, [[email, firstName, lastName, null, await changePasswordToHash(password)]]);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const loginUser = async (email: string, password: string, token: string): Promise<number> => {
    Logger.info("Attempting to log user in with email: " + email);
    const loginSQL = 'UPDATE user SET auth_token = ? WHERE email = ? AND password = ?';

    try {
        await getPool().query(loginSQL, [token, email, await changePasswordToHash(password)]);
        const [ result ] = await getPool().query("SELECT id FROM user WHERE email=? AND password=?", [email, await changePasswordToHash(password)]);
        if (result.length > 0) return result[0].id;
        return -1;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const logoutUser = async (userId: number): Promise<ResultSetHeader> => {
    Logger.info(`Attempting to logout user with ID: ${userId}`);
    const logoutSQL = 'UPDATE user SET auth_token = NULL WHERE id = ?';

    try {
        const [ result ] = await getPool().query(logoutSQL, [userId]);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getUser = async (id: number): Promise<User[]> => {
    Logger.info("Getting user with id: " + id + " from the database");
    const getSQL = 'SELECT * FROM user WHERE id = ?';

    try {
        const [ result ] = await getPool().query(getSQL, [id]);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

async function changePasswordToHash(password: any) {
    // TODO you need to implement "passwords.hash()" yourself, then uncomment the line below.
    // user[passwordIndex] = await passwords.hash(user[passwordIndex]);

    // It is recommended you use a reputable cryptology library to do the actual hashing/comparing for you...
    return password;
}

export {registerUser, loginUser, logoutUser, getUser}