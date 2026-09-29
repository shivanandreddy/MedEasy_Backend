import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
    res.send("Hello from auth routes");
});

router.get("/", (req, res) => {
    res.send("Hello from auth test");
});

export default router;