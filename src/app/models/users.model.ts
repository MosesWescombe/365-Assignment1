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

const getUser = async (id: number): Promise<User> => {
    Logger.info("Getting user with id: " + id + " from the database");
    const getSQL = 'SELECT * FROM user WHERE id = ?';

    try {
        const [ result ] = await getPool().query(getSQL, [id]);
        if (result.length > 0) return result[0];
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const updateUser = async (id: number, firstName: string, lastName: string, email: string, password: string, currentPassword: string): Promise<boolean> => {
    Logger.info("Updating user with id: " + id);
    try {
        const values = [];

        if (firstName !== undefined) {
            values.push("first_name='" + firstName);
        }
        if (lastName !== undefined) {
            values.push("last_name='" + lastName);
        }
        if (email !== undefined) {
            values.push("email='" + email);
        }
        if (password !== undefined && currentPassword !== undefined) {
            const [ databasePassword ] = await getPool().query(`SELECT password FROM user WHERE id=${id}`);
            Logger.info(`${databasePassword[0].password}, ${await changePasswordToHash(currentPassword)}`)
            if (databasePassword.length > 0 && databasePassword[0].password === await changePasswordToHash(currentPassword)) {
                values.push("password='" + await changePasswordToHash(password));
            } else {
                return false;
            }
        }

        Logger.info(`${firstName}, ${lastName}`)

        if (values.length > 0) {
            let valueString = "";
            for (const value of values) {
                if (valueString.length > 0) valueString += ", ";
                valueString += value + "'";
            }
            const updateSQL = `UPDATE user SET ${valueString} WHERE id=${id}`;
            Logger.info(`${updateSQL}`)
            const [ result ] = await getPool().query(updateSQL);
            if (result.affectedRows > 0) return true;
            return null;
        }
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

export {registerUser, loginUser, logoutUser, getUser, updateUser}