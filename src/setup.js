const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite')

const setup = async () => {
    const db = await open({
        filename: path.join(__dirname, './MenuManagement.db'),
        driver: sqlite3.Database
    });
    await db.get("PRAGMA foreign_keys = ON");

    // Drop tables
    await db.exec(`DROP TABLE IF EXISTS menu_contains`);
    await db.exec(`DROP TABLE IF EXISTS menu_item`);
    await db.exec(`DROP TABLE IF EXISTS menu`);
    await db.exec(`DROP TABLE IF EXISTS restaurant`);
    await db.exec(`DROP TABLE IF EXISTS customer`);

    // restaurant model (Level 1 & 2)
    const restaurantSchema = `CREATE TABLE IF NOT EXISTS restaurant (
        RestaurantID INTEGER NOT NULL UNIQUE,
        RestaurantName VARCHAR(40) NOT NULL PRIMARY KEY,
        RestaurantInfo VARCHAR(200)
    )`;
    await db.exec(restaurantSchema);

    // Menu model (Level 1 & 2)
    const menuSchema = `CREATE TABLE IF NOT EXISTS menu (
        MenuID INTEGER NOT NULL UNIQUE,
        MenuName VARCHAR(40) NOT NULL,
        RestaurantID INTEGER NOT NULL,

        CONSTRAINT fk_restaurant_menu FOREIGN KEY(RestaurantID) REFERENCES restaurant(RestaurantID) ON DELETE CASCADE,
        PRIMARY KEY(MenuName, RestaurantID)
    )`;
    await db.exec(menuSchema);

    // Menu item model (Level 1 & 2) 
    const menuItemSchema = `CREATE TABLE IF NOT EXISTS menu_item (
        ItemName VARCHAR(40) NOT NULL,
        RestaurantID INTEGER NOT NULL,
        ItemDescription VARCHAR(200),
        ItemType VARCHAR(40),

        PRIMARY KEY (ItemName, RestaurantID),
        CONSTRAINT fk_restaurant_item FOREIGN KEY(RestaurantID) REFERENCES restaurant(RestaurantID) ON DELETE CASCADE,
        CONSTRAINT menu_item_type_value CHECK (ItemType in ('entree', 'salad', 'dressing', 'appetizer'))
    )`;
    await db.exec(menuItemSchema);

    // Menu-item relation model (Level 1 & 2) 
    const menuContainsSchema = `CREATE TABLE IF NOT EXISTS menu_contains (
        RestaurantID INTEGER NOT NULL,
        MenuID INTEGER NOT NULL,
        ItemName VARCHAR(40) NOT NULL,

        CONSTRAINT fk_contains_menu FOREIGN KEY(MenuID) REFERENCES menu(MenuID) ON DELETE CASCADE,
        CONSTRAINT fk_contains_item FOREIGN KEY(ItemName, RestaurantID) REFERENCES menu_item(ItemName, RestaurantID) ON DELETE CASCADE,
        PRIMARY KEY (MenuID, ItemName)
    )`;
    await db.exec(menuContainsSchema);

    await db.close(err => handle(err));
}
module.exports = setup;