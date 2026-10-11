import express from "express";

import {
    createUser,
    getUsers,
    login,
    getUserById,
    updateUser,
    deleteUser,
} from "./auth.controller.js";

import { authorize, protect } from "../../middlewares/auth.middlware.js";

const router = express.Router();

router.post("/", createUser);

router.get("/", getUsers);

router.post("/login", login);

router.get("/:id", getUserById);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;