const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite')

const setup = async () => {
    const db = await open({
        filename: path.join(__dirname, './MenuManagement.db'),
        driver: sqlite3.Database
    });
    await db.get("PRAGMA foreign_keys = ON");

    // restaurant model
    const restaurantSchema = `CREATE TABLE IF NOT EXISTS restaurant (
        RestaurantID INTEGER NOT NULL UNIQUE,
        RestaurantName VARCHAR(40) NOT NULL PRIMARY KEY,
        RestaurantInfo VARCHAR(200)
    )`;
    await db.exec(`DROP TABLE IF EXISTS restaurant`);
    await db.exec(restaurantSchema);

    // Menu model
    const menuSchema = `CREATE TABLE IF NOT EXISTS menu (
        MenuID INTEGER NOT NULL UNIQUE,
        MenuName VARCHAR(40) NOT NULL,
        RestaurantID INTEGER,

        CONSTRAINT fk_restaurant_menu FOREIGN KEY(RestaurantID) REFERENCES restaurant(RestaurantID),
        PRIMARY KEY(MenuName, RestaurantID)
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu`);
    await db.exec(menuSchema);

    // Menu item model
    const menuItemSchema = `CREATE TABLE IF NOT EXISTS menu_item (
        ItemName VARCHAR(40) NOT NULL PRIMARY KEY
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu_item`);
    await db.exec(menuItemSchema);

    // Menu-menu item relation model
    const menuContainsSchema = `CREATE TABLE IF NOT EXISTS menu_contains (
        MenuID INTEGER NOT NULL,
        ItemName VARCHAR(40) NOT NULL,

        CONSTRAINT fk_contains_menu FOREIGN KEY(MenuID) REFERENCES menu(MenuID),
        CONSTRAINT fk_contains_item FOREIGN KEY(ItemName) REFERENCES menu_item(ItemName),
        PRIMARY KEY (MenuID, ItemName)
    )`;
    await db.exec(`DROP TABLE IF EXISTS menu_contains`);
    await db.exec(menuContainsSchema);

    await db.close(err => handle(err));
}
module.exports = setup;