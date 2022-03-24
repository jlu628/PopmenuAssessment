const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const setup = require('../setup');
const axios = require('axios')

describe("Restaurant-Menu-Item schema tests", ()=>{
    let db;
    beforeEach(async () => {
        await setup();
        db = await open({
            filename: path.join(__dirname, '../MenuManagement.db'),
            driver: sqlite3.Database
        });
        await db.get("PRAGMA foreign_keys = ON");
    });
    afterEach(async () => {
        await db.close();
    });

    it("Database setup", async () => {
        let tables = await db.all("select name from sqlite_master where type='table'");
        tables = tables.map(table=>table.name);
        expect(tables.length).toBe(7);
        expect(tables).toContainEqual('restaurant');
        expect(tables).toContainEqual('menu');
        expect(tables).toContainEqual('menu_item');
        expect(tables).toContainEqual('menu_contains');

        expect(tables).toContainEqual('customer');
        expect(tables).toContainEqual('customer_order');
        expect(tables).toContainEqual('order_contains');

    });

    it("Insert restaurants", async () => {
        for (let i = 0; i < 3; i++) {
            await db.exec(
                `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant${i+1}', 'Description${i+1}')`
                );
        }

        let restaurants = await db.all(`SELECT * from restaurant`);
        expect(restaurants.length).toBe(3);
        expect(restaurants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({RestaurantName: 'restaurant1'}),
                expect.objectContaining({RestaurantName: 'restaurant2'}),
                expect.objectContaining({RestaurantName: 'restaurant3'}),
            ])
        );
    });

    it("Insert menus", async () => {
        /*
        restaurant1:
            Menu1
            Menu2
            Menu3
        restaurant2:

        */
        for (let i = 0; i < 2; i++) {
            await db.exec(
                `INSERT INTO restaurant (RestaurantID, RestaurantName, restaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant${i+1}', 'Description${i+1}')`
                );
        }
        const restaurant1 = await db.get(
            `SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant1'`
            )
        
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES ((SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 'Menu${i+1}', ${restaurant1.RestaurantID})`);
        }

        let restaurant1_menus = await db.all(
            `SELECT * from menu JOIN restaurant on menu.RestaurantID = restaurant.RestaurantID WHERE restaurant.RestaurantName == 'restaurant1'`
            );
        expect(restaurant1_menus.length).toBe(3);
        expect(restaurant1_menus).toEqual(
            expect.arrayContaining([
                expect.objectContaining({MenuName: 'Menu1'}),
                expect.objectContaining({MenuName: 'Menu2'}),
                expect.objectContaining({MenuName: 'Menu3'}),
            ])
        );

        let restaurant2_menus = await db.all(
            `SELECT * from menu JOIN restaurant on menu.RestaurantID = restaurant.RestaurantID WHERE restaurant.RestaurantName == 'restaurant2'`
            );
        expect(restaurant2_menus.length).toBe(0);
    });

    it("Insert menu items", async () => {
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant', 'Description')`
            );
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'menu item${i+1}',
                'description${i+1}',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant'))`
            );
        }

        let items = await db.all(`SELECT * from menu_item`);
        expect(items.length).toBe(3);
        expect(items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'menu item1'}),
                expect.objectContaining({ItemName: 'menu item2'}),
                expect.objectContaining({ItemName: 'menu item3'}),
            ])
        );
    });

    it("Insert duplicated menu items", async () => {
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant', 'Description')`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'menu item',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant'))`
            );        
            const insert = async () => await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'menu item',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant'))`
            );   
        await expect(insert()).rejects.toThrow();
    });

    it("Insert menu items of wrong type", async () => {

        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant', 'Description')`
        );
        const insert = async () => await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, ItemType, RestaurantID) VALUES (
                'menu item',
                'description',
                'wrong type',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant'))`
            );       
        await expect(insert()).rejects.toThrow();
    });

    it("Insert item to menus", async () => {
        /*
        restaurant1:
            Menu1:
                item1
                item2
            Menu2:

        restaurant2:
            Menu1:
                item2
        */
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, restaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant1', 'Description1')`
            );
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, restaurantInfo) VALUES ((SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 'restaurant2', 'Description2')`
            );
        const restaurant1 = await db.get(
            `SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant1'`
            )
        const restaurant2 = await db.get(
            `SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'restaurant2'`
            )

        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES ((SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 'Menu1', ${restaurant1.RestaurantID})`);
        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES ((SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 'Menu2', ${restaurant1.RestaurantID})`);
        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES ((SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 'Menu1', ${restaurant2.RestaurantID})`);
        const restaurant1Menu1 = await db.get(
            `SELECT MenuID from Menu where RestaurantID == ${restaurant1.RestaurantID} and MenuName == 'Menu1'`
            )
        const restaurant1Menu2 = await db.get(
            `SELECT MenuID from Menu where RestaurantID == ${restaurant1.RestaurantID} and MenuName == 'Menu2'`
            )
        const restaurant2Menu1 = await db.get(
            `SELECT MenuID from Menu where RestaurantID == ${restaurant2.RestaurantID} and MenuName == 'Menu1'`
            )

        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, ItemType, RestaurantID) VALUES (
            'item1',
            'description',
            'dressing',
            ${restaurant1.RestaurantID}
            )`
        );

        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, ItemType, RestaurantID) VALUES (
            'item2',
            'description',
            'salad',
            ${restaurant1.RestaurantID}
            )`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, ItemType, RestaurantID) VALUES (
            'item2',
            'description',
            'entree',
            ${restaurant2.RestaurantID}
            )`
        );

        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (${restaurant1Menu1.MenuID}, ${restaurant1.RestaurantID}, 'item1')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (${restaurant1Menu1.MenuID}, ${restaurant1.RestaurantID}, 'item2')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (${restaurant2Menu1.MenuID}, ${restaurant2.RestaurantID}, 'item2')`);
        
        const restaurant1Menu1Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restaurant1Menu1.MenuID}`
        );
        const restaurant1Menu2Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restaurant1Menu2.MenuID}`
        );
        const restaurant2Menu1Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restaurant2Menu1.MenuID}`
        );

        expect(restaurant1Menu1Items.length).toBe(2);
        expect(restaurant1Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item1'}),
                expect.objectContaining({ItemName: 'item2'})
            ])
        );

        expect(restaurant1Menu2Items.length).toBe(0);

        expect(restaurant2Menu1Items.length).toBe(1);
        expect(restaurant2Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item2'}),
            ])
        );
    });
});

