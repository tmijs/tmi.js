const express = require("express");
const morgan = require("morgan");

const app = express();

app.use(morgan("short"));

app.get("/", (req, res) => {
    res.send({});
});

app.listen(process.env.TMIJS_API_PORT || 80, () => {
    console.log("Server is up and running!");
});
