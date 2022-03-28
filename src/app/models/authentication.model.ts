import {getPool} from "../../config/db";
import Logger from "../../config/logger";

const getUserIdFromAuthToken = async (authToken: string): Promise<number> => {
    const getUserId = 'SELECT id FROM user WHERE auth_token=?';

    try {
        const [ result ] = await getPool().query(getUserId, [authToken]);
        if (result.length > 0) return result[0].id;
        return -1;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const userLoggedIn = async (authToken: string): Promise<boolean> => {
    const getUserId = 'SELECT id FROM user WHERE auth_token=?';

    try {
        const [ result ] = await getPool().query(getUserId, [authToken]);
        return result.length > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

export {getUserIdFromAuthToken, userLoggedIn};