describe("Customer-Order schema tests", ()=>{
    /**
     * Restaurant1
     *      Menu1
     *          Item1
     *          Item2
     *      Menu2
     *          Item1
     *          Item3
     * 
     * Restaurant2
     *      Menu1
     *          Item1
     *      Menu2
     *          Item2
     */

    let db;
    beforeEach(async () => {
        await setup();
        db = await open({
            filename: path.join(__dirname, '../MenuManagement.db'),
            driver: sqlite3.Database
        });
        await db.get("PRAGMA foreign_keys = ON");

        // Restaurants
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES (
                (SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 
                'Restaurant1', 
                'Description1'
            )`
            );
        await db.exec(
            `INSERT INTO restaurant (RestaurantID, RestaurantName, RestaurantInfo) VALUES (
                (SELECT IFNULL(MAX(RestaurantID), 0) + 1 FROM restaurant), 
                'Restaurant2', 
                'Description2'
            )`
            );

        // Menus
        await db.exec(
            `INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 
                'Menu1', 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1')
            )`
        );
        await db.exec(
            `INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 
                'Menu2', 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1')
            )`
        );
        await db.exec(
            `INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 
                'Menu1', 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2')
            )`
        );
        await db.exec(
            `INSERT INTO menu (MenuID, MenuName, RestaurantID) VALUES (
                (SELECT IFNULL(MAX(MenuID), 0) + 1 FROM menu), 
                'Menu2', 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2')
            )`
        );

        // Items
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'Item1',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1')
            )`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'Item2',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1')
            )`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'Item3',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1')
            )`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'Item1',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2')
            )`
        );
        await db.exec(`INSERT INTO menu_item (ItemName, ItemDescription, RestaurantID) VALUES (
                'Item2',
                'description',
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2')
            )`
        );

        // Menu-item
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant1' AND MenuName = 'Menu1'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1'), 
                'Item1'
            )`
        );
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant1' AND MenuName = 'Menu1'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1'), 
                'Item2'
            )`
        );
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant1' AND MenuName = 'Menu2'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1'), 
                'Item1'
            )`
        );
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant1' AND MenuName = 'Menu2'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant1'), 
                'Item3'
            )`
        );
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant2' AND MenuName = 'Menu1'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2'), 
                'Item1'
            )`
        );
        await db.exec(`INSERT INTO menu_contains (MenuID, RestaurantID, ItemName) VALUES (
                (SELECT MenuID FROM menu JOIN restaurant ON menu.RestaurantID = restaurant.RestaurantID WHERE RestaurantName == 'Restaurant2' AND MenuName = 'Menu2'), 
                (SELECT RestaurantID FROM restaurant WHERE RestaurantName == 'Restaurant2'), 
                'Item2'
            )`
        );
    });

    afterEach(async () => {
        await db.close();
    });

    it('Insert customer', async () => {
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName1', 'LastName1')`);
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName2', 'LastName2')`);

        const customers = await db.all(`SELECT * FROM customer`);
        expect(customers.length).toBe(2);
        expect(customers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({FirstName: 'FirstName1', LastName: 'LastName1'}),
                expect.objectContaining({FirstName: 'FirstName2', LastName: 'LastName2'}),
            ])
        );
    });

    it('Create order', async () => {
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName1', 'LastName1')`);
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName2', 'LastName2')`);
        const weekdaySql = `(CASE CAST(STRFTIME('%w', 'now') AS INTEGER)
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                ELSE 'Saturday' 
            END)`
        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            (SELECT IFNULL(MAX(OrderID), 0) + 1 FROM customer_order),
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName1',
            'LastName1',
            ${weekdaySql}
        )`);
        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            (SELECT IFNULL(MAX(OrderID), 0) + 1 FROM customer_order),
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant2'),
            'FirstName1',
            'LastName1',
            ${weekdaySql}
        )`);
        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            (SELECT IFNULL(MAX(OrderID), 0) + 1 FROM customer_order),
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName2',
            'LastName2',
            ${weekdaySql}
        )`);

        const customer1Order = await db.all(`SELECT * FROM customer_order WHERE FirstName == 'FirstName1' AND LastName == 'LastName1'`);
        const customer2Order = await db.all(`SELECT * FROM customer_order WHERE FirstName == 'FirstName2' AND LastName == 'LastName2'`);

        expect(customer1Order.length).toBe(2);
        expect(customer2Order.length).toBe(1);
    });
    it('Create order when customer not exist', async () => {
        const insert = async () => await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            (SELECT IFNULL(MAX(OrderID), 0) + 1 FROM customer_order),
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName2',
            'LastName2',
            'Monday'
        )`);
        await expect(insert()).rejects.toThrow();
    });

    it('Add item to order', async () => {
        // Orders item1, item2 at restaurant1
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName', 'LastName')`);

        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName',
            'LastName',
            'Monday'
        )`);

        await db.exec(`INSERT INTO order_contains (OrderID, RestaurantID, ItemName) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'Item1'
        )`);
        await db.exec(`INSERT INTO order_contains (OrderID, RestaurantID, ItemName) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'Item2'
        )`);

        const order = await db.all(`SELECT * FROM order_contains WHERE OrderID = 1`);
        expect(order.length).toBe(2);
        expect(order).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'Item1'}),
                expect.objectContaining({ItemName: 'Item2'})
            ])
        );
    });

    it('Add item to order when item not exist', async () => {
        // Orders item1, item2 at restaurant1
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName', 'LastName')`);

        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName',
            'LastName',
            'Monday'
        )`);

        const insert = async () => await db.exec(`INSERT INTO order_contains (OrderID, RestaurantID, ItemName) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant2'),
            'Item1'
        )`);
        await expect(insert()).rejects.toThrow();
    });

    it('Add item to order when restaurant not match', async () => {
        // Orders item1, item2 at restaurant1
        await db.exec(`INSERT INTO customer (FirstName, LastName) VALUES ('FirstName', 'LastName')`);

        await db.exec(`INSERT INTO customer_order (OrderID, RestaurantID, FirstName, LastName, Weekday) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant1'),
            'FirstName',
            'LastName',
            'Monday'
        )`);

        const insert = async () => await db.exec(`INSERT INTO order_contains (OrderID, RestaurantID, ItemName) VALUES (
            1,
            (SELECT RestaurantID FROM restaurant WHERE RestaurantName = 'Restaurant2'),
            'Item1'
        )`);
        await expect(insert()).rejects.toThrow();
    });
});

describe("Server tests", () => {
    let instance;
    let port;

    beforeEach(async () => {
        delete require.cache[require.resolve('../server')];
        const server = require('../server');
        port = process.env.PORT || 8000;
        await setup();
        let started = false;
        instance = server.listen(port, () => started = true);
        
        // wait until server fully starts
        const delay = (time) => new Promise(resolve => setTimeout(resolve, time));
        while (!started) {
            await delay(50);
        }
    });

    afterEach(async () => {
        instance.close();
    })

    it("Add restaurant", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);
    });

    it("Add duplicated restaurants", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(false);
    });

    it("Retrieve restaurants", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant2",
            RestaurantInfo: "description2" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/get/restaurant`);
        expect(res.data.success).toBe(true);
        const restaurants = res.data.data;
        expect(restaurants.length).toBe(2);
        expect(restaurants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({RestaurantName: 'restaurant1', RestaurantInfo: 'description1'}),
                expect.objectContaining({RestaurantName: 'restaurant2', RestaurantInfo: 'description2'}),
            ])
        );
    });

    it("Add menus", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);    
    });

    it("Add duplicated menus to same restaurant", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Add menu to non-existing restuarant", async () => {
        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Retrieve menu", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu2"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/get/menu`, {
            RestaurantName: "restaurant1"
        });
        expect(res.data.success).toBe(true);
        const menus = res.data.data;
        expect(menus.length).toBe(2);
        expect(menus).toEqual(
            expect.arrayContaining([
                expect.objectContaining({MenuName: 'menu1'}),
                expect.objectContaining({MenuName: 'menu2'}),
            ])
        );    
    });

    it("Add menu item", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);
    });

    it("Add menu item to non-existing restaurant", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Add duplicated menu item to the same restaurant", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1"
        });
        expect(res.data.success).toBe(true);
        
        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Add same menu item to the different restaurant", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1"
        });
        expect(res.data.success).toBe(true);
        
        res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant2",
            RestaurantInfo: "description2"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant2"
        });
        expect(res.data.success).toBe(true);
    });

    it("Add item to menu", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item1",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);
    });

    it("Add item to menu when restaurant not match", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant2",
            RestaurantInfo: "description2" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item1",
            "MenuName": "menu1",
            "RestaurantName": "restaurant2"
        });
        expect(res.data.success).toBe(false);
    });

    it("Add duplicate item to menu", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item1",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item1",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Add non-existing item", async () => {
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(false);
    });

    it("Retrive items from a menu", async () => {
        /*
        restaurant1:
            Menu1:
                item1
                item2
            Menu2:

        restaurant2:
            Menu1:
                item2
        */
        let res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant1",
            RestaurantInfo: "description1" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/restaurant/`, {
            RestaurantName: "restaurant2",
            RestaurantInfo: "description2" 
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant1",
            MenuName: "menu2"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu`, {
            RestaurantName: "restaurant2",
            MenuName: "menu1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item1",
            "ItemType": "salad", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item2",
            "ItemType": "dressing", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/item`, {
            "ItemName": "item2",
            "ItemType": "entree", 
            "ItemDescription": "item 1 description", 
            "RestaurantName": "restaurant2"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item1",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item2",
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/add/menu_item`, {
            "ItemName": "item2",
            "MenuName": "menu1",
            "RestaurantName": "restaurant2"
        });
        expect(res.data.success).toBe(true);

        res = await axios.post(`http://127.0.0.1:${port}/get/menu_item`, {
            "MenuName": "menu1",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);
        const restaurant1Menu1Items = res.data.data;
        expect(restaurant1Menu1Items.length).toBe(2);
        expect(restaurant1Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item1'}),
                expect.objectContaining({ItemName: 'item2'}),
            ])
        ); 

        res = await axios.post(`http://127.0.0.1:${port}/get/menu_item`, {
            "MenuName": "menu2",
            "RestaurantName": "restaurant1"
        });
        expect(res.data.success).toBe(true);
        const restaurant1Menu2Items = res.data.data;
        expect(restaurant1Menu2Items.length).toBe(0);

        res = await axios.post(`http://127.0.0.1:${port}/get/menu_item`, {
            "MenuName": "menu1",
            "RestaurantName": "restaurant2"
        });
        expect(res.data.success).toBe(true);
        const restaurant2Menu1Items = res.data.data;
        expect(restaurant2Menu1Items.length).toBe(1);
        expect(restaurant2Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item2'}),
            ])
        ); 
    });
});