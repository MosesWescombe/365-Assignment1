import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as users from '../controllers/users.controller';
import authenticationMiddleware from "../middleware/authentication.middleware";

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post(users.register);
    app.route(rootUrl + '/users/login')
        .post(users.login);
    app.route(rootUrl + '/users/logout')
        .post(authenticationMiddleware, users.logout);
    // app.route(rootUrl + '/users/:id')
    //     .get(users.getUser);
    // app.route(rootUrl + '/users/:id/image')
    //     .get(users.getUserImage);
};
