const express = require("express");
const router = express.Router();
const controller = require('./controller');

router.post("/add/restaurant", controller.addRestaurant);
router.post("/add/:RestaurantName/menu", controller.addMenu);
router.post("/add/item", controller.addMenuItem);
router.post("/add/:RestaurantName/:MenuName/item", controller.addItemToMenu);

router.post("/get/restaurant", controller.getRestaurants);
router.post("/get/:RestaurantName/menu", controller.getMenu);
router.post("/get/:RestaurantName/:MenuName/item", controller.getMenuItems);

module.exports = router;
