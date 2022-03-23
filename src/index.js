const server = require("./server");
const setup = require("./setup");

const main = async () => {
    const port = process.env.PORT || 8000;
    await setup();
    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
}

main();