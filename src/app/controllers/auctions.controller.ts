import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as Auctions from '../models/auctions.model';
import * as Users from '../models/users.model';
import * as Authentication from '../models/authentication.model';
import fs from "mz/fs";

const viewAuctions = async (req: Request, res: Response):Promise<void> => {
    try {
        // Check categoryId
        if (ifExists("categoryIds", req) !== undefined) {
            const categoryIds = await Auctions.getCategoryIds();
            if (!categoryIds.includes(parseInt(req.query.categoryIds.toString(), 10))) {
                res.statusMessage = "Bad Request";
                res.status(400).send("CategoryId must already exist");
                return;
            }
        }

        // Get auctions
        const auctions = await Auctions.getAuctions(
            ifExists("startIndex", req),
            ifExists("count", req),
            ifExists("q", req),
            ifExists("categoryIds", req),
            ifExists("sellerId", req),
            ifExists("sortBy", req));

        let response = `{ "auctions": [`;
        let count = 0;
        const originalResLength = response.length;
        for (const auction of auctions) {
            if (ifExists("bidderId", req) !== undefined) {
                const hasBidder = await Auctions.auctionHasBidder(auction.id, req.query.bidderId.toString());
                if (!hasBidder) continue;
            }
            count++;
            const numBids = await Auctions.getNumBids(auction.id);
            const highestBid = await Auctions.getHighestBid(auction.id);
            const seller = await Users.getUser(auction.seller_id);
            const endDateObject = new Date(auction.end_date);
            if (response.length > originalResLength) response += ", ";
            response += `{
                "auctionId": ${auction.id},
                "title": "${auction.title.replace('"', '\\"')}",
                "categoryId": ${auction.category_id},
                "sellerId": ${auction.seller_id},
                "sellerFirstName": "${seller.first_name}",
                "sellerLastName": "${seller.last_name}",
                "reserve": ${auction.reserve},
                "numBids": ${numBids},
                "highestBid": ${highestBid},
                "endDate": "${endDateObject.toISOString()}"
            }`
        }
        response += `], "count": ${count} }`
        const result = JSON.parse(response);
        // Sort by bid if requested
        if (ifExists("sortBy", req) !== undefined && req.query.sortBy.toString() in ["BIDS_ASC", "BIDS_DESC"] ) {
            result.auctions.sort((a: any, b: any) => {
                if (a.highestBid === null) return false;
                if (b.highestBid === null) return true;
                if (req.query.sortBy.toString() === "BIDS_ASC") return a.highestBid - b.highestBid;
                return b.highestBid - a.highestBid;
            });
        }

        res.contentType("application/json");
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const createAuction = async (req: Request, res: Response):Promise<void> => {
    if (!isBodyOk(["title","description","categoryId","endDate"], res, req)) return;

    // Check categoryId
    if (req.body.hasOwnProperty("categoryId")) {
        const categoryIds = await Auctions.getCategoryIds();
        if (!categoryIds.includes(parseInt(req.body.categoryId, 10))) {
            res.statusMessage = "Bad Request";
            res.status(400).send("CategoryId must already exist");
            return;
        }
    }

    const today = new Date(Date.now());
    const endDateObject = new Date(req.body.endDate.replace("/", "-").replace(" ", "T"));
    if (today > endDateObject) {
        Logger.error("Date before today")
        res.statusMessage = "Bad Request";
        res.status(400).send("Date must be in the future");
        return;
    }

    try {
        const auctionId = await Auctions.createAuction(req.body.title, req.body.description, req.body.categoryId, endDateObject.getTime(), req.body.reserve, req.body.UserId);

        if (auctionId !== null && auctionId !== undefined && auctionId >= 0) {
            res.statusMessage = "Created";
            res.status(201).send(JSON.parse(`{ "auctionId": ${auctionId} }`));
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send("Failed to create auction");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const updateAuction = async (req: Request, res: Response):Promise<void> => {
    try {
        // Check user has authority to edit, auction exists
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Cannot find auction with ID: " + req.params.id);
            return;
        }
        if (parseInt(req.body.UserId, 10) !== auction.seller_id) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot edit someone else's auction");
            return;
        }

        // Check there are no bids
        const numBids = await Auctions.getNumBids(parseInt(req.params.id, 10));
        if (numBids > 0) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot change a auction that already has bids");
            return;
        }

        // Check end date
        let endDateNumber;
        if (req.body.hasOwnProperty("endDate")) {
            const today = new Date(Date.now());
            const endDateObject = new Date(req.body.endDate.replace("/", "-").replace(" ", "T"));
            if (today > endDateObject) {
                Logger.error("Date before today")
                res.statusMessage = "Bad Request";
                res.status(400).send("Date must be in the future");
                return;
            }
            endDateNumber = endDateObject.getTime();
        }

        // Check categoryId
        if (req.body.hasOwnProperty("categoryId")) {
            const categoryIds = await Auctions.getCategoryIds();
            if (!categoryIds.includes(parseInt(req.body.categoryId, 10))) {
                res.statusMessage = "Bad Request";
                res.status(400).send("CategoryId must already exist");
                return;
            }
        }

        // Update auction
        const updated = await Auctions.updateAuction(req.body.title, req.body.description, req.body.categoryId, endDateNumber, req.body.reserve, req.params.id);
        res.statusMessage = "OK";
        if (updated) {
            res.status(200).send("Successfully updated auction");
        } else {
            res.status(200).send("No changes made");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const getAuction = async (req: Request, res: Response):Promise<void> => {
    if (!isBodyOk(["id"], res, req)) return;

    try {
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === undefined || auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Could not find auction with id: " + req.params.id);
            return;
        }

        const numBids = await Auctions.getNumBids(auction.id);
        const highestBid = await Auctions.getHighestBid(auction.id);
        const seller = await Users.getUser(auction.seller_id);
        const endDateObject = new Date(auction.end_date);
        const response = `{
                "auctionId": ${auction.id},
                "title": "${auction.title.replace('"', '\\"')}",
                "categoryId": ${auction.category_id},
                "sellerId": ${auction.seller_id},
                "sellerFirstName": "${seller.first_name}",
                "sellerLastName": "${seller.last_name}",
                "reserve": ${auction.reserve},
                "numBids": ${numBids},
                "highestBid": ${highestBid},
                "endDate": "${endDateObject.toISOString()}",
                "description": "${auction.description}"
               }`;

        res.contentType("application/json");
        res.statusMessage = "OK";
        res.status(200).send(JSON.parse(response));
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const deleteAuction = async (req: Request, res: Response):Promise<void> => {
    try {
        // Check user has authority to edit, auction exists
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Cannot find auction with ID: " + req.params.id);
            return;
        }
        if (parseInt(req.body.UserId, 10) !== auction.seller_id) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot delete someone else's auction");
            return;
        }

        // Check there are no bids
        const numBids = await Auctions.getNumBids(parseInt(req.params.id, 10));
        if (numBids > 0) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot delete a auction that already has bids");
            return;
        }

        // Delete auction
        const deleted = await Auctions.deleteAuction(req.params.id);
        if (deleted) {
            res.statusMessage = "OK";
            res.status(200).send("Successfully deleted auction");
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send("Failed to delete");
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const getCategories = async (req: Request, res: Response):Promise<void> => {
    try {
        const categories = await Auctions.getCategories();

        res.contentType("application/json");
        res.statusMessage = "OK";
        res.status(200).send(categories);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const viewBids = async (req: Request, res: Response):Promise<void> => {
    try {
        // Check auction exists
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === undefined || auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Could not find auction with id: " + req.params.id);
            return;
        }

        // Get bids
        const bids = await Auctions.getBids(req.params.id);

        let response = `[  `;
        const originalResLength = response.length;
        for (const bid of bids) {
            const bidder = await Users.getUser(bid.user_id);
            if (response.length > originalResLength) response += ", ";
            response += `{
                "bidderId": ${bid.user_id},
                "amount": ${bid.amount},
                "firstName": "${bidder.first_name}",
                "lastName": "${bidder.last_name}",
                "timestamp": "${bid.timestamp.toISOString()}"
            }`
        }
        response += `]`
        const result = JSON.parse(response);

        res.contentType("application/json");
        res.statusMessage = "OK";
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send(err);
    }
};

const addBid = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!isBodyOk(["amount"], res, req)) return;

        // Check auction exists and the bidder does not own it
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === undefined || auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Could not find auction with id: " + req.params.id);
            return;
        }
        if (auction.seller_id === parseInt(req.body.UserId, 10)) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot bid on your own auction");
            return;
        }

        // Check the end date
        const today = new Date(Date.now());
        if (auction.end_date <= today) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot bid on an expired auction");
            return;
        }

        // Check bid is high enough
        const highestBid = await Auctions.getHighestBid(parseInt(req.params.id, 10));
        if (parseInt(req.body.amount, 10) <= highestBid) {
            res.statusMessage = "Bad Request"
            res.status(400).send("The bid amount must be higher than " + highestBid);
            return;
        }

        // Add bid
        const added = await Auctions.createBid(req.params.id, req.body.UserId, req.body.amount);
        if (added) {
            res.statusMessage = "Created";
            res.status(201).send("Created new bid");
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

const getAuctionImage = async (req: Request, res: Response):Promise<void> => {
    try {
        // Check auction exists and they have permission to edit
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === undefined || auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Could not find auction with id: " + req.params.id);
            return;
        }

        // tslint:disable-next-line:no-shadowed-variable
        const fs = require("mz/fs");
        const fileSystemPath = "./storage/images/"
        const fileName: string = await Auctions.getAuctionImage(req.params.id);
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

const setAuctionImage = async (req: Request, res: Response):Promise<void> => {
    try {
        const extension = req.header("Content-Type").replace("image/", ".")

        // Check auction exists and they have permission to edit
        const auction = await Auctions.getAuction(req.params.id);
        if (auction === undefined || auction === null) {
            res.statusMessage = "Not Found";
            res.status(404).send("Could not find auction with id: " + req.params.id);
            return;
        }
        if (auction.seller_id !== await Authentication.getUserIdFromAuthToken(req.header("X-Authorization"))) {
            res.statusMessage = "Forbidden";
            res.status(403).send("Cannot alter image of another users auction");
            return;
        }

        // Check extension
        if (![".png", ".gif", ".jpg", ".jpeg"].includes(extension)) {
            res.statusMessage = "Bad Request";
            res.status(400).send("Cannot upload this image type");
            return;
        }

        // Upload image
        const fileSystemPath = "./storage/images/auction_" + req.params.id + extension;
        const buff = req.body;
        await fs.writeFile(fileSystemPath, buff);

        if (!await Auctions.setAuctionImage(parseInt(req.params.id, 10), extension)) {
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

const ifExists  = (param: string, req: Request) => {
    if (req.query.hasOwnProperty(param)) {
        switch (param) {
            case "startIndex":
                return req.query.startIndex.toString();
            case "count":
                return req.query.count.toString();
            case "q":
                return req.query.q.toString();
            case "categoryIds":
                return req.query.categoryIds.toString();
            case "sellerId":
                return req.query.sellerId.toString();
            case "bidderId":
                return req.query.bidderId.toString();
            case "sortBy":
                return req.query.sortBy.toString();
        }
    }
    return undefined;
}

export {viewAuctions, createAuction, getAuction, updateAuction, deleteAuction, getCategories, viewBids, addBid, getAuctionImage, setAuctionImage};