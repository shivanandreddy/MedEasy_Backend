import express from "express";

import {
    createUser,
    login,
   
   
} from "./auth.controller.js";

import { authorize, protect } from "../../middlewares/auth.middlware.js";

const router = express.Router();

router.post("/", createUser);



router.post("/login", login);

// router.get("/:id", getUserById);

// router.put("/:id", updateUser);


export default router;