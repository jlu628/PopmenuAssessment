const express = require("express");
const app = express();
const routes = require("./routes");
const setup = require("./setup");

const port = process.env.PORT || 8000;

app.use(express.json());
app.use("/", routes);

const main = async () => {
    await setup();
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
}

main();