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
        expect(tables).toContainEqual('restuarant');
        expect(tables).toContainEqual('menu');
        expect(tables).toContainEqual('menu_item');
        expect(tables).toContainEqual('menu_contains');
    });

    it("Insert restuarants", async () => {
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO restuarant (RestuarantID, RestuarantName, RestuarantInfo) VALUES (null, 'Restuarant${i+1}', 'Description${i+1}')`);
        }

        let restuarants = await db.all(`SELECT * from restuarant`);
        expect(restuarants.length).toBe(3);
        expect(restuarants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({RestuarantName: 'Restuarant1'}),
                expect.objectContaining({RestuarantName: 'Restuarant2'}),
                expect.objectContaining({RestuarantName: 'Restuarant3'}),
            ])
        );
    });

    it("Insert menus", async () => {
        /*
        Restuarant1:
            Menu1
            Menu2
            Menu3
        Restuarant2:

        */
        for (let i = 0; i < 2; i++) {
            await db.exec(`INSERT INTO restuarant (RestuarantID, RestuarantName, RestuarantInfo) VALUES (null, 'Restuarant${i+1}', 'Description${i+1}')`);
        }
        const restuarant1 = await db.get(
            `SELECT RestuarantID FROM restuarant WHERE RestuarantName == 'Restuarant1'`
            )
        
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO menu (MenuID, MenuName, RestuarantID) VALUES (null, 'Menu${i+1}', ${restuarant1.RestuarantID})`);
        }

        let restuarant1_menus = await db.all(
            `SELECT * from menu JOIN restuarant on menu.RestuarantID = restuarant.RestuarantID WHERE restuarant.RestuarantName == 'Restuarant1'`
            );
        expect(restuarant1_menus.length).toBe(3);
        expect(restuarant1_menus).toEqual(
            expect.arrayContaining([
                expect.objectContaining({MenuName: 'Menu1'}),
                expect.objectContaining({MenuName: 'Menu2'}),
                expect.objectContaining({MenuName: 'Menu3'}),
            ])
        );

        let restuarant2_menus = await db.all(
            `SELECT * from menu JOIN restuarant on menu.RestuarantID = restuarant.RestuarantID WHERE restuarant.RestuarantName == 'Restuarant2'`
            );
        expect(restuarant2_menus.length).toBe(0);
    });

    it("Insert menu items", async () => {
        for (let i = 0; i < 3; i++) {
            await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('menu item${i+1}')`);
        }

        let restuarants = await db.all(`SELECT * from menu_item`);
        expect(restuarants.length).toBe(3);
        expect(restuarants).toEqual(
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
        Restuarant1:
            Menu1:
                item1
                item2
            Menu2:

        Restuarant2:
            Menu1:
                item2
        */
        await db.exec(`INSERT INTO restuarant (RestuarantID, RestuarantName, RestuarantInfo) VALUES (null, 'Restuarant1', 'Description1')`);
        await db.exec(`INSERT INTO restuarant (RestuarantID, RestuarantName, RestuarantInfo) VALUES (null, 'Restuarant2', 'Description2')`);
        const restuarant1 = await db.get(
            `SELECT RestuarantID FROM restuarant WHERE RestuarantName == 'Restuarant1'`
            )
        const restuarant2 = await db.get(
            `SELECT RestuarantID FROM restuarant WHERE RestuarantName == 'Restuarant2'`
            )

        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestuarantID) VALUES (null, 'Menu1', ${restuarant1.RestuarantID})`);
        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestuarantID) VALUES (null, 'Menu2', ${restuarant1.RestuarantID})`);
        await db.exec(`INSERT INTO menu (MenuID, MenuName, RestuarantID) VALUES (null, 'Menu1', ${restuarant2.RestuarantID})`);
        const restuarant1Menu1 = await db.get(
            `SELECT MenuID from Menu where RestuarantID == ${restuarant1.RestuarantID} and MenuName == 'Menu1'`
            )
        const restuarant1Menu2 = await db.get(
            `SELECT MenuID from Menu where RestuarantID == ${restuarant1.RestuarantID} and MenuName == 'Menu2'`
            )
        const restuarant2Menu1 = await db.get(
            `SELECT MenuID from Menu where RestuarantID == ${restuarant2.RestuarantID} and MenuName == 'Menu1'`
            )

        await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('item1')`);
        await db.exec(`INSERT INTO menu_item (ItemName) VALUES ('item2')`);

        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restuarant1Menu1.MenuID}, 'item1')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restuarant1Menu1.MenuID}, 'item2')`);
        await db.exec(`INSERT INTO menu_contains (MenuID, ItemName) VALUES (${restuarant2Menu1.MenuID}, 'item2')`);
        const restuarant1Menu1Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restuarant1Menu1.MenuID}`
        );
        const restuarant1Menu2Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restuarant1Menu2.MenuID}`
        );
        const restuarant2Menu1Items = await db.all(
            `SELECT ItemName FROM menu_contains WHERE MenuID == ${restuarant2Menu1.MenuID}`
        );

        expect(restuarant1Menu1Items.length).toBe(2);
        expect(restuarant1Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item1'}),
                expect.objectContaining({ItemName: 'item2'})
            ])
        );

        expect(restuarant1Menu2Items.length).toBe(0);

        expect(restuarant2Menu1Items.length).toBe(1);
        expect(restuarant2Menu1Items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ItemName: 'item2'}),
            ])
        );
    })
})