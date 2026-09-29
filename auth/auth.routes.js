import express from "express";
import { register, login, getAllUsers } from "./auth.controller.js";

const router = express.Router();

router.post("/", login);
router.get("/",getAllUsers );
router.post("/register", register);


export default router;