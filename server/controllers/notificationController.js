const { query } = require('../config/db');

/**
 * Get user notifications
 */
async function getNotifications(req, res) {
  try {
    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 30`,
      [req.user.id]
    );

    const [unread] = await query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      success: true,
      unreadCount: unread[0].unread_count,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    res.json({ success: true, message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
  try {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
