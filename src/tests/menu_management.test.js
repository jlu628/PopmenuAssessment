const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite')
const setup = require('../setup')

// Level 1 & 2 tests
describe("Level 1 & 2", ()=>{
    let db;
    beforeEach(async () => {
        await setup();
        db = await open({
            filename: path.join(__dirname, '../MenuManagement.db'),
            driver: sqlite3.Database
        });
    });
    afterEach(async () => {
        await db.close();
    });

    it("Database setup", async () => {
        let tables = await db.all("select name from sqlite_master where type='table'");
        tables = tables.map(table=>table.name);
        expect(tables.length).toBe(4);
        expect(tables).toContainEqual('restaurant');
        expect(tables).toContainEqual('menu');
        expect(tables).toContainEqual('menu_item');
        expect(tables).toContainEqual('menu_contains');
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
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('menu item${i+1}')`);
        }

        let restaurants = await db.all(`SELECT * from menu_item`);
        expect(restaurants.length).toBe(3);
        expect(restaurants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'menu item1'}),
                expect.objectContaining({ItemName: 'menu item2'}),
                expect.objectContaining({ItemName: 'menu item3'}),
            ])
        );
    });

    it("Insert duplicated menu items", async () => {
        await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('menu item')`);
        try {
            await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('menu item)`);
            expect(false).toBe(true);
        } catch (err) {
            expect(err).toBeTruthy();
        }
    });

    it("Integration test", async () => {
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

        await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('item1')`);
        await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('item2')`);

        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restaurant1Menu1.MenuID}, 'item1')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restaurant1Menu1.MenuID}, 'item2')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restaurant2Menu1.MenuID}, 'item2')`);
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
    })
})