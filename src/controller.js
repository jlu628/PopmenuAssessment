const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const sqlite3Binding = require('sqlite3/lib/sqlite3-binding');

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
    const { MenuName, MenuInfo, RestaurantName } = req.body;
    let msg = {};
    try {
        await sqliteExec(            
            `INSERT INTO menu (MenuID, MenuInfo, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu),
                '${MenuInfo}',
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
            `SELECT RestaurantName, RestaurantInfo FROM restaurant`
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Fail to retrieve restaurants";
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
            `SELECT MenuName, MenuInfo FROM menu WHERE RestaurantID == (
                SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}')`
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Fail to retrieve menu";
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
            `SELECT menu_item.ItemName, ItemType, ItemDescription FROM menu_contains JOIN menu_item JOIN menu JOIN restaurant 
            ON menu.RestaurantID = restaurant.RestaurantID AND menu.MenuID == menu_contains.MenuID AND menu_item.RestaurantID = restaurant.RestaurantID 
            WHERE MenuName == '${MenuName}' AND RestaurantName == '${RestaurantName}'
            `
        );
        msg.success = true;
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Failed to retrieve menu items";
    }

    res.write(JSON.stringify(msg));
    res.end();
}

const addCustomer = async (req, res) => {
    const {FirstName, LastName } = req.body;
    let msg = {};
    try {
        await sqliteExec(`INSERT INTO customer (FirstName, LastName) VALUES ('${FirstName}', '${LastName}')`);
        msg.success = true;
    } catch {
        msg.success = false;
        msg.error = "Customer already exist";
    }
    res.write(JSON.stringify(msg));
    res.end();
}


const getCustomer = async (req, res) => {
    let msg = {};
    try {
        const queryRes = await sqliteGet(`SELECT * FROM customer`);
        msg.data = queryRes
    } catch {
        msg.success = false;
        msg.error = "Fail to retrive customers";
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
    const {FirstName, LastName, RestaurantName, Items } = req.body;
    let RestaurantID;
    let OrderID;
    let msg = {};

    try {
        RestaurantID = await sqliteGet(`SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}'`);
        RestaurantID = RestaurantID[0].RestaurantID;

        OrderID = await sqliteGet(`SELECT IFNULL(MAX(OrderID), 0) + 1 AS OrderID FROM customer_order`);
        OrderID = OrderID[0].OrderID;

        const weekdaySql = `(CASE CAST(STRFTIME('%w', 'now') AS INTEGER)
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                ELSE 'Saturday' 
            END)`
        await sqliteExec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            ${OrderID},
            ${RestaurantID},
            '${FirstName}',
            '${LastName}',
            ${weekdaySql}
        )`);

    } catch (err) {
        msg.success = false;
        msg.error = "Failed to add items to order";
        res.write(JSON.stringify(msg));
        res.end();
        return;
    }

    Items.forEach(async item => {
        try {
            await sqliteExec(`INSERT INTO order_contains (OrderID, RestaurantID, ItemName, Quantity) VALUES (
                ${OrderID},
                ${RestaurantID},
                '${item.ItemName}',
                '${!isNaN(item.Quantity) && item.Quantity > 0 ? item.Quantity : 1}'
            )`);
        } catch (err) {
            msg.success = false;
            msg.error = "Failed to add items to order";
            res.write(JSON.stringify(msg));
            res.end();
            return;
        }
    });

    msg.success = true;
    res.write(JSON.stringify(msg));
    res.end();
}

const getOrdersByCustomer = async (req, res) => {
    const { FirstName, LastName } = req.body;
    let queryRes = [];
    let msg = {};

    try {
        const orders = await sqliteGet(`SELECT OrderID FROM customer_order WHERE FirstName == '${FirstName}' and LastName == '${LastName}'`);
        for (const order of orders) {
            const RestaurantName = await sqliteGet(
                `SELECT RestaurantName FROM restaurant JOIN customer_order ON restaurant.RestaurantID == restaurant.RestaurantID WHERE OrderID == ${order.OrderID}`
            );
            const items = await sqliteGet(`SELECT ItemName, Quantity FROM order_contains WHERE OrderID == ${order.OrderID}`);
            orderInfo = {};
            orderInfo.RestaurantName = RestaurantName[0].RestaurantName;
            orderInfo.Items = items;
            queryRes.push(orderInfo);
        }
        msg.data = queryRes;
        msg.success = true;
    } catch (err) {
        msg.success = false;
        msg.error = "Failed to retrive orders";
    }
    res.write(JSON.stringify(msg));
    res.end();
}

const getOrdersByRestaurant = async (req, res) => {
    const { RestaurantName } = req.body;
    let queryRes = [];
    let msg = {};

    try {
        let RestaurantID  = await sqliteGet(`SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}'`);
        RestaurantID = RestaurantID[0].RestaurantID;
        const orders = await sqliteGet(`SELECT OrderID, FirstName, LastName FROM customer_order WHERE RestaurantID == ${RestaurantID}`);

        for (const order of orders) {
            const items = await sqliteGet(`SELECT ItemName, Quantity FROM order_contains WHERE OrderID == ${order.OrderID}`);
            orderInfo = {};
            orderInfo.FirstName = order.FirstName;
            orderInfo.LastName = order.FirstName;
            orderInfo.Items = items;
            queryRes.push(orderInfo);
        }
        msg.data = queryRes;
    } catch (err) {
        msg.success = false;
        msg.error = "Fail to retrive orders";
    }
    res.write(JSON.stringify(msg));
    res.end();
}

