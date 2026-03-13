import express from 'express';
import multer from 'multer';
import OSS from 'ali-oss';
import pool from '../db.js';
import { URL } from 'url';

const router = express.Router();

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// 获取 OSS 客户端
const getOssClient = () => {
  const { OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET } = process.env;
  if (!OSS_REGION || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    throw new Error('OSS configuration is missing in .env');
  }
  return new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true,
  });
};

// 获取图片列表
router.get('/', async (req, res) => {
  try {
    const { search, tag, eventId, unlinked } = req.query;
    let query = `
      SELECT 
        i.*,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
            FROM images_tags_map itm
            JOIN tags t ON t.id = itm.tag_id
            WHERE itm.image_id = i.id
          ),
          '[]'
        ) as tags
      FROM images i
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`i.filename ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }

    if (tag) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM images_tags_map itm
          JOIN tags t ON t.id = itm.tag_id
          WHERE itm.image_id = i.id AND t.name = $${params.length + 1}
        )
      `);
      params.push(tag);
    }

    if (eventId) {
      conditions.push(`i.event_id = $${params.length + 1}`);
      params.push(eventId);
    }

    if (unlinked === 'true') {
      conditions.push(`i.event_id IS NULL`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// 重命名图片
router.put('/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const result = await pool.query(
      'UPDATE images SET filename = $1 WHERE id = $2 RETURNING *',
      [filename, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error renaming image:', error);
    res.status(500).json({ error: 'Failed to rename image' });
  }
});

// 获取所有标签
router.get('/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// 创建标签
router.post('/tags', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required' });

    const result = await pool.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING *',
      [name, color]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// 给图片打标签
router.post('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    await pool.query(
      'INSERT INTO images_tags_map (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, tagId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to image:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// 移除图片标签
router.delete('/:id/tags/:tagId', async (req, res) => {
  try {
    const { id, tagId } = req.params;
    await pool.query(
      'DELETE FROM images_tags_map WHERE image_id = $1 AND tag_id = $2',
      [id, tagId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from image:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

// 批量操作
router.post('/batch/delete', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body; // Array of image IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }

    await client.query('BEGIN');

    // Get images to delete from OSS
    const { rows: images } = await client.query('SELECT * FROM images WHERE id = ANY($1)', [ids]);

    const ossClient = getOssClient();
    for (const image of images) {
      try {
        const urlObj = new URL(image.url);
        const objectName = decodeURIComponent(urlObj.pathname.substring(1));
        await ossClient.delete(objectName);
      } catch (e) {
        console.warn(`Failed to delete OSS object for image ${image.id}:`, e);
      }
    }

    // Delete from DB
    await client.query('DELETE FROM images WHERE id = ANY($1)', [ids]);

    await client.query('COMMIT');
    res.json({ success: true, count: images.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error batch deleting images:', error);
    res.status(500).json({ error: 'Failed to batch delete images' });
  } finally {
    client.release();
  }
});

router.post('/batch/tags', async (req, res) => {
  try {
    const { ids, tagId } = req.body;
    if (!ids || !Array.isArray(ids) || !tagId) {
      return res.status(400).json({ error: 'IDs array and tagId are required' });
    }

    const values = ids.map((id, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(',');
    const params = ids.flatMap(id => [id, tagId]);

    await pool.query(
      `INSERT INTO images_tags_map (image_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error batch adding tags:', error);
    res.status(500).json({ error: 'Failed to batch add tags' });
  }
});


// 上传图片
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const client = getOssClient();
    // 生成唯一文件名: timestamp-random-originalname
    const objectName = `images/${Date.now()}-${Math.random().toString(36).substring(7)}-${req.file.originalname}`;
    
    // 上传
    const result = await client.put(objectName, req.file.buffer);
    
    // 阿里云 OSS SDK 返回的 url 有时候是 http 的，强制用 https
    let url = result.url;
    if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }

    // 保存到数据库，支持关联事件
    const { eventId } = req.body;
    const insertResult = await pool.query(
      'INSERT INTO images (url, filename, size, mime_type, event_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [url, req.file.originalname, req.file.size, req.file.mimetype, eventId || null]
    );

    res.json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const queryResult = await pool.query('SELECT * FROM images WHERE id = $1', [id]);
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = queryResult.rows[0];
    
    // 尝试从 URL 解析 objectName
    // 假设 URL 格式: https://bucket.oss-region.aliyuncs.com/images/xxx.jpg
    // pathname 会是 /images/xxx.jpg
    try {
        const urlObj = new URL(image.url);
        // decodeURIComponent 处理文件名中的特殊字符
        const objectName = decodeURIComponent(urlObj.pathname.substring(1));
        
        const client = getOssClient();
        await client.delete(objectName);
    } catch (e) {
        console.warn('Failed to delete from OSS:', e);
        // 继续删除数据库记录
    }

    await pool.query('DELETE FROM images WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// 关联图片到事件（从图片库选择）
router.post('/:id/link-event', async (req, res) => {
  try {
    const { id } = req.params;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    // 检查图片是否存在
    const imageCheck = await pool.query('SELECT * FROM images WHERE id = $1', [id]);
    if (imageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 检查事件是否存在
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // 更新图片关联的事件
    const result = await pool.query(
      'UPDATE images SET event_id = $1 WHERE id = $2 RETURNING *',
      [eventId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error linking image to event:', error);
    res.status(500).json({ error: 'Failed to link image to event' });
  }
});

// 解除图片与事件的关联
router.post('/:id/unlink-event', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE images SET event_id = NULL WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error unlinking image from event:', error);
    res.status(500).json({ error: 'Failed to unlink image from event' });
  }
});

export default router;
