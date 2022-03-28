import {Express} from "express";
import {rootUrl} from "./base.routes"
import * as users from '../controllers/users.controller';
import bodyParser from "body-parser";
import {authenticateUserLoggedIn, authenticateUserMatch} from "../middleware/authentication.middleware";

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post(users.register);
    app.route(rootUrl + '/users/login')
        .post(users.login);
    app.route(rootUrl + '/users/logout')
        .post(users.logout);
    app.route(rootUrl + '/users/:id')
        .get(users.getUser)
        .patch(authenticateUserMatch, users.updateUser);
    app.route(rootUrl + '/users/:id/image')
        .get(users.getUserImage)
        .delete(authenticateUserMatch, users.deleteUserImage)
        .put(authenticateUserMatch, bodyParser.raw({type: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'], limit: '10mb'}), users.setUserImage);
};
