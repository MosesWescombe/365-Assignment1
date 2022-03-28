import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {OkPacket, ResultSetHeader, RowDataPacket} from "mysql2";

const getAuctions = async (startIndex: string, count: string, query: string, categories: string, sellerId: string, sortBy: string): Promise<Auction[]> => {
    // Create where string
    let whereString = " WHERE ";
    const wStringDefaultLength = whereString.length;
    if (sellerId !== undefined) {
        if (whereString.length > wStringDefaultLength) whereString += " AND ";
        whereString += "seller_id=" + sellerId;
    }
    if (query !== undefined) {
        if (whereString.length > wStringDefaultLength) whereString += " AND ";
        whereString += "(title LIKE '%" + query + "%' OR description LIKE '%" + query + "%')";
    }
    if (categories !== undefined && categories.length > 0) {
        if (whereString.length > wStringDefaultLength) whereString += " AND ";
        whereString += "category_id=" + categories;
    }

    // Create sort string
    let sortString = ` ORDER BY ${getSortKey(sortBy)} `;

    // Add limits
    if (count !== undefined || startIndex !== undefined) {
        if (count === undefined) count = "18446744073709551615";
        if (startIndex === undefined) startIndex = "0";
        sortString += "LIMIT " + startIndex + ", " + count;
    }

    // Clear strings if not needed
    if (whereString.length <= wStringDefaultLength) whereString = "";

    try {
        const searchSQL = `SELECT * FROM auction${whereString}${sortString};`;
        const [ result ] = await getPool().query(searchSQL);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getAuction = async (auctionId: string): Promise<Auction> => {
    try {
        const getSQL = `SELECT * FROM auction WHERE id = ${auctionId};`;
        const [ result ] = await getPool().query(getSQL);
        if (result.length > 0 ) return result[0];
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getHighestBid = async (auctionId: number): Promise<number> => {
    try {
        const allAmounts = `SELECT amount FROM auction_bid WHERE auction_id = ${auctionId}`;
        const getSQL = `SELECT amount FROM auction_bid WHERE auction_id = ${auctionId} AND amount >= ALL(${allAmounts});`;
        const [ result ] = await getPool().query(getSQL);
        if (result.length > 0 ) return result[0].amount;
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const auctionHasBidder = async (auctionId: number, bidderId: string): Promise<boolean> => {
    try {
        const getSQL = `SELECT id FROM auction_bid WHERE auction_id = ${auctionId} AND user_id = ${bidderId};`;
        const [ result ] = await getPool().query(getSQL);
        if (result.length > 0 ) return true;
        return false;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getNumBids = async (auctionId: number): Promise<number> => {
    try {
        const getSQL = `SELECT count(*) AS count FROM auction_bid WHERE auction_id = ${auctionId};`;
        const [ result ] = await getPool().query(getSQL);
        if (result.length > 0 ) return result[0].count;
        return 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const createAuction = async (title: string, description: string, categoryId: number, endDate: number, reserve: number, sellerId: number): Promise<number> => {
    try {
        if (reserve === undefined || reserve === null || reserve < 0) {
            reserve = 1;
        }
        const endDateObject = new Date(endDate);
        const endDateString = endDateObject.toISOString().replace("T", " ").replace("Z", " ");
        const createSQL = `INSERT INTO auction(category_id, description, end_date, reserve, seller_id, title) VALUES (?)`;
        const [ result ] = await getPool().query(createSQL, [[categoryId, description, endDateString, reserve, sellerId, title]]);
        return result.insertId;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const updateAuction = async (title: string, description: string, categoryId: number, endDate: number, reserve: number, auctionId: string): Promise<boolean> => {
    try {
        let updateSQL = "UPDATE auction SET ";
        const originalLength = updateSQL.length;
        if (endDate !== undefined) {
            const endDateObject = new Date(endDate);
            const endDateString = endDateObject.toISOString().replace("T", " ").replace("Z", " ");
            updateSQL += `end_date=${endDateString}`;
        }
        if (title !== undefined) {
            if (updateSQL.length > originalLength) updateSQL += ", ";
            updateSQL += `title="${title}"`;
        }
        if (description !== undefined) {
            if (updateSQL.length > originalLength) updateSQL += ", ";
            updateSQL += `description="${description}"`;
        }
        if (categoryId !== undefined) {
            if (updateSQL.length > originalLength) updateSQL += ", ";
            updateSQL += `category_id=${categoryId}`;
        }
        if (reserve !== undefined) {
            if (updateSQL.length > originalLength) updateSQL += ", ";
            updateSQL += `reserve=${reserve}`;
        }

        // Get results
        if (updateSQL.length > originalLength) {
            updateSQL += " WHERE id=" + auctionId;
            const [ result ] = await getPool().query(updateSQL);
            return result.affectedRows > 0;
        }
        return false;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const deleteAuction = async (auctionId: string): Promise<boolean> => {
    try {
        const getSQL = `DELETE FROM auction WHERE id = ${auctionId};`;
        const [ result ] = await getPool().query(getSQL);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getCategories = async (): Promise<Category[]> => {
    try {
        const getSQL = "SELECT * FROM category;";
        const [ result ] = await getPool().query(getSQL);
        return result;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getCategoryIds = async (): Promise<number[]> => {
    try {
        const getSQL = "SELECT id FROM category;";
        const [ results ] = await getPool().query(getSQL);
        const ids = [];
        for (const result of results) {
            ids.push(result.id);
        }
        return ids;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getBids = async (auctionId: string): Promise<Bid[]> => {
    try {
        const getSQL = `SELECT * FROM auction_bid WHERE auction_id=${auctionId} ORDER BY amount DESC, timestamp DESC;`;
        const [ results ] = await getPool().query(getSQL);
        const bids = [];
        for (const result of results) {
            bids.push(result);
        }
        return bids;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const createBid = async (auctionId: string, userId: string, amount: string): Promise<boolean> => {
    try {
        const createSQL = `INSERT INTO auction_bid(amount, auction_id, user_id) VALUES (?)`;
        const [ result ] = await getPool().query(createSQL, [[amount, auctionId, userId]]);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getAuctionImage = async (id: string): Promise<string> => {
    try {
        const getSQL = 'SELECT * FROM auction WHERE id = ?';
        const [ result ] = await getPool().query(getSQL, [id]);
        if (result.length > 0) return result[0].image_filename;
        return null;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const setAuctionImage = async (id: number, extension: string): Promise<boolean> => {
    try {
        const setSQL = 'UPDATE auction SET image_filename = ? WHERE id = ?';
        const [ result ] = await getPool().query(setSQL, ["auction_" + id + extension, id]);
        return result.affectedRows > 0;
    } catch (err) {
        Logger.error(err);
        throw err;
    }
};

const getSortKey = (sortBy: string) => {
    switch (sortBy) {
        case undefined:
            return "end_date ASC";
        case "ALPHABETICAL_ASC":
            return "title ASC";
        case "ALPHABETICAL_DESC":
            return "title DESC";
        case "CLOSING_SOON":
            return "end_date ASC";
        case "CLOSING_LAST":
            return "end_date DESC";
        case "RESERVE_ASC":
            return "reserve ASC";
        case "RESERVE_DESC":
            return "reserve DESC";
    }
};

export {getAuctions, createAuction, updateAuction, getAuction, getHighestBid, getNumBids, auctionHasBidder, deleteAuction, getCategories, getCategoryIds, getBids, createBid, getAuctionImage, setAuctionImage}