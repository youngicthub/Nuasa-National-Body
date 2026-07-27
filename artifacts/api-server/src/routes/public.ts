import { Router } from "express";
import { query } from "@workspace/db";

const router = Router();

// ─── Blog Posts ───────────────────────────────────────────────────────────────

router.get("/posts", async (req, res, next) => {
  try {
    const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 0;
    const limitClause = limit ? ` LIMIT ${limit}` : "";
    const rows = await query<any[]>(`
      SELECT bp.*,
             c.name  AS category_name,
             c.slug  AS category_slug,
             COALESCE(p.full_name, 'Admin') AS author_name
      FROM   blog_posts bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN profiles   p ON p.user_id = bp.author_id
      WHERE  bp.status = 'published'
      ORDER  BY bp.published_at DESC
      ${limitClause}
    `);
    res.json(rows.map((r) => ({
        ...r,
        category: r.category_name
          ? { name: r.category_name, slug: r.category_slug }
          : null,
      })));
  } catch (err) {
    next(err);
  }
});

router.get("/posts/:slug", async (req, res, next) => {
  try {
      const rows = await query<any[]>(
      `SELECT bp.*,
              c.name  AS category_name,
              c.slug  AS category_slug,
              COALESCE(p.full_name, 'Admin') AS author_name
       FROM   blog_posts bp
       LEFT JOIN categories c ON c.id = bp.category_id
       LEFT JOIN profiles   p ON p.user_id = bp.author_id
        WHERE  bp.slug = ? AND bp.status = 'published'`,
       [req.params.slug],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Increment view count (fire-and-forget)
    query("UPDATE blog_posts SET views = views + 1 WHERE id = ?", [rows[0].id]).catch(() => {});
    res.json({
      ...rows[0],
      category: rows[0].category_name
        ? { name: rows[0].category_name, slug: rows[0].category_slug }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/posts/:id/tags", async (req, res, next) => {
  try {
    const rows = await query<any[]>(
      `SELECT t.* FROM tags t
       JOIN   blog_post_tags bpt ON bpt.tag_id = t.id
       WHERE  bpt.post_id = ?`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/posts/:id/related", async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    if (!categoryId) {
      res.json([]);
      return;
    }
    const rows = await query<any[]>(
      `SELECT id, title, slug, read_time FROM blog_posts
       WHERE  status = 'published' AND category_id = ? AND id != ?
       LIMIT  3`,
      [categoryId, req.params.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── Categories ───────────────────────────────────────────────────────────────

router.get("/categories", async (req, res, next) => {
  try {
    const { type } = req.query;
    // Use a separate `sql` variable to avoid shadowing the imported `query` fn
    let sql = "SELECT * FROM categories";
    if (type === "blog") {
      sql += " WHERE type IN ('blog', 'both')";
    } else if (type === "library") {
      sql += " WHERE type IN ('library', 'both')";
    }
    sql += " ORDER BY name";
    const rows = await query<any[]>(sql);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

router.get("/tags", async (_req, res, next) => {
  try {
    const rows = await query<any[]>("SELECT * FROM tags ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

router.get("/events", async (_req, res, next) => {
  try {
    const rows = await query<any[]>(
      "SELECT * FROM events WHERE is_published = 1 ORDER BY start_time DESC",
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── Chapters ─────────────────────────────────────────────────────────────────

router.get("/chapters", async (_req, res, next) => {
  try {
    const rows = await query<any[]>(
      "SELECT * FROM chapters WHERE is_active = 1 ORDER BY display_order ASC, name ASC",
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── Library Resources ────────────────────────────────────────────────────────

router.get("/resources", async (_req, res, next) => {
  try {
    const rows = await query<any[]>(`
      SELECT lr.*,
             c.name AS category_name,
             c.slug AS category_slug
      FROM   library_resources lr
      LEFT JOIN categories c ON c.id = lr.category_id
      ORDER  BY lr.created_at DESC
    `);
    res.json(
      rows.map((r) => ({
        ...r,
        category: r.category_name
          ? { name: r.category_name, slug: r.category_slug }
          : null,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/resources/:id", async (req, res, next) => {
  try {
    const rows = await query<any[]>(
      `SELECT lr.*, c.name AS category_name, c.slug AS category_slug
       FROM   library_resources lr
       LEFT JOIN categories c ON c.id = lr.category_id
        WHERE  lr.id = ?`,
      [req.params.id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      ...rows[0],
      category: rows[0].category_name
        ? { name: rows[0].category_name, slug: rows[0].category_slug }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/resources/:id/download", async (req, res, next) => {
  try {
    await query(
      "UPDATE library_resources SET download_count = download_count + 1 WHERE id = ?",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Executives ───────────────────────────────────────────────────────────────

router.get("/executives", async (_req, res, next) => {
  try {
    const rows = await query<any[]>(
      "SELECT * FROM executives WHERE is_active = 1 ORDER BY sort_order ASC",
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
