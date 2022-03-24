const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite')

const sqliteExec = async (sql) => {
    const db = await open({
        filename: path.join(__dirname, './MenuManagement.db'),
        driver: sqlite3.Database
    });
    await db.get("PRAGMA foreign_keys = ON");    

    try {
        await db.exec(sql);
    } catch (err) {
        // console.log(err)
        await db.close();
        throw err;
    }
    await db.close();
}

const sqliteGet = async (sql) => {
    const db = await open({
        filename: path.join(__dirname, './MenuManagement.db'),
        driver: sqlite3.Database
    });
    await db.get("PRAGMA foreign_keys = ON");    

    let res;
    try {
        res = await db.all(sql);
    } catch (err) {
        // console.log(err)
        await db.close();
        throw err;
    }
    await db.close();
    return res;
}

const addRestaurant = async (req, res) => {
    const { RestaurantName, RestaurantInfo } = req.body;
    let msg = {};
    try {
        await sqliteExec(            
            `INSERT INTO restaurant (RestaurantID, RestaurantName, restaurantInfo) VALUES (
                (SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 
                '${RestaurantName}', 
                '${RestaurantInfo}'
            )`
        )
        msg.success = true;
    } catch (err) {
        msg.success = false;
        msg.error = "A restaurant with same name already exists in the database."
    }

    res.write(JSON.stringify(msg));
    res.end();
};

const addMenu = async (req, res) => {
    const { MenuName, RestaurantName } = req.body;
    let msg = {};
    try {
        await sqliteExec(            
            `INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 
                '${MenuName}', 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}')
            )`
        )
        msg.success = true;
    } catch (err) {
        msg.success = false;
        msg.error = "Fail to add menu to restaurant."
    }

    res.write(JSON.stringify(msg));
    res.end();
};

const addMenuItem = async (req, res) => {
    const { ItemName, ItemType, ItemDescription, RestaurantName } = req.body;
    let msg = {};
    try {
        const sql = ItemType ? 
        `INSERT INTO menu_item (ItemName, ItemType, ItemDescription, RestaurantID) VALUES (
            '${ItemName}', 
            '${ItemType}',
            '${ItemDescription}',
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}')
        )` : 
        `INSERT INTO menu_item (ItemName, ItemType, RestaurantID) VALUES (
            '${ItemName}',
            null,
            '${ItemDescription}',
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}')
        )`;
        
        await sqliteExec(sql);
        msg.success = true;
    } catch (err) {
        msg.success = false;
        msg.error = "Failt to add menu item";
    }

    res.write(JSON.stringify(msg));
    res.end();
};

const addItemToMenu = async (req, res) => {
    const { ItemName, MenuName, RestaurantName } = req.body;
    let msg = {};
    try {
        await sqliteExec(            
            `INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu join restaurant on menu.RestaurantID = restaurant.RestaurantID WHERE MenuName == '${MenuName}' and RestaurantName == '${RestaurantName}'), 
                (SELECT RestaurantId FROM restaurant WHERE RestaurantName == '${RestaurantName}'),
                '${ItemName}')`
        )
        msg.success = true;
    } catch (err) {
        msg.success = false;
        msg.error = "Menu item already exists in the database";
    }

    res.write(JSON.stringify(msg));
    res.end();
};

const getRestaurants = async (req, res) => {
    let queryRes;
    let msg = {};
    try {
        queryRes = await sqliteGet(
            `SELECT * FROM restaurant`
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Menu item already exists in the database";
    }

    res.write(JSON.stringify(msg));
    res.end();
}

const getMenu = async (req, res) => {
    const { RestaurantName } = req.body;
    let queryRes;
    let msg = {};
    try {
        queryRes = await sqliteGet(
            `SELECT * FROM menu WHERE RestaurantID == (
                SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}')`
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Menu item already exists in the database";
    }

    res.write(JSON.stringify(msg));
    res.end();
}

const getMenuItems = async (req, res) => {
    const { MenuName, RestaurantName } = req.body;
    let queryRes;
    let msg = {};
    try {
        queryRes = await sqliteGet(
            `SELECT ItemName FROM menu_contains JOIN menu JOIN restaurant 
            ON menu.RestaurantID = restaurant.RestaurantID AND menu.MenuID == menu_contains.MenuID
            WHERE MenuName == '${MenuName}' AND RestaurantName == '${RestaurantName}'
            `
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Item already in the menu";
    }

    res.write(JSON.stringify(msg));
    res.end();
}

/**
* A diner can order a dinner salad one of two ways:
*      As a standalone dish, with selection of dressing
*      As a side of an entree, with selection of dressing
* A diner can order a side of any dressing with any appetizer or entree
*/
const order = async (req, res) => {


}

exports.addRestaurant = addRestaurant;
exports.addMenu = addMenu;
exports.addMenuItem = addMenuItem;
exports.addItemToMenu = addItemToMenu;
exports.getRestaurants = getRestaurants;
exports.getMenu = getMenu;
exports.getMenuItems = getMenuItems;
exports.order = order;