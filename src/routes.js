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

module.exports = router;
