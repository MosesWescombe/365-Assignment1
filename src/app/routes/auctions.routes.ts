import {Express} from "express";
import {rootUrl} from "./base.routes"
import * as auctions from '../controllers/auctions.controller';
import * as authenticationMiddleware from "../middleware/authentication.middleware";
import bodyParser from "body-parser";
import * as users from "../controllers/users.controller";
import {authenticateUserLoggedIn} from "../middleware/authentication.middleware";

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .get(auctions.viewAuctions)
        .post(authenticationMiddleware.authenticateUserLoggedIn, auctions.createAuction);
    app.route(rootUrl + '/auctions/categories')
        .get(auctions.getCategories);
    app.route(rootUrl + '/auctions/:id/bids')
        .get(auctions.viewBids)
        .post(authenticationMiddleware.authenticateUserLoggedIn, auctions.addBid);
    app.route(rootUrl + '/auctions/:id/image')
        .get(auctions.getAuctionImage)
        .put(authenticationMiddleware.authenticateUserLoggedIn, bodyParser.raw({type: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'], limit: '10mb'}), auctions.setAuctionImage);
    app.route(rootUrl + '/auctions/:id')
        .get(auctions.getAuction)
        .patch(authenticationMiddleware.authenticateUserLoggedIn, auctions.updateAuction)
        .delete(authenticationMiddleware.authenticateUserLoggedIn, auctions.deleteAuction);
};
