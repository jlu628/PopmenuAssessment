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
    await db.exec(`DROP TABLE IF EXISTS order_contains`);
    await db.exec(`DROP TABLE IF EXISTS customer_order`);
    await db.exec(`DROP TABLE IF EXISTS customer`);

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
        MenuInfo VARCHAR(200),
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

    // Customers model (Level 3 & 4) 
    const customerSchema = `CREATE TABLE IF NOT EXISTS customer (
        FirstName VARCHAR(40),
        LastName VARCHAR(40),

        PRIMARY KEY (FirstName, LastName)
    )`;
    await db.exec(customerSchema);

    // Customers model (Level 3 & 4) 
    const orderSchema = `CREATE TABLE IF NOT EXISTS customer_order (
        OrderID INTEGER NOT NULL,
        RestaurantID INTEGER NOT NULL,
        FirstName VARCHAR(40),
        LastName VARCHAR(40),
        Weekday VARCHAR(10),

        PRIMARY KEY (OrderID, RestaurantID),
        CONSTRAINT weekday_values CHECK(Weekday IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' , 'Sunday')),
        CONSTRAINT fk_customer_order FOREIGN KEY(FirstName, LastName) REFERENCES customer(FirstName, LastName) ON DELETE CASCADE,
        CONSTRAINT fk_restaurant_order FOREIGN KEY(RestaurantID) REFERENCES restaurant(RestaurantID) ON DELETE CASCADE
    )`;
    await db.exec(orderSchema);

    // Order-item relation model (Level 3 & 4)
    const orderContainsScheme = `CREATE TABLE IF NOT EXISTS order_contains (
        OrderID INTEGER NOT NULL,
        ItemName VARCHAR(40) NOT NULL,
        RestaurantID INTEGER NOT NULL,
        Quantity INTEGER DEFAULT 1,

        CONSTRAINT fk_order_item FOREIGN KEY(ItemName, RestaurantID) REFERENCES menu_item(ItemName, RestaurantID) ON DELETE CASCADE,
        CONSTRAINT fk_order_from_restaurant FOREIGN KEY(OrderID, RestaurantID) REFERENCES customer_order(OrderID, RestaurantID) ON DELETE CASCADE
    )`;
    await db.exec(orderContainsScheme);

    await db.close(err => handle(err));
}
module.exports = setup;