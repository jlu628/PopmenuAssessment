const express = require("express");
const router = express.Router();
const controller = require('./controller');

router.post("/add/restaurant", controller.addRestaurant);
router.post("/add/menu", controller.addMenu);
router.post("/add/item", controller.addMenuItem);
router.post("/add/menu_item", controller.addItemToMenu);

router.post("/get/restaurant", controller.getRestaurants);
router.post("/get/menu", controller.getMenu);
router.post("/get/menu_item", controller.getMenuItems);

router.post("/add/customer", controller.addCustomer);
router.post("/get/customer", controller.getCustomer);
router.post("/order", controller.order);
router.post("/get/customer_order", controller.getOrdersByCustomer);
router.post("/get/restaurant_order", controller.getOrdersByRestaurant);
router.post("/predict", controller.predict);

module.exports = router;