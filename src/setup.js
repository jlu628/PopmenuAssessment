const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite')

const setup = async () => {
    // Error handling. Console log the error message if occurs
    const handle = (err) => {
        if (err) {
            console.log(err);
        }
    }
    // const db = new sqlite3.Database('./MenuManagement.db', sqlite3.Open_READWRITE, err => handle(err));
    const db = await open({
        filename: path.join(__dirname, './MenuManagement.db'),
        driver: sqlite3.Database
    });
    
    // Restuarant model
    const restuarantScheme = `CREATE TABLE IF NOT EXISTS restuarant (
        RestuarantID INTEGER NOT NULL PRIMARY KEY,
        RestuarantName VARCHAR(40) NOT NULL,
        RestuarantInfo VARCHAR(200)
    )`;
    await db.exec(`DROP TABLE IF EXISTS restuarant`);
    await db.exec(restuarantScheme);

    // Menu model
    const menuScheme = `CREATE TABLE IF NOT EXISTS menu (
        MenuID INTEGER NOT NULL PRIMARY KEY,
        MenuName VARCHAR(40) NOT NULL,
        RestuarantID INTEGER,

        FOREIGN KEY(RestuarantID) REFERENCES restuarant(RestuarantID)
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu`);
    await db.exec(menuScheme);

    // Menu item model
    const menuItemScheme = `CREATE TABLE IF NOT EXISTS menu_item (
        ItemName VARCHAR(40) NOT NULL PRIMARY KEY
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu_item`);
    await db.exec(menuItemScheme);

    // Menu-menu item relation model
    const menuContainsScheme = `CREATE TABLE IF NOT EXISTS menu_contains (
        MenuID INTEGER NOT NULL,
        ItemName VARCHAR(40) NOT NULL,

        FOREIGN KEY(MenuID) REFERENCES menu(MenuID),
        FOREIGN KEY(ItemName) REFERENCES menu_item(ItemName),
        PRIMARY KEY (MenuID, ItemName)
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu_contains`);
    await db.exec(menuContainsScheme);

    await db.close(err => handle(err));
}
setup()
module.exports = setup;