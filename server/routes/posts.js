// server/routes/posts.js
import express from 'express';
import { getPosts, getPost, addPost, deletePost, updatePost, addReply, getPostStats } from '../controllers/post.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get("/", getPosts);
router.get("/stats", getPostStats);
router.get("/:id", getPost);
router.post("/", authenticateToken, addPost);
router.post("/:id/replies", authenticateToken, addReply);
router.delete("/:id", authenticateToken, deletePost);
router.put("/:id", authenticateToken, updatePost);

export default router;