// Predict the likelihood of a customer visiting the restaurant on each day of the week and the likelihood he/she will order a dish
const predict = async (req, res) => {
    const { FirstName, LastName, RestaurantName } = req.body;
    let queryRes = {};
    let msg = {};

    try {
        let RestaurantID  = await sqliteGet(`SELECT RestaurantID FROM restaurant WHERE RestaurantName == '${RestaurantName}'`);
        RestaurantID = RestaurantID[0].RestaurantID;
        const orders = await sqliteGet(
            `SELECT Weekday, OrderID FROM customer_order WHERE FirstName == '${FirstName}' and LastName == '${LastName}' AND RestaurantID == ${RestaurantID}`
        );
        let weekdays = {
            'Monday': 0, 
            'Tuesday': 0,
            'Wednesday':0,
            'Thursday':0,
            'Friday':0,
            'Saturday':0,
            'Sunday':0
        };
        let items = {};
        
        for (const order of orders) {
            weekdays[order.Weekday] ++;
            const orderItems = await sqliteGet(`SELECT ItemName, Quantity FROM order_contains WHERE OrderID == ${order.OrderID}`);
            orderItems.forEach(item => {
                items[item.ItemName] = items[item.ItemName] ? items[item.ItemName] + item.Quantity : item.Quantity;
            });
        }

        // Normalize probabilities
        let weekdaySum = 0;
        for (const weekday in weekdays) {
            weekdaySum += weekdays[weekday];
        }
        for (const weekday in weekdays) {
            weekdays[weekday] /= weekdaySum;
        }

        let itemSum = 0;
        for (const item in items) {
            itemSum += items[item];
        }
        for (const item in items) {
            items[item] /= itemSum;
        }
        queryRes.weekdays = weekdays;
        queryRes.items = items;
        msg.data = queryRes;
        msg.success = true;

    } catch {
        msg.success = false;
        msg.error = "Operation failed";
    }
    res.write(JSON.stringify(msg));
    res.end();
}

exports.addRestaurant = addRestaurant;
exports.addMenu = addMenu;
exports.addMenuItem = addMenuItem;
exports.addItemToMenu = addItemToMenu;

exports.getRestaurants = getRestaurants;
exports.getMenu = getMenu;
exports.getMenuItems = getMenuItems;

exports.addCustomer = addCustomer;
exports.getCustomer = getCustomer;

exports.order = order;
exports.getOrdersByCustomer = getOrdersByCustomer;
exports.getOrdersByRestaurant = getOrdersByRestaurant;
exports.predict = predict;