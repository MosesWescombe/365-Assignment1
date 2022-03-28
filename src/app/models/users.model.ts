import {getPool} from "../../config/db";

import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const registerUser = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    const registerSQL = 'INSERT INTO user (`email`, `first_name`, `last_name`, `image_filename`, `password`) VALUES (?)';

    try {
        const [ result ] = await getPool().query(registerSQL, [[email, firstName, lastName, null, password]]);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const loginUser = async (email: string, token: string): Promise<boolean> => {
    const loginSQL = 'UPDATE user SET auth_token = ? WHERE email = ?';

    try {
        const [ result ] = await getPool().query(loginSQL, [token, email]);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const logoutUser = async (authCode: string): Promise<ResultSetHeader> => {
    const logoutSQL = 'UPDATE user SET auth_token = NULL WHERE auth_token = ?';

    try {
        const [ result ] = await getPool().query(logoutSQL, [authCode]);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getUser = async (id: number): Promise<User> => {
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

const getUserByEmail = async (email: string): Promise<User> => {
    const getSQL = 'SELECT * FROM user WHERE email = ?';

    try {
        const [ result ] = await getPool().query(getSQL, [email]);
        if (result.length > 0) return result[0];
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const updateUser = async (id: number, firstName: string, lastName: string, email: string, password: string, currentPassword: string): Promise<boolean> => {
    try {
        const bcrypt = require("bcrypt");
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
            if (databasePassword.length > 0 && bcrypt.compareSync(currentPassword, databasePassword[0].password)) {
                values.push("password='" + password);
            } else {
                return false;
            }
        }

        if (values.length > 0) {
            let valueString = "";
            for (const value of values) {
                if (valueString.length > 0) valueString += ", ";
                valueString += value + "'";
            }
            const updateSQL = `UPDATE user SET ${valueString} WHERE id=${id}`;
            const [ result ] = await getPool().query(updateSQL);
            if (result.affectedRows > 0) return true;
            return null;
        }
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getUserImage = async (id: number): Promise<string> => {
    const getSQL = 'SELECT * FROM user WHERE id = ?';

    try {
        const [ result ] = await getPool().query(getSQL, [id]);
        if (result.length > 0) return result[0].image_filename;
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const setUserImage = async (id: number, extension: string): Promise<boolean> => {
    const setSQL = 'UPDATE user SET image_filename = ? WHERE id = ?';

    try {
        const [ result ] = await getPool().query(setSQL, ["user_" + id + extension, id]);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const deleteUserImage = async (id: number): Promise<boolean> => {
    const deleteSQL = 'UPDATE user SET image_filename = NULL WHERE id = ?';

    try {
        const [ result ] = await getPool().query(deleteSQL, [id]);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

export {registerUser, loginUser, logoutUser, getUser, getUserByEmail, updateUser, getUserImage, setUserImage, deleteUserImage}