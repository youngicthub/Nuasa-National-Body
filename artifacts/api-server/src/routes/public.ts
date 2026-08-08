import { Router } from "express";
import { getTableColumns, normalizeDbRow, query, resolveColumn } from "../lib/db";

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
             COALESCE(p.full_name, 'NUASA') AS author_name
      FROM   blog_posts bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN profiles   p ON p.user_id = bp.author_id
      WHERE  bp.status = 'published'
      ORDER  BY bp.published_at DESC
      ${limitClause}
    `);
    res.json(rows.map((raw) => {
      const r = normalizeDbRow("blog_posts", raw);
      return {
        ...r,
        category: r.category_name
          ? { name: r.category_name, slug: r.category_slug }
          : null,
      };
    }));
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
              COALESCE(p.full_name, 'NUASA') AS author_name
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
    const blogColumns = await getTableColumns("blog_posts");
    const viewColumn = blogColumns.has("view_count") ? "view_count" : "views";
    query(`UPDATE blog_posts SET "${viewColumn}" = "${viewColumn}" + 1 WHERE id = ?`, [rows[0].id]).catch(() => {});
    res.json({
      ...normalizeDbRow("blog_posts", rows[0]),
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
    const blogColumns = await getTableColumns("blog_posts");
    const readTimeColumn = blogColumns.has("read_time") ? "read_time" : null;
    const rows = await query<any[]>(
      `SELECT id, title, slug${readTimeColumn ? `, "${readTimeColumn}" AS read_time` : ""}
       FROM blog_posts
       WHERE  status = 'published' AND category_id = ? AND id != ?
       LIMIT  3`,
      [categoryId, req.params.id],
    );
    res.json(rows.map((row) => normalizeDbRow("blog_posts", row)));
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
    const columns = await getTableColumns("events");
    const publishedColumn = resolveColumn("events", "is_published", columns);
    const startColumn = resolveColumn("events", "start_time", columns);
    if (!publishedColumn || !startColumn) throw new Error("Events table is missing publication or date columns");
    const rows = await query<any[]>(
      `SELECT * FROM events WHERE "${publishedColumn}" = true ORDER BY "${startColumn}" DESC`,
    );
    res.json(rows.map((row) => normalizeDbRow("events", row)));
  } catch (err) {
    next(err);
  }
});

// ─── Chapters ─────────────────────────────────────────────────────────────────

router.get("/chapters", async (_req, res, next) => {
  try {
    const rows = await query<any[]>(
      "SELECT * FROM chapters WHERE is_active = true ORDER BY display_order ASC, name ASC",
    );
    res.json(rows.map((row) => normalizeDbRow("chapters", row)));
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
      rows.map((raw) => {
        const r = normalizeDbRow("library_resources", raw);
        return {
        ...r,
        category: r.category_name
          ? { name: r.category_name, slug: r.category_slug }
          : null,
        };
      }),
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
      ...normalizeDbRow("library_resources", rows[0]),
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
    const columns = await getTableColumns("executives");
    const activeColumn = resolveColumn("executives", "is_active", columns);
    const orderColumn = resolveColumn("executives", "sort_order", columns);
    if (!activeColumn || !orderColumn) throw new Error("Executives table is missing status or order columns");
    const rows = await query<any[]>(
      `SELECT * FROM executives
       WHERE "${activeColumn}" = true
       ORDER BY "${orderColumn}" ASC`,
    );
    res.json(rows.map((row) => normalizeDbRow("executives", row)));
  } catch (err) {
    next(err);
  }
});

export default router